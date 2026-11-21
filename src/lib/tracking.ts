import { addDays, addWeeks, differenceInCalendarDays, format } from 'date-fns'
import { fromKey, startOfWeekMonday, toKey } from './dates'

export const categories = {
  health: 'Health',
  focus: 'Focus',
  mindset: 'Mindset',
  fitness: 'Fitness',
  custom: 'Custom',
}

export const colors = {
  iris: '#8b76af',
  aqua: '#47878f',
  mint: '#548361',
  amber: '#a96931',
  rose: '#b46778',
}

export const weekdays = [
  { value: 1, label: 'Mon' }, { value: 2, label: 'Tue' }, { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' }, { value: 5, label: 'Fri' }, { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
]

export type Category = keyof typeof categories
export type Accent = keyof typeof colors
export type Schedule = 'daily' | 'weekdays' | 'weekly'

export interface HabitInput {
  name: string
  icon: string
  color: Accent
  category: Category
  customCategory: string | null
  schedule: Schedule
  weekdays: number[]
  weeklyTarget: number
  kind: 'binary' | 'numeric'
  goal: number
  unit: string
}

export type HabitDetails = Pick<HabitInput, 'name' | 'icon' | 'color' | 'category' | 'customCategory'>

export interface TrackedHabit extends HabitInput {
  id: string
  createdOn: string
  archived: boolean
  archived_at?: string
  archivePeriods?: ArchivePeriod[]
}

export interface ArchivePeriod {
  start: string | null
  end: string | null
}

const emptyArchive: readonly ArchivePeriod[] = []

export function archiveHistory(habit: TrackedHabit): readonly ArchivePeriod[] {
  if (habit.archivePeriods?.length) return habit.archivePeriods
  return habit.archived ? [{ start: habit.archived_at?.slice(0, 10) ?? null, end: null }] : emptyArchive
}

export function changeArchive(habit: TrackedHabit, archived: boolean, day: string): ArchivePeriod[] {
  const periods = [...archiveHistory(habit)]
  const last = periods.at(-1)
  if (archived === habit.archived) return periods

  if (archived) {
    if (last?.end && day <= last.end) periods[periods.length - 1] = { ...last, end: null }
    else periods.push({ start: day, end: null })
  } else if (last && !last.end) {
    if (last.start && day <= last.start) periods.pop()
    else periods[periods.length - 1] = { ...last, end: day }
  }
  return periods
}

export function isActiveOn(habit: TrackedHabit, key: string) {
  return key >= habit.createdOn && !archiveHistory(habit).some(({ start, end }) =>
    (!start || key >= start) && (!end || key < end))
}

export interface HabitLog {
  value: number
  frozen: boolean
  note?: string | null
  mood?: Mood | null
}

export const moods = { energized: 'Energized', steady: 'Steady', low: 'Low energy' }
export type Mood = keyof typeof moods

export type HabitLogs = Record<string, HabitLog>

export interface Journal {
  habits: TrackedHabit[]
  logs: Record<string, HabitLogs>
  affirmations: Record<string, string>
}

export function categoryLabel(habit: HabitInput) {
  return habit.customCategory ?? categories[habit.category]
}

export function scheduleLabel(habit: HabitInput) {
  if (habit.schedule === 'weekly') return `${habit.weeklyTarget}× per week`
  if (habit.schedule === 'daily') return 'Every day'
  return weekdays.filter(({ value }) => habit.weekdays.includes(value)).map(({ label }) => label).join(' · ')
}

export function isComplete(habit: HabitInput, log?: HabitLog) {
  return !!log && !log.frozen && log.value >= habit.goal
}

export function updateProgress(log: HabitLog | undefined, value: number): HabitLog | null {
  return value || log?.note || log?.mood ? { ...log, value, frozen: false } : null
}

export function focusQueue(habits: TrackedHabit[], journal: Journal, today: Date) {
  const key = toKey(today)
  const week = startOfWeekMonday(today)
  const daysRemaining = 7 - differenceInCalendarDays(today, week)
  return habits.map((habit) => {
    const logs = journal.logs[habit.id] ?? {}
    const log = logs[key]
    if (log?.frozen) return { habit, score: 4 }
    if (isComplete(habit, log)) return { habit, score: 3 }
    if (log?.value) return { habit, score: 0 }
    if (habit.schedule === 'weekly') {
      const { target, done } = weekProgress(habit, logs, week, key)
      if (target - done >= daysRemaining) return { habit, score: 1 }
    }
    return { habit, score: 2 }
  }).sort((first, second) => first.score - second.score).map(({ habit }) => habit)
}

export function isScheduled(habit: TrackedHabit, date: Date, key = toKey(date)) {
  if (habit.schedule === 'weekly' || !isActiveOn(habit, key)) return false
  return habit.schedule === 'daily' || habit.weekdays.includes(date.getDay())
}

export function weekProgress(habit: TrackedHabit, logs: HabitLogs, week: Date, through: string) {
  const nextWeek = addWeeks(week, 1)
  const firstDay = habit.createdOn > toKey(week) ? fromKey(habit.createdOn) : week
  let activeDays = 0
  let done = 0
  let frozen = 0

  for (let date = firstDay; date < nextWeek; date = addDays(date, 1)) {
    const key = toKey(date)
    if (!isActiveOn(habit, key)) continue
    activeDays++
    if (key > through) continue
    const log = logs[key]
    if (isComplete(habit, log)) done++
    if (log?.frozen) frozen++
  }
  return { target: Math.min(habit.weeklyTarget, activeDays), done, frozen }
}

export function isOnToday(habit: TrackedHabit, logs: HabitLogs, today: Date) {
  const key = toKey(today)
  if (!isActiveOn(habit, key)) return false
  if (habit.schedule !== 'weekly') return isScheduled(habit, today, key)
  const { done, target } = weekProgress(habit, logs, startOfWeekMonday(today), key)
  return !!logs[key] || done < target
}

export function dayEntries(journal: Journal, date: Date, today: Date) {
  const key = toKey(date)
  if (key > toKey(today)) return []
  return journal.habits.flatMap((habit) => {
    const log = journal.logs[habit.id]?.[key]
    const scheduled = isScheduled(habit, date, key)
    const openWeekly = habit.schedule === 'weekly' && isActiveOn(habit, key)
    if (!log && !scheduled && !openWeekly) return []
    const done = isComplete(habit, log)
    return [{ habit, log, done, scheduled, unfinished: scheduled && !done && !log?.frozen }]
  })
}

export function dayCounts(journal: Journal, date: Date, today: Date) {
  const entries = dayEntries(journal, date, today)
  return {
    done: entries.filter((entry) => entry.done).length,
    unfinished: entries.filter((entry) => entry.unfinished).length,
    frozen: entries.filter((entry) => entry.log?.frozen).length,
  }
}

export function habitStats(habit: TrackedHabit, logs: HabitLogs, today: Date) {
  const todayKey = toKey(today)
  const total = Object.entries(logs).filter(([key, log]) => key <= todayKey && isComplete(habit, log)).length
  let current = 0
  let best = 0
  let completed = 0
  let opportunities = 0

  function record(result: 'complete' | 'missed') {
    if (result === 'complete') {
      current++
      best = Math.max(best, current)
    }
    if (result === 'missed') current = 0
  }

  const start = fromKey(habit.createdOn)
  if (habit.schedule === 'weekly' && start <= today) {
    const activeWeek = startOfWeekMonday(today)
    for (let week = startOfWeekMonday(start); week <= activeWeek; week = addWeeks(week, 1)) {
      const { target, done, frozen } = weekProgress(habit, logs, week, todayKey)
      if (!target) continue
      opportunities += target
      completed += Math.min(target, done)
      if (done >= target || (week < activeWeek && done > 0 && done + frozen >= target)) {
        record('complete')
      } else if (week < activeWeek && frozen < target) {
        record('missed')
      }
    }
  } else {
    for (let date = start; date <= today; date = addDays(date, 1)) {
      const key = toKey(date)
      if (!isScheduled(habit, date, key)) continue
      const log = logs[key]
      opportunities++
      if (isComplete(habit, log)) {
        completed++
        record('complete')
      } else if (!log?.frozen && key !== todayKey) {
        record('missed')
      }
    }
  }
  return { current, best, total, completed, opportunities, rate: completionRate(completed, opportunities) }
}

export function completionRate(completed: number, opportunities: number) {
  return opportunities ? Math.round(100 * completed / opportunities) : 0
}

export function formatDay(date: Date) {
  return format(date, 'EEEE, MMMM d, yyyy')
}

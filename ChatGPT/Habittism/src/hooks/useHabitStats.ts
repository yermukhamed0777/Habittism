import { useMemo } from 'react'
import { useHabitStore } from '../store/useHabitStore'
import { scheduleForHabit } from '../data/seed'
import type { DayStat, Habit } from '../types'
import { COLOR_HEX } from '../types'
import { buildCalendarWeeks, getSessionToday, toKey } from '../lib/dates'

export interface HabitStats {
  habit: Habit
  /** Weekdays (0 = Sunday) the habit is due. */
  schedule: number[]
  completedDays: Set<string>
  currentStreak: number
  bestStreak: number
  thisWeek: number
  dueThisWeek: number
  completionRate: number
  totalCompletions: number
}

/**
 * Streaks are measured across *scheduled* days only.
 * A Mon/Wed/Fri habit therefore isn't "broken" by Tuesday — it only breaks
 * when a scheduled session is actually missed.
 *
 * Future days are ignored, and today is forgiven if it is still in progress.
 */
function streakAcrossScheduled(
  orderedDays: Date[],
  isDone: (key: string) => boolean,
  isDue: (date: Date) => boolean,
  todayKey: string,
): number {
  // Most recent scheduled day first, excluding days that haven't happened yet.
  const scheduled = orderedDays
    .filter((d) => toKey(d) <= todayKey && isDue(d))
    .reverse()

  let streak = 0
  for (let i = 0; i < scheduled.length; i += 1) {
    const key = toKey(scheduled[i])
    if (isDone(key)) {
      streak += 1
      continue
    }
    // Today is still in progress — don't punish an unfinished day.
    if (i === 0 && key === todayKey) continue
    break
  }

  return streak
}

function longestAcrossScheduled(
  orderedDays: Date[],
  isDone: (key: string) => boolean,
  isDue: (date: Date) => boolean,
): number {
  let best = 0
  let run = 0
  for (const date of orderedDays) {
    if (!isDue(date)) continue
    if (isDone(toKey(date))) {
      run += 1
      if (run > best) best = run
    } else {
      run = 0
    }
  }
  return best
}

export function useHabitStats(): HabitStats[] {
  const habits = useHabitStore((s) => s.habits)
  const completions = useHabitStore((s) => s.completions)

  return useMemo(() => {
    const today = getSessionToday()
    const todayKey = toKey(today)
    const weeks = buildCalendarWeeks(53, today)
    const allDays = weeks.flat()

    return habits.map((habit) => {
      const schedule = scheduleForHabit(habit)
      const dueSet = new Set(schedule)
      const isDue = (date: Date) => toKey(date) >= habit.createdAt && dueSet.has(date.getDay())
      const completedDays = new Set(completions[habit.id] ?? [])

      const currentStreak = streakAcrossScheduled(
        allDays,
        (k) => completedDays.has(k),
        isDue,
        todayKey,
      )
      const bestStreak = longestAcrossScheduled(
        allDays,
        (k) => completedDays.has(k),
        isDue,
      )

      // Current week (Monday-first), counting only scheduled days that have
      // actually happened — future days shouldn't read as "missed".
      const currentWeek = weeks[weeks.length - 1]
      const elapsedWeek = currentWeek.filter((d) => d <= today)
      const dueThisWeek = elapsedWeek.filter(isDue).length
      const thisWeek = elapsedWeek.filter((d) => completedDays.has(toKey(d))).length

      // Consistency = completions over *scheduled opportunities*.
      const opportunities = allDays.filter((day) => day <= today && isDue(day)).length
      const completionRate = opportunities ? (allDays.filter((day) => isDue(day) && completedDays.has(toKey(day))).length / opportunities) * 100 : 0

      return {
        habit,
        schedule,
        completedDays,
        currentStreak,
        bestStreak,
        thisWeek,
        dueThisWeek,
        completionRate: Math.min(100, completionRate),
        totalCompletions: completedDays.size,
      }
    })
  }, [habits, completions])
}

export interface Overview {
  totalCompletions: number
  activeDays: number
  /** Strongest streak currently running across all habits. */
  currentStreak: number
  bestStreak: number
  completionRate: number
  perfectDays: number
  scheduledOpportunities: number
}

export function useOverview(): Overview {
  const habits = useHabitStore((s) => s.habits)
  const completions = useHabitStore((s) => s.completions)

  return useMemo(() => {
    const today = getSessionToday()
    const weeks = buildCalendarWeeks(53, today)
    const allDays = weeks.flat()

    const perDay = new Map<string, number>()
    const scheduledDone = new Map<string, number>()
    const duePerDay = new Map<string, number>()
    let totalCompletions = 0
    let scheduledOpportunities = 0

    for (const habit of habits) {
      const schedule = new Set(scheduleForHabit(habit))
      const days = completions[habit.id] ?? []
      totalCompletions += days.length

      for (const day of allDays) {
        if (day > today) continue
        if (toKey(day) < habit.createdAt || !schedule.has(day.getDay())) continue
        scheduledOpportunities += 1
        const key = toKey(day)
        if (days.includes(key)) scheduledDone.set(key, (scheduledDone.get(key) ?? 0) + 1)
        duePerDay.set(key, (duePerDay.get(key) ?? 0) + 1)
      }

      for (const key of days) {
        perDay.set(key, (perDay.get(key) ?? 0) + 1)
      }
    }

    const activeDays = [...perDay.values()].filter((c) => c > 0).length

    // A "perfect day" is one where every scheduled habit was completed.
    let perfectDays = 0
    for (const [key, due] of duePerDay) {
      if ((scheduledDone.get(key) ?? 0) >= due) perfectDays += 1
    }

    const completionRate = scheduledOpportunities
      ? ([...scheduledDone.values()].reduce((sum, n) => sum + n, 0) / scheduledOpportunities) * 100
      : 0

    // Strongest running streak across all habits.
    let currentStreak = 0
    let bestStreak = 0
    const todayKey = toKey(today)
    for (const habit of habits) {
      const schedule = new Set(scheduleForHabit(habit))
      const done = new Set(completions[habit.id] ?? [])
      const isDue = (d: Date) => toKey(d) >= habit.createdAt && schedule.has(d.getDay())
      const cur = streakAcrossScheduled(allDays, (k) => done.has(k), isDue, todayKey)
      const best = longestAcrossScheduled(allDays, (k) => done.has(k), isDue)
      if (cur > currentStreak) currentStreak = cur
      if (best > bestStreak) bestStreak = best
    }

    return {
      totalCompletions,
      activeDays,
      currentStreak,
      bestStreak,
      completionRate,
      perfectDays,
      scheduledOpportunities,
    }
  }, [habits, completions])
}

/**
 * Per-day breakdown of every habit: whether it was scheduled, and whether it
 * was completed. Used by the calendar tooltip and the day-detail modal.
 */
export interface DayHabitEntry {
  id: string
  name: string
  color: string
  due: boolean
  done: boolean
}

export function entriesForDate(date: Date, habits: Habit[], completions: Record<string, string[]>): DayHabitEntry[] {
  const key = toKey(date)
  return habits.flatMap((habit) => {
    const due = key >= habit.createdAt && scheduleForHabit(habit).includes(date.getDay())
    const done = completions[habit.id]?.includes(key) ?? false
    return due || done ? [{ id: habit.id, name: habit.name, color: COLOR_HEX[habit.color], due, done }] : []
  })
}

export function useDayStats(anchor = getSessionToday()): DayStat[] {
  const habits = useHabitStore((s) => s.habits)
  const completions = useHabitStore((s) => s.completions)
  return useMemo(() => buildCalendarWeeks(53, anchor).flat().map((date) => {
    const entries = entriesForDate(date, habits, completions)
    return { key: toKey(date), date, count: entries.filter((e) => e.done).length, total: entries.length }
  }), [anchor, habits, completions])
}

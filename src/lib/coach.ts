import { addDays } from 'date-fns'
import { startOfWeekMonday, toKey } from './dates'
import { completionRate, habitStats, isComplete, isScheduled, weekProgress, type Journal } from './tracking'

export interface WeeklySummary {
  habitsCount: number
  completedCount: number
  plannedCount: number
  rate: number
  topHabit: string | null
  needsFocusHabit: string | null
  observation: string
  adjustment: string
}

export interface SanitizedCoachStats {
  habitsCount: number
  completedCount: number
  plannedCount: number
  rate: number
  topCategory: string
}

export function buildWeeklySummary(journal: Journal, today: Date): WeeklySummary {
  const start = startOfWeekMonday(today)
  const todayKey = toKey(today)
  const activeHabits = journal.habits.filter((h) => !h.archived)

  if (!activeHabits.length) {
    return {
      habitsCount: 0,
      completedCount: 0,
      plannedCount: 0,
      rate: 0,
      topHabit: null,
      needsFocusHabit: null,
      observation: 'No active habits found. Create a habit or pick a starter pack to begin tracking.',
      adjustment: 'Start with one simple, high-reward habit you can easily complete tomorrow.',
    }
  }

  let completedCount = 0
  let plannedCount = 0

  for (let index = 0; index < 7; index++) {
    const date = addDays(start, index)
    const key = toKey(date)
    if (key > todayKey) continue

    for (const habit of activeHabits) {
      if (habit.schedule === 'weekly') continue
      if (isScheduled(habit, date, key)) {
        plannedCount++
        if (isComplete(habit, journal.logs[habit.id]?.[key])) {
          completedCount++
        }
      }
    }
  }

  for (const habit of activeHabits) {
    if (habit.schedule === 'weekly') {
      const { done, target } = weekProgress(habit, journal.logs[habit.id] ?? {}, start, todayKey)
      plannedCount += target
      completedCount += Math.min(done, target)
    }
  }

  const rate = completionRate(completedCount, plannedCount)

  const ranked = activeHabits.map((habit) => {
    const stats = habitStats(habit, journal.logs[habit.id] ?? {}, today)
    return { habit, stats }
  })

  ranked.sort((a, b) => b.stats.rate - a.stats.rate || b.stats.current - a.stats.current)

  const topHabit = ranked[0]?.habit.name ?? null
  const lowest = ranked.find((r) => r.stats.rate < 70) ?? ranked[ranked.length - 1]
  const needsFocusHabit = lowest && lowest !== ranked[0] ? lowest.habit.name : null

  let observation = ''
  let adjustment = ''

  if (rate >= 80) {
    observation = `Strong momentum this week with ${rate}% completion across ${activeHabits.length} habits${topHabit ? `, anchored by ${topHabit}` : ''}.`
    adjustment = 'Protect this baseline. Focus on recovery and ease rather than adding more commitments next week.'
  } else if (rate >= 50) {
    observation = `Steady progress at ${rate}% completion this week (${completedCount} of ${plannedCount} planned goals reached).`
    adjustment = needsFocusHabit
      ? `Pair ${needsFocusHabit} directly after an established daily routine to make starting effortless.`
      : 'Focus on your highest-impact habit first each morning before other demands arise.'
  } else if (plannedCount > 0) {
    observation = `You completed ${completedCount} of ${plannedCount} planned goals (${rate}%) this week.`
    adjustment = 'Simplify your schedule: pick exactly one keystone habit to prioritize each day next week.'
  } else {
    observation = `Your ${activeHabits.length} habits are ready for tracking.`
    adjustment = 'Log your first check-in today to establish early momentum.'
  }

  return {
    habitsCount: activeHabits.length,
    completedCount,
    plannedCount,
    rate,
    topHabit,
    needsFocusHabit,
    observation,
    adjustment,
  }
}

export function getSanitizedCoachStats(journal: Journal, today: Date): SanitizedCoachStats {
  const summary = buildWeeklySummary(journal, today)
  const activeHabits = journal.habits.filter((h) => !h.archived)
  const categories = activeHabits.map((h) => h.category)
  const topCategory = categories[0] ?? 'general'

  return {
    habitsCount: summary.habitsCount,
    completedCount: summary.completedCount,
    plannedCount: summary.plannedCount,
    rate: summary.rate,
    topCategory,
  }
}

import { addDays, addMonths, addWeeks, format, startOfMonth, subMonths, subWeeks } from 'date-fns'
import { startOfWeekMonday, toKey } from './dates'
import { completionRate, isComplete, isScheduled, weekProgress, type Journal } from './tracking'

export type Period = 'week' | 'month'

export function completionTrend(journal: Journal, today: Date, period: Period) {
  const todayKey = toKey(today)
  const weekly = period === 'week'
  const first = weekly ? subWeeks(startOfWeekMonday(today), 7) : subMonths(startOfMonth(today), 5)
  const buckets = Array.from({ length: weekly ? 8 : 6 }, (_, index) => {
    const start = weekly ? addWeeks(first, index) : addMonths(first, index)
    return { key: toKey(start), label: format(start, weekly ? 'MMM d' : 'MMM'), complete: 0, planned: 0 }
  })
  const byStart = new Map(buckets.map((bucket) => [bucket.key, bucket]))
  const bucketFor = (date: Date) => byStart.get(toKey(weekly ? startOfWeekMonday(date) : startOfMonth(date)))

  for (const habit of journal.habits) {
    if (habit.archived) continue
    const logs = journal.logs[habit.id] ?? {}
    if (habit.schedule === 'weekly') {
      for (let week = startOfWeekMonday(first); week <= today; week = addWeeks(week, 1)) {
        const end = addDays(week, 6)
        const bucket = bucketFor(end > today ? today : end)
        if (!bucket) continue
        const { done, target } = weekProgress(habit, logs, week, todayKey)
        bucket.planned += target
        bucket.complete += Math.min(done, target)
      }
    } else {
      for (let date = first; date <= today; date = addDays(date, 1)) {
        const key = toKey(date)
        if (!isScheduled(habit, date, key)) continue
        const bucket = bucketFor(date)!
        bucket.planned++
        if (isComplete(habit, logs[key])) bucket.complete++
      }
    }
  }

  return buckets.map((bucket) => ({ ...bucket, rate: completionRate(bucket.complete, bucket.planned) }))
}

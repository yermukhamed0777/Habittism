import {
  addDays,
  differenceInCalendarDays,
  format,
  startOfDay,
  startOfWeek,
} from 'date-fns'

/** Monday-first start of week (matches GitHub contribution graph). */
export function startOfWeekMonday(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 })
}

/** Build a contiguous Monday-first grid of days covering `weekCount` weeks back from today. */
export function buildCalendarWeeks(weekCount: number, today: Date): Date[][] {
  const currentWeekStart = startOfWeekMonday(today)
  const firstWeekStart = addDays(currentWeekStart, -7 * (weekCount - 1))
  const lastWeekStart = currentWeekStart
  const gridEnd = addDays(lastWeekStart, 6)

  const weeks: Date[][] = []
  for (let w = 0; w < weekCount; w += 1) {
    const weekStart = addDays(firstWeekStart, 7 * w)
    const days: Date[] = []
    for (let d = 0; d < 7; d += 1) {
      const day = addDays(weekStart, d)
      // Only render days up to the end of the last week.
      if (differenceInCalendarDays(day, gridEnd) > 0) break
      days.push(day)
    }
    weeks.push(days)
  }
  return weeks
}

/** ISO date key in local time: YYYY-MM-DD */
export function toKey(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

/**
 * A stable "today" for the whole session.
 *
 * Reading the clock during render is an impure operation, and it also means
 * the dashboard could compute a different set of days on every re-render.
 * This module-level snapshot is refreshed by `useToday` (see hooks/useToday.ts)
 * if the app is left open across midnight.
 */
let sessionToday = startOfDay(new Date())

export function getSessionToday(): Date {
  return sessionToday
}

export function refreshSessionToday(): Date {
  sessionToday = startOfDay(new Date())
  return sessionToday
}

export function fromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/**
 * Month labels for a Monday-first week grid.
 * A label is emitted for the first week that touches a new month,
 * mirroring how the GitHub contribution graph positions month captions.
 */
export function monthLabelsFor(weeks: Date[][]): (string | null)[] {
  const labels: (string | null)[] = []
  let lastMonth = -1

  for (const week of weeks) {
    const days = week.filter((d) => d.getDate() !== 1)
    // Prefer the 1st of the month if the week contains it, else the week's first day.
    const anchor = week.find((d) => d.getDate() === 1) ?? days[0]
    if (!anchor) {
      labels.push(null)
      continue
    }
    const month = anchor.getMonth()
    if (month !== lastMonth) {
      labels.push(format(anchor, 'MMM'))
      lastMonth = month
    } else {
      labels.push(null)
    }
  }

  return labels
}

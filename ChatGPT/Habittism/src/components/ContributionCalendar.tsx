import { useHabitStore } from '../store/useHabitStore'
import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { GlassPanel, SectionHeading } from './GlassPanel'
import { CalendarTooltip } from './CalendarTooltip'
import { cn } from '../lib/utils'
import { buildCalendarWeeks, getSessionToday, monthLabelsFor, toKey } from '../lib/dates'
import type { DayStat } from '../types'
import { entriesForDate, useDayStats } from '../hooks/useHabitStats'

interface ContributionCalendarProps {
  /** Total number of habits, used for copy and tooltips. */
  totalHabits: number
  /** Fired when a calendar cell is clicked. */
  onSelectDay: (dayKey: string) => void
  className?: string
}

const LEVELS = ['lvl-0', 'lvl-1', 'lvl-2', 'lvl-3', 'lvl-4']

/** A full year of weeks, like the GitHub contribution graph. */
const WEEKS = 53

/** Width of the weekday-label rail, in px. */
const RAIL = 22

/**
 * Heatmap intensity is the *ratio* of scheduled habits completed that day.
 *
 * A raw count would look almost identical every day once you track more
 * than a couple of habits (most days would be "4 of 8"), so the map would
 * carry no information. A ratio instead answers the question that matters:
 * "did you do what you planned?"
 *
 * Levels are assigned by **rank** rather than by fixed thresholds. Ratios
 * cluster heavily (many days land on exactly 100%), so fixed cut-offs
 * would collapse entire colour levels. Ranking guarantees the map always
 * uses its full range, the same way GitHub breaks ties in its own graph.
 */
function buildLevelMap(days: DayStat[]): Map<string, number> {
  const withRatio = days
    .filter((d) => d.count > 0 && d.total > 0)
    .map((d) => ({ key: d.key, ratio: d.count / d.total }))

  withRatio.sort((a, b) => a.ratio - b.ratio)

  const levelMap = new Map<string, number>()
  const n = withRatio.length
  withRatio.forEach((entry, index) => {
    const level = n <= 1 ? 4 : Math.min(3, Math.floor((index / n) * 4)) + 1
    levelMap.set(entry.key, level)
  })

  return levelMap
}

export function ContributionCalendar({
  totalHabits,
  onSelectDay,
  className,
}: ContributionCalendarProps) {
  const [offset, setOffset] = useState(0)
  const [hovered, setHovered] = useState<{ date: Date; x: number; y: number } | null>(null)

  const habits = useHabitStore((s) => s.habits)
  const completions = useHabitStore((s) => s.completions)
  const today = getSessionToday()
  const anchor = useMemo(() => {
    const shifted = new Date(today)
    shifted.setMonth(shifted.getMonth() + offset)

    return shifted
  }, [offset, today])
  const days = useDayStats(anchor)
  const { weeks, monthLabels, lookup } = useMemo(() => {
    const built = buildCalendarWeeks(WEEKS, anchor)
    const map = new Map(days.map((d) => [d.key, d]))

    return {
      weeks: built,
      monthLabels: monthLabelsFor(built),
      lookup: map,
    }
  }, [days, anchor])

  const todayKey = toKey(today)

  const thresholds = useMemo(() => buildLevelMap(days), [days])

  const rangeLabel = useMemo(() => {
    const first = weeks[0]?.[0]
    const last = weeks[weeks.length - 1]?.slice(-1)[0]
    if (!first || !last) return ''
    const f = first.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    const l = last.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    return `${f} – ${l}`
  }, [weeks])

  /** Visible-range totals, computed from the same source data. */
  const rangeStats = useMemo(() => {
    const inRange = weeks.flat().map(toKey)
    let completions = 0
    let scheduled = 0
    let activeDays = 0
    for (const key of inRange) {
      const stat = lookup.get(key)
      const c = stat?.count ?? 0
      completions += c
      scheduled += stat?.total ?? 0
      if (c > 0) activeDays += 1
    }
    return {
      completions,
      activeDays,
      rate: scheduled > 0 ? Math.round((completions / scheduled) * 100) : 0,
    }
  }, [weeks, lookup])

  /**
   * Both rows share an identical grid template so month captions land
   * exactly above the column they belong to.
   */
  const gridTemplate = {
    gridTemplateColumns: `${RAIL}px repeat(${weeks.length}, minmax(0, 1fr))`,
  }

  return (
    <GlassPanel className={cn('overflow-hidden', className)} sheen>
      <div className="flex flex-col gap-5 p-5 sm:p-6">
        <SectionHeading
          icon={<CalendarDays size={17} strokeWidth={2.1} />}
          title="Contribution map"
          subtitle="Every completion, mapped across the year"
          action={
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label="Previous year"
                onClick={() => setOffset((o) => o - 12)}
                className="btn-ghost !px-2 !py-1.5"
              >
                <ChevronLeft size={15} />
              </button>
              <span className="min-w-[9.5rem] text-center text-[0.72rem] font-semibold text-mist-300 tabular">
                {rangeLabel}
              </span>
              <button
                type="button"
                aria-label="Next year"
                onClick={() => setOffset((o) => Math.min(0, o + 12))}
                disabled={offset >= 0}
                className="btn-ghost !px-2 !py-1.5 disabled:cursor-not-allowed disabled:opacity-35"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          }
        />

        <div className="scrollbar-none overflow-x-auto pb-1">
          <div className="min-w-[760px]">
            {/* Month captions — same grid template, so they align to columns */}
            <div
              className="mb-2 grid gap-[3px]"
              style={{
                gridTemplateColumns: `${RAIL}px repeat(${weeks.length}, minmax(0, 1fr))`,
              }}
            >
              {monthLabels.map((label, i) =>
                label ? (
                  <span
                    key={`m-${i}`}
                    className="whitespace-nowrap text-[0.6rem] font-semibold uppercase tracking-wide text-mist-500"
                    style={{ gridColumn: i + 2, gridRow: 1 }}
                  >
                    {label}
                  </span>
                ) : null,
              )}
            </div>

            {/* Grid */}
            <div className="grid gap-[3px]" style={{ ...gridTemplate, gridTemplateRows: 'repeat(7, auto)' }}>
              {/* Weekday rail — row 1 is Monday, matching GitHub's graph */}
              {['Mon', '', 'Wed', '', 'Fri', '', ''].map((label, i) =>
                label ? (
                  <span
                    key={`wd-${i}`}
                    className="self-center text-[0.58rem] font-semibold leading-none text-mist-500"
                    style={{ gridColumn: 1, gridRow: i + 1 }}
                  >
                    {label}
                  </span>
                ) : null,
              )}

              {weeks.map((week, wi) =>
                week.map((date, di) => {
                  const key = toKey(date)
                  const stat = lookup.get(key)
                  const count = stat?.count ?? 0
                  const due = stat?.total ?? 0
                  const level = count === 0 ? 0 : (thresholds.get(key) ?? 4)
                  const isToday = key === todayKey
                  const isFuture = date > today

                  return (
                    <motion.button
                      key={key}
                      type="button"
                      initial={{ opacity: 0, scale: 0.55 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{
                        delay: Math.min(0.55, wi * 0.008),
                        duration: 0.3,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      onMouseEnter={(e) => setHovered({ date, x: e.clientX, y: e.clientY })}
                      onMouseMove={(e) =>
                        setHovered((h) => (h ? { ...h, x: e.clientX, y: e.clientY } : h))
                      }
                      onMouseLeave={() => setHovered(null)}
                      onFocus={(e) => {
                        const r = e.currentTarget.getBoundingClientRect()
                        setHovered({ date, x: r.right, y: r.bottom })
                      }}
                      onBlur={() => setHovered(null)}
                      disabled={isFuture}
                      onClick={() => { setHovered(null); onSelectDay(key) }}
                      aria-label={`${date.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })} — ${count} of ${due} completed`}
                      className={cn(
                        'aspect-square w-full rounded-[3.5px] transition-shadow duration-200',
                        isFuture ? 'opacity-25' : LEVELS[level],
                        isToday && 'ring-1 ring-aqua-300/70',
                      )}
                      style={{ gridColumn: wi + 2, gridRow: di + 1 }}
                    />
                  )
                }),
              )}
            </div>
          </div>
        </div>

        {/* Legend + range stats */}
        <div className="flex flex-col gap-3 border-t border-white/[0.07] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <p className="text-[0.72rem] text-mist-500">
              <span className="font-bold text-mist-200 tabular">
                {rangeStats.completions.toLocaleString()}
              </span>{' '}
              completions across{' '}
              <span className="font-bold text-mist-200 tabular">{rangeStats.activeDays}</span> active
              days
              <span className="text-mist-500"> · </span>
              <span className="font-bold text-mist-200 tabular">{rangeStats.rate}%</span> of scheduled
              habits met
            </p>
            {totalHabits > 0 ? (
              <p className="text-[0.72rem] text-mist-500">
                Tracking{' '}
                <span className="font-bold text-mist-300 tabular">{totalHabits}</span> habits
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="text-[0.66rem] font-medium text-mist-500">Less</span>
            {LEVELS.map((lvl) => (
              <span
                key={lvl}
                className={cn('h-[10px] w-[10px] rounded-[3px]', lvl)}
              />
            ))}
            <span className="text-[0.66rem] font-medium text-mist-500">More</span>
          </div>
        </div>
      </div>

      <CalendarTooltip
        date={hovered?.date ?? null}
        x={hovered?.x ?? 0}
        y={hovered?.y ?? 0}
        habits={
          hovered
            ? entriesForDate(hovered.date, habits, completions).map((h) => ({
                id: h.id,
                name: h.name,
                color: h.color,
                done: h.done,
              }))
            : []
        }
      />
    </GlassPanel>
  )
}

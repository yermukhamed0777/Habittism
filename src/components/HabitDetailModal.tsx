import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  addMonths,
  endOfMonth,
  format,
  isAfter,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { CalendarCheck, ChevronLeft, ChevronRight, Target, X } from 'lucide-react'

import { GlassPanel } from './GlassPanel'
import { HabitIcon } from './HabitIcon'
import { COLOR_HEX, CATEGORY_META, type Habit } from '../types'
import { getSessionToday, toKey } from '../lib/dates'
import { cn } from '../lib/utils'

interface HabitDetailModalProps {
  habit: Habit | null
  completedDays: Set<string>
  onToggle: (dayKey: string) => void
  onClose: () => void
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function HabitDetailModal({
  habit,
  completedDays,
  onToggle,
  onClose,
}: HabitDetailModalProps) {
  const [month, setMonth] = useState(() => startOfMonth(getSessionToday()))

  const schedule = habit?.schedule?.length ? habit.schedule : [0, 1, 2, 3, 4, 5, 6]
  const scheduleSet = useMemo(() => new Set(schedule), [schedule])
  const today = getSessionToday()
  const todayKey = toKey(today)

  /** Monday-first grid covering the displayed month. */
  const grid = useMemo(() => {
    const first = startOfMonth(month)
    const last = endOfMonth(month)
    const gridStart = startOfWeek(first, { weekStartsOn: 1 })
    const gridEnd = startOfWeek(last, { weekStartsOn: 1 })
    const days: Date[] = []
    let cursor = gridStart
    while (cursor <= gridEnd || isSameMonth(cursor, last)) {
      days.push(cursor)
      cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1)
      if (days.length > 42) break
    }
    return days
  }, [month])

  const monthStats = useMemo(() => {
    if (!habit) return { done: 0, scheduled: 0, missed: 0 }
    let done = 0
    let scheduled = 0
    for (const day of grid) {
      if (!isSameMonth(day, month)) continue
      if (day > today) continue
      if (!scheduleSet.has(day.getDay())) continue
      scheduled += 1
      if (completedDays.has(toKey(day))) done += 1
    }
    return { done, scheduled, missed: scheduled - done }
  }, [grid, month, habit, scheduleSet, completedDays, today])

  if (!habit) return null

  const tint = COLOR_HEX[habit.color]

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
        className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-ink-950/70 p-4 backdrop-blur-md"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose()
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 18 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-2xl"
        >
          <GlassPanel className="overflow-hidden !rounded-3xl" sheen>
            {/* Header */}
            <div className="flex items-start gap-4 border-b border-white/[0.07] p-5 sm:p-6">
              <span
                className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white/12 text-ink-950"
                style={{
                  background: `linear-gradient(140deg, ${tint}, color-mix(in oklab, ${tint} 55%, white))`,
                  boxShadow: `inset 0 1px 0 rgba(255,255,255,0.45), 0 10px 26px -10px ${tint}`,
                }}
              >
                <HabitIcon name={habit.icon} size={20} />
              </span>

              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-extrabold tracking-tight text-mist-100">
                  {habit.name}
                </h3>
                <p className="mt-0.5 text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-mist-500">
                  {CATEGORY_META[habit.category].label} · {habit.targetPerWeek}× per week
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-mist-400 transition-colors hover:bg-white/10 hover:text-mist-100"
              >
                <X size={16} />
              </button>
            </div>

            {/* Month grid */}
            <div className="p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setMonth((m) => subMonths(m, 1))}
                  aria-label="Previous month"
                  className="btn-ghost !px-2 !py-1.5"
                >
                  <ChevronLeft size={15} />
                </button>

                <p className="text-sm font-bold tracking-tight text-mist-100">
                  {format(month, 'MMMM yyyy')}
                </p>

                <button
                  type="button"
                  onClick={() => setMonth((m) => addMonths(m, 1))}
                  aria-label="Next month"
                  className="btn-ghost !px-2 !py-1.5"
                >
                  <ChevronRight size={15} />
                </button>
              </div>

              {/* Weekday header */}
              <div className="mt-5 grid grid-cols-7 gap-1.5">
                {WEEKDAYS.map((d) => (
                  <div
                    key={d}
                    className="pb-1 text-center text-[0.6rem] font-bold uppercase tracking-wider text-mist-500"
                  >
                    {d.slice(0, 1)}
                  </div>
                ))}
              </div>

              {/* Days */}
              <div className="mt-1 grid grid-cols-7 gap-1.5">
                {grid.map((day) => {
                  const key = toKey(day)
                  const inMonth = isSameMonth(day, month)
                  const future = isAfter(day, today)
                  const due = scheduleSet.has(day.getDay())
                  const done = completedDays.has(key)
                  const isToday = key === todayKey

                  const disabled = future || !inMonth

                  return (
                    <motion.button
                      key={key}
                      type="button"
                      disabled={disabled}
                      onClick={() => onToggle(key)}
                      whileTap={disabled ? undefined : { scale: 0.9 }}
                      className={cn(
                        'relative aspect-square rounded-xl border text-[0.74rem] font-bold transition-all duration-200',
                        !inMonth && 'opacity-0 pointer-events-none',
                        done
                          ? 'text-ink-950'
                          : due
                            ? 'border-white/14 bg-white/[0.04] text-mist-300 hover:border-white/30 hover:bg-white/[0.09]'
                            : 'border-transparent bg-white/[0.02] text-mist-500 hover:bg-white/[0.06]',
                        future && 'cursor-not-allowed opacity-35',
                        isToday && !done && 'ring-1 ring-aqua-300/70',
                        done && isToday && 'ring-1 ring-aqua-300',
                      )}
                      style={
                        done
                          ? {
                              background: `linear-gradient(140deg, ${tint}, color-mix(in oklab, ${tint} 55%, white))`,
                              borderColor: tint,
                            }
                          : undefined
                      }
                      title={`${format(day, 'EEE, MMM d')}${due ? '' : ' — not scheduled'}`}
                    >
                      {format(day, 'd')}
                      {done ? (
                        <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-ink-950/55" />
                      ) : null}
                    </motion.button>
                  )
                })}
              </div>

              {/* Legend + month summary */}
              <div className="mt-5 flex flex-col gap-3 border-t border-white/[0.07] pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-4 text-[0.72rem] text-mist-500">
                  <span className="flex items-center gap-1.5">
                    <span
                      className="h-3 w-3 rounded-[4px] border border-white/14"
                      style={{ background: tint }}
                    />
                    Completed
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-[4px] border border-white/14 bg-white/[0.05]" />
                    Scheduled
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-[4px] bg-white/[0.02]" />
                    Rest day
                  </span>
                </div>

                <div className="flex items-center gap-3 text-[0.72rem]">
                  <span className="flex items-center gap-1.5 text-mist-300">
                    <CalendarCheck size={12} strokeWidth={2.4} />
                    <span className="tabular">{monthStats.done}/{monthStats.scheduled}</span>
                    done
                  </span>
                  <span className="flex items-center gap-1.5 text-mist-400">
                    <Target size={12} strokeWidth={2.4} />
                    <span className="tabular">{monthStats.missed}</span>
                    missed
                  </span>
                </div>
              </div>

              <p className="mt-3 text-[0.7rem] leading-relaxed text-mist-500">
                Tap any day to mark it as completed. Days outside the habit&apos;s schedule stay
                as rest days and don&apos;t affect streaks.
              </p>
            </div>
          </GlassPanel>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

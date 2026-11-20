import { AnimatePresence, motion } from 'motion/react'
import { format } from 'date-fns'
import { CalendarDays, Check, X } from 'lucide-react'

import { GlassPanel } from './GlassPanel'
import { HabitIcon } from './HabitIcon'
import { COLOR_HEX, type Habit } from '../types'
import { cn } from '../lib/utils'

interface DayDetailModalProps {
  dayKey: string | null
  habits: Habit[]
  /** habitId -> set of completed day keys. */
  completions: Record<string, string[]>
  onToggle: (habitId: string, dayKey: string) => void
  onOpenHabit: (habitId: string) => void
  onClose: () => void
}

export function DayDetailModal({
  dayKey,
  habits,
  completions,
  onToggle,
  onOpenHabit,
  onClose,
}: DayDetailModalProps) {
  if (!dayKey) return null

  const date = new Date(`${dayKey}T12:00:00`)
  const due = habits.filter((h) => h.schedule?.includes(date.getDay()))
  const rest = habits.filter((h) => !h.schedule?.includes(date.getDay()))

  const done = due.filter((h) => (completions[h.id] ?? []).includes(dayKey))
  const missed = due.filter((h) => !(completions[h.id] ?? []).includes(dayKey))

  const dateLabel = format(date, 'EEEE, MMMM d, yyyy')

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
          className="w-full max-w-lg"
        >
          <GlassPanel className="overflow-hidden !rounded-3xl" sheen>
            {/* Header */}
            <div className="flex items-start gap-3 border-b border-white/[0.07] p-5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.06] text-mist-200">
                <CalendarDays size={17} strokeWidth={2.1} />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-extrabold tracking-tight text-mist-100">
                  {dateLabel}
                </h3>
                <p className="mt-0.5 text-[0.76rem] text-mist-400">
                  {due.length === 0
                    ? 'Nothing was scheduled on this day'
                    : `${done.length} completed · ${missed.length} not done`}
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

            {/* Summary bar */}
            {due.length > 0 ? (
              <div className="px-5 pt-4">
                <div className="flex h-2 overflow-hidden rounded-full bg-white/[0.06]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(done.length / due.length) * 100}%` }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className="h-full rounded-full bg-gradient-to-r from-iris-400 to-aqua-400"
                  />
                </div>
              </div>
            ) : null}

            {/* Habit list */}
            <div className="max-h-[52vh] overflow-y-auto p-5">
              {due.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-white/12 px-4 py-8 text-center text-[0.8rem] leading-relaxed text-mist-400">
                  No habits were scheduled on this date, so nothing was expected of you.
                </p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {due.map((habit) => {
                    const isDone = (completions[habit.id] ?? []).includes(dayKey)
                    const tint = COLOR_HEX[habit.color]
                    return (
                      <li key={habit.id}>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onToggle(habit.id, dayKey)}
                            className={cn(
                              'flex flex-1 items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left transition-all duration-300',
                              isDone ? 'bg-white/[0.04]' : 'hover:border-white/10 hover:bg-white/[0.04]',
                            )}
                          >
                            <span
                              className={cn(
                                'grid h-7 w-7 shrink-0 place-items-center rounded-lg border transition-all duration-300',
                                isDone
                                  ? 'text-ink-950'
                                  : 'border-white/12 bg-white/[0.05] text-mist-500',
                              )}
                              style={isDone ? { background: tint, borderColor: tint } : undefined}
                            >
                              {isDone ? (
                                <Check size={14} strokeWidth={3} />
                              ) : (
                                <HabitIcon name={habit.icon} size={13} />
                              )}
                            </span>
                            <span
                              className={cn(
                                'flex-1 truncate text-[0.85rem] font-semibold transition-colors duration-300',
                                isDone ? 'text-mist-400 line-through' : 'text-mist-200',
                              )}
                            >
                              {habit.name}
                            </span>
                            <span
                              className={cn(
                                'text-[0.62rem] font-bold uppercase tracking-wider',
                                isDone ? 'text-mint-400' : 'text-mist-500',
                              )}
                            >
                              {isDone ? 'Done' : 'Missed'}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onOpenHabit(habit.id)}
                            className="shrink-0 rounded-lg px-2 py-1.5 text-[0.66rem] font-semibold text-mist-500 transition-colors hover:bg-white/10 hover:text-mist-200"
                          >
                            Open
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}

              {rest.length > 0 ? (
                <div className="mt-5 border-t border-white/[0.07] pt-4">
                  <p className="text-[0.66rem] font-semibold uppercase tracking-[0.1em] text-mist-500">
                    Not scheduled ({rest.length})
                  </p>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {rest.map((h) => (
                      <li
                        key={h.id}
                        className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-2.5 py-1.5 text-[0.72rem] font-medium text-mist-500"
                      >
                        {h.name}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </GlassPanel>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

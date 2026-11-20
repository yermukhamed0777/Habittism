import { motion } from 'motion/react'
import { CalendarDays, Check, Flame, Trash2 } from 'lucide-react'
import { GlassPanel } from './GlassPanel'
import { HabitIcon } from './HabitIcon'
import { COLOR_HEX, CATEGORY_META } from '../types'
import { cn } from '../lib/utils'
import type { HabitStats } from '../hooks/useHabitStats'

interface HabitCardProps {
  stats: HabitStats
  isDoneToday: boolean
  onToggle: () => void
  onDelete: () => void
  /** Opens the habit's day picker. */
  onOpen?: () => void
  index?: number
}

export function HabitCard({
  stats,
  isDoneToday,
  onToggle,
  onDelete,
  onOpen,
  index = 0,
}: HabitCardProps) {
  const { habit, currentStreak, bestStreak, thisWeek, dueThisWeek, completionRate } = stats
  const tint = COLOR_HEX[habit.color]
  const weekProgress = Math.min(1, thisWeek / Math.max(1, dueThisWeek || habit.targetPerWeek))

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      layout
    >
      <GlassPanel
        interactive
        className={cn(
          'group relative h-full overflow-hidden !rounded-2xl transition-colors duration-500',
          isDoneToday && '!border-white/[0.18]',
        )}
      >
        {/* Color wash when completed */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full opacity-0 blur-2xl transition-opacity duration-700"
          style={{
            background: tint,
            opacity: isDoneToday ? 0.4 : 0,
          }}
        />

        <div className="relative flex items-start gap-3 p-4">
          {/* Check button */}
          <button
            type="button"
            onClick={onToggle}
            aria-label={isDoneToday ? `Mark ${habit.name} as not done` : `Mark ${habit.name} as done`}
            className={cn(
              'relative mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl border transition-all duration-300',
              isDoneToday
                ? 'text-ink-950'
                : 'border-white/12 bg-white/[0.05] text-mist-500 hover:border-white/25 hover:text-mist-200',
            )}
            style={isDoneToday ? { background: tint, borderColor: tint } : undefined}
          >
            {isDoneToday ? (
              <>
                <span
                  aria-hidden
                  className="absolute inset-0 animate-[pulse-ring_2.4s_ease-out_infinite] rounded-xl border-2"
                  style={{ borderColor: tint }}
                />
                <Check size={17} strokeWidth={3} className="relative z-10" />
              </>
            ) : (
              <HabitIcon name={habit.icon} size={16} />
            )}
          </button>

          {/* Body — clicking opens the habit's day picker */}
          <button
            type="button"
            onClick={onOpen}
            aria-label={`Open ${habit.name} and choose completed days`}
            className="min-w-0 flex-1 text-left"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p
                  className={cn(
                    'truncate text-[0.9rem] font-bold tracking-tight transition-colors duration-300',
                    isDoneToday ? 'text-mist-300' : 'text-mist-100',
                  )}
                >
                  {habit.name}
                </p>
                <p className="mt-0.5 text-[0.68rem] font-medium uppercase tracking-[0.08em] text-mist-500">
                  {CATEGORY_META[habit.category].label}
                </p>
              </div>

              <span className="mt-0.5 shrink-0 text-mist-500 transition-colors duration-300 group-hover:text-mist-200">
                <CalendarDays size={14} strokeWidth={2.2} />
              </span>
            </div>

            {/* Meta row */}
            <div className="mt-3 flex items-center gap-3">
              <span
                className="inline-flex items-center gap-1 text-[0.72rem] font-bold tabular"
                style={{ color: currentStreak > 0 ? tint : undefined }}
              >
                <Flame size={12} strokeWidth={2.4} />
                {currentStreak}
                <span className="font-medium text-mist-500">day streak</span>
              </span>
              <span className="text-[0.72rem] font-medium text-mist-500 tabular">
                best {bestStreak}
              </span>
            </div>

            {/* Weekly progress */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-[0.66rem] font-medium text-mist-500">
                <span>This week</span>
                <span className="tabular">
                  {thisWeek}/{dueThisWeek || habit.targetPerWeek}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${weekProgress * 100}%` }}
                  transition={{ delay: 0.15 + index * 0.05, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  className="h-full rounded-full"
                  style={{
                    background: `linear-gradient(90deg, ${tint}, color-mix(in oklab, ${tint} 45%, white))`,
                    boxShadow: `0 0 10px -2px ${tint}`,
                  }}
                />
              </div>
            </div>

            {/* Lifetime rate */}
            <p className="mt-2.5 text-[0.68rem] font-medium text-mist-500 tabular">
              {Math.round(completionRate)}% lifetime consistency
            </p>
          </button>

          {/* Delete */}
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Delete ${habit.name}`}
            className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg text-mist-500 opacity-0 transition-all duration-300 hover:bg-rose-500/15 hover:text-rose-300 focus-visible:opacity-100 group-hover:opacity-100"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </GlassPanel>
    </motion.div>
  )
}

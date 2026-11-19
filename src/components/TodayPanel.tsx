import { motion } from 'motion/react'
import { Check, Sparkles } from 'lucide-react'
import { GlassPanel, SectionHeading } from './GlassPanel'
import { HabitIcon } from './HabitIcon'
import { COLOR_HEX } from '../types'
import { cn } from '../lib/utils'

interface TodayItem {
  id: string
  name: string
  icon: string
  color: keyof typeof COLOR_HEX
  done: boolean
  /** False when the habit isn't scheduled for today (a rest day). */
  due: boolean
}

interface TodayPanelProps {
  items: TodayItem[]
  onToggle: (id: string) => void
}

export function TodayPanel({ items, onToggle }: TodayPanelProps) {
  const dueItems = items.filter((i) => i.due)
  const doneCount = dueItems.filter((i) => i.done).length
  const ratio = dueItems.length ? doneCount / dueItems.length : 0
  const circumference = 2 * Math.PI * 46
  const restCount = items.length - dueItems.length

  return (
    <GlassPanel className="h-full overflow-hidden" sheen>
      <div className="flex h-full flex-col p-5 sm:p-6">
        <SectionHeading
          icon={<Sparkles size={17} strokeWidth={2.1} />}
          title="Today"
          subtitle={
            dueItems.length
              ? `${doneCount} of ${dueItems.length} scheduled completed`
              : 'Nothing scheduled today'
          }
        />

        {/* Progress ring */}
        <div className="my-6 flex items-center justify-center">
          <div className="relative h-[132px] w-[132px]">
            <svg viewBox="0 0 110 110" className="h-full w-full -rotate-90">
              <defs>
                <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#a78bfa" />
                  <stop offset="55%" stopColor="#22d3ee" />
                  <stop offset="100%" stopColor="#6ee7b7" />
                </linearGradient>
              </defs>
              <circle cx="55" cy="55" r="46" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
              <motion.circle
                cx="55"
                cy="55"
                r="46"
                fill="none"
                stroke="url(#ring-grad)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: circumference * (1 - ratio) }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                style={{ filter: 'drop-shadow(0 0 6px rgba(34,211,238,0.55))' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-extrabold leading-none tracking-tight text-mist-100 tabular">
                {Math.round(ratio * 100)}
                <span className="text-base font-bold text-mist-400">%</span>
              </span>
              <span className="mt-1 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-mist-500">
                complete
              </span>
            </div>
          </div>
        </div>

        {/* Checklist */}
        <ul className="flex flex-1 flex-col gap-1.5">
          {items.map((item) => {
            const tint = COLOR_HEX[item.color]
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onToggle(item.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2 text-left transition-all duration-300',
                    item.done
                      ? 'bg-white/[0.04]'
                      : item.due
                        ? 'hover:border-white/10 hover:bg-white/[0.04]'
                        : 'opacity-45 hover:opacity-70',
                  )}
                >
                  <span
                    className={cn(
                      'grid h-7 w-7 shrink-0 place-items-center rounded-lg border transition-all duration-300',
                      item.done
                        ? 'text-ink-950'
                        : 'border-white/12 bg-white/[0.05] text-mist-500',
                    )}
                    style={item.done ? { background: tint, borderColor: tint } : undefined}
                  >
                    {item.done ? (
                      <Check size={14} strokeWidth={3} />
                    ) : (
                      <HabitIcon name={item.icon} size={13} />
                    )}
                  </span>
                  <span
                    className={cn(
                      'flex-1 truncate text-[0.82rem] font-semibold transition-colors duration-300',
                      item.done ? 'text-mist-400 line-through' : 'text-mist-200',
                    )}
                  >
                    {item.name}
                  </span>
                  {item.done ? (
                    <span className="text-[0.62rem] font-bold uppercase tracking-wider text-mint-400">
                      Done
                    </span>
                  ) : item.due ? (
                    <span className="text-[0.62rem] font-bold uppercase tracking-wider text-mist-500">
                      Due
                    </span>
                  ) : (
                    <span className="text-[0.62rem] font-semibold uppercase tracking-wider text-mist-500">
                      Rest
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>

        {restCount > 0 ? (
          <p className="mt-3 text-[0.7rem] text-mist-500">
            {restCount} habit{restCount === 1 ? ' is' : 's are'} on a rest day — they don&apos;t count
            against today.
          </p>
        ) : null}
      </div>
    </GlassPanel>
  )
}

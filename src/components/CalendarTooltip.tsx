import { AnimatePresence, motion } from 'motion/react'
import { format } from 'date-fns'
import { Check, Minus } from 'lucide-react'

interface TooltipHabit {
  id: string
  name: string
  color: string
  done: boolean
}

interface CalendarTooltipProps {
  date: Date | null
  habits: TooltipHabit[]
  x: number
  y: number
}

export function CalendarTooltip({ date, habits, x, y }: CalendarTooltipProps) {
  const visible = !!date && habits.length > 0

  const done = habits.filter((h) => h.done)
  const missed = habits.filter((h) => !h.done)

  // Flip the tooltip so it never runs off the right or bottom edge.
  const flipX = x > window.innerWidth - 240
  const flipY = y > window.innerHeight - 190

  return (
    <AnimatePresence>
      {visible && date ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.13, ease: 'easeOut' }}
          className="pointer-events-none fixed z-50 w-56 rounded-xl border border-white/12 bg-ink-900/92 p-3 shadow-2xl backdrop-blur-xl"
          style={{
            left: flipX ? x - 232 : x + 14,
            top: flipY ? y - 118 : y + 14,
          }}
        >
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.08em] text-mist-300">
            {format(date, 'EEE, MMM d, yyyy')}
          </p>

          <div className="mt-2 flex items-center gap-3 text-[0.72rem] font-semibold">
            <span className="flex items-center gap-1 text-mint-400">
              <Check size={12} strokeWidth={3} />
              <span className="tabular">{done.length}</span> done
            </span>
            <span className="flex items-center gap-1 text-rose-300">
              <Minus size={12} strokeWidth={3} />
              <span className="tabular">{missed.length}</span> not done
            </span>
          </div>

          {habits.length > 0 ? (
            <ul className="mt-2.5 space-y-1 border-t border-white/[0.08] pt-2.5">
              {habits.map((h) => (
                <li key={h.id} className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{
                      background: h.done ? h.color : 'transparent',
                      border: h.done ? 'none' : `1px solid ${h.color}`,
                      opacity: h.done ? 1 : 0.55,
                    }}
                  />
                  <span
                    className={
                      h.done
                        ? 'flex-1 truncate text-[0.7rem] font-medium text-mist-300'
                        : 'flex-1 truncate text-[0.7rem] font-medium text-mist-500'
                    }
                  >
                    {h.name}
                  </span>
                  <span className="shrink-0 text-[0.62rem] font-bold uppercase tracking-wider text-mist-500">
                    {h.done ? 'Done' : 'Missed'}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

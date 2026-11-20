import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { GlassPanel } from './GlassPanel'
import { cn } from '../lib/utils'

interface StatCardProps {
  label: string
  value: string
  unit?: string
  icon: ReactNode
  hint?: string
  accent?: 'iris' | 'aqua' | 'mint' | 'amber'
  index?: number
}

const ACCENT: Record<string, string> = {
  iris: 'text-iris-300',
  aqua: 'text-aqua-300',
  mint: 'text-mint-300',
  amber: 'text-amber-300',
}

export function StatCard({
  label,
  value,
  unit,
  icon,
  hint,
  accent = 'iris',
  index = 0,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
    >
      <GlassPanel interactive className="group h-full overflow-hidden !rounded-2xl">
        <div className="relative p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.09em] text-mist-500">
                {label}
              </p>
              <p className="mt-1.5 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold leading-none tracking-tight text-mist-100 tabular">
                  {value}
                </span>
                {unit ? (
                  <span className={cn('text-xs font-semibold', ACCENT[accent])}>{unit}</span>
                ) : null}
              </p>
            </div>
            <span
              className={cn(
                'grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.06] backdrop-blur-xl transition-transform duration-500 group-hover:scale-110',
                ACCENT[accent],
              )}
            >
              {icon}
            </span>
          </div>

          {hint ? <p className="mt-2.5 text-[0.72rem] leading-snug text-mist-500">{hint}</p> : null}

          {/* Bottom accent hairline */}
          <div className="pointer-events-none absolute inset-x-4 bottom-0 h-px hairline opacity-60" />
        </div>
      </GlassPanel>
    </motion.div>
  )
}

import { Activity, Feather, LayoutDashboard, Plus } from 'lucide-react'
import { motion } from 'motion/react'
import { cn } from '../lib/utils'

export function Logo({ size = 30 }: { size?: number }) {
  return (
    <span
      className="relative grid shrink-0 place-items-center rounded-[10px] border border-white/12"
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(140deg, rgba(167,139,250,0.95), rgba(34,211,238,0.9))',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5), 0 8px 22px -8px rgba(139,92,246,0.9)',
      }}
    >
      <svg viewBox="0 0 24 24" width={size * 0.62} height={size * 0.62} fill="none">
        <g fill="#0b0e17">
          <rect x="3" y="3" width="7" height="7" rx="2" />
          <rect x="14" y="3" width="7" height="7" rx="2" opacity="0.55" />
          <rect x="3" y="14" width="7" height="7" rx="2" opacity="0.55" />
          <rect x="14" y="14" width="7" height="7" rx="2" />
        </g>
      </svg>
    </span>
  )
}

export type View = 'greeting' | 'dashboard'

const VIEWS: { id: View; label: string; icon: typeof Feather }[] = [
  { id: 'greeting', label: 'Today', icon: Feather },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
]

interface TopBarProps {
  onAdd: () => void
  streak: number
  onReset: () => void
  view: View
  onViewChange: (view: View) => void
}

export function TopBar({ onAdd, streak, onReset, view, onViewChange }: TopBarProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="sticky top-0 z-40"
    >
      <div className="mx-auto max-w-[1240px] px-4 pt-4 sm:px-6 sm:pt-5">
        <div className="glass glass-sheen flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 sm:px-4">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <Logo size={32} />
            <div className="leading-tight">
              <p className="text-[0.95rem] font-extrabold tracking-tight text-mist-100">
                Habittism
              </p>
              <p className="hidden text-[0.64rem] font-medium uppercase tracking-[0.14em] text-mist-500 sm:block">
                Habit intelligence
              </p>
            </div>
          </div>

          {/* View switcher */}
          <nav className="flex items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.04] p-1">
            {VIEWS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => onViewChange(id)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[0.76rem] font-semibold transition-all duration-300',
                  view === id
                    ? 'bg-white/[0.12] text-mist-100 shadow-sm'
                    : 'text-mist-400 hover:text-mist-200',
                )}
              >
                <Icon size={13} strokeWidth={2.2} />
                {label}
              </button>
            ))}
          </nav>

          {/* Streak badge */}
          <div className="chip hidden !border-amber-300/25 !bg-amber-400/10 text-amber-200 md:inline-flex">
            <Activity size={12} strokeWidth={2.4} />
            {streak} day streak
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onReset}
              className="btn-ghost hidden !px-2.5 !py-2 sm:inline-flex"
              title="Clear all data"
            >
              <span className="text-[0.74rem]">Clear</span>
            </button>
            <button type="button" onClick={onAdd} className="btn-primary !px-3 !py-2 sm:!px-4">
              <Plus size={15} strokeWidth={2.6} />
              <span className="hidden sm:inline">New habit</span>
              <span className="sm:hidden">New</span>
            </button>
          </div>
        </div>
      </div>
    </motion.header>
  )
}

import type { ReactNode } from 'react'
import { cn } from '../lib/utils'

interface GlassPanelProps {
  children: ReactNode
  className?: string
  /** Adds the animated specular sheen sweep. */
  sheen?: boolean
  /** Adds hover lift + border bloom. */
  interactive?: boolean
}

export function GlassPanel({ children, className, sheen = false, interactive = false }: GlassPanelProps) {
  return (
    <div
      className={cn(
        'glass rounded-[var(--radius-glass)]',
        sheen && 'glass-sheen',
        interactive && 'glass-interactive',
        className,
      )}
    >
      {children}
    </div>
  )
}

interface SectionHeadingProps {
  icon?: ReactNode
  title: string
  subtitle?: string
  action?: ReactNode
  className?: string
}

export function SectionHeading({ icon, title, subtitle, action, className }: SectionHeadingProps) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-x-4 gap-y-3', className)}>
      <div className="flex min-w-0 flex-1 items-start gap-3">
        {icon ? (
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.06] text-mist-200 backdrop-blur-xl">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          <h2 className="text-[0.98rem] font-bold tracking-tight text-mist-100">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-[0.78rem] leading-snug text-mist-400">{subtitle}</p> : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

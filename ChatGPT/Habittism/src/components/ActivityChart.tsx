import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { GlassPanel, SectionHeading } from './GlassPanel'
import { TrendingUp } from 'lucide-react'
import { buildCalendarWeeks, getSessionToday, toKey } from '../lib/dates'
import type { DayStat } from '../types'

interface ActivityChartProps {
  days: DayStat[]
}

interface TooltipPayloadItem {
  payload?: { label?: string; completions?: number; rate?: number }
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: TooltipPayloadItem[]
}) {
  if (!active || !payload?.length) return null
  const p = payload[0]?.payload
  return (
    <div className="rounded-xl border border-white/12 bg-ink-900/85 px-3 py-2 shadow-2xl backdrop-blur-xl">
      <p className="text-[0.68rem] font-semibold uppercase tracking-wider text-mist-500">{p?.label}</p>
      <p className="mt-1 text-sm font-bold text-mist-100 tabular">
        {p?.completions ?? 0} completions
      </p>
      <p className="text-[0.7rem] font-medium text-aqua-300 tabular">{p?.rate ?? 0}% of daily</p>
    </div>
  )
}

export function ActivityChart({ days }: ActivityChartProps) {
  const data = useMemo(() => {
    const today = getSessionToday()
    const weeks = buildCalendarWeeks(15, today)
    // The current week is still in progress — plotting it would show a
    // misleading cliff at the end of the trend.
    const completeWeeks = weeks.slice(0, -1)
    const map = new Map(days.map((d) => [d.key, d]))

    return completeWeeks.map((week) => {
      const weekDays = week.map((d) => map.get(toKey(d)))
      const completions = weekDays.reduce((sum, d) => sum + (d?.count ?? 0), 0)
      // Rate is measured against the habits actually scheduled that week.
      const scheduled = weekDays.reduce((sum, d) => sum + (d?.total ?? 0), 0)
      const rate = scheduled > 0 ? Math.round((completions / scheduled) * 100) : 0
      const label = week[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      return { label, completions, rate }
    })
  }, [days])

  return (
    <GlassPanel className="h-full overflow-hidden" sheen>
      <div className="flex h-full flex-col p-5 sm:p-6">
        <SectionHeading
          icon={<TrendingUp size={17} strokeWidth={2.1} />}
          title="Weekly momentum"
          subtitle="Completion volume over the last 14 complete weeks"
        />

        <div className="mt-5 min-h-[220px] flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="area-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.42} />
                  <stop offset="55%" stopColor="#8b5cf6" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="area-stroke" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#a78bfa" />
                  <stop offset="100%" stopColor="#67e8f9" />
                </linearGradient>
              </defs>
              <CartesianGrid
                vertical={false}
                stroke="rgba(255,255,255,0.055)"
                strokeDasharray="3 5"
              />
              <XAxis
                dataKey="label"
                tick={{ fill: '#6b748c', fontSize: 10, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={18}
              />
              <YAxis
                tick={{ fill: '#6b748c', fontSize: 10, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
                width={44}
                domain={[
                  (dataMin: number) => Math.max(0, Math.floor(dataMin * 0.75)),
                  (dataMax: number) => Math.ceil(dataMax * 1.05),
                ]}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.16)' }} />
              <Area
                type="monotone"
                dataKey="completions"
                stroke="url(#area-stroke)"
                strokeWidth={2.4}
                fill="url(#area-fill)"
                dot={false}
                isAnimationActive={false}
                activeDot={{
                  r: 4.5,
                  fill: '#67e8f9',
                  stroke: '#05060a',
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </GlassPanel>
  )
}

export type HabitCategory = 'mind' | 'body' | 'craft' | 'social' | 'system'

export type HabitColor = 'iris' | 'aqua' | 'mint' | 'amber' | 'rose'

export interface Habit {
  id: string
  name: string
  icon: string
  category: HabitCategory
  color: HabitColor
  /** How many times per week this habit should be performed. */
  targetPerWeek: number
  /** Weekdays (0 = Sunday) the habit is due. Empty means every day. */
  schedule?: number[]
  createdAt: string
  archived: boolean
}

/** Map of habitId -> array of ISO date keys (YYYY-MM-DD). */
export type CompletionMap = Record<string, string[]>

export interface DayStat {
  key: string
  date: Date
  count: number
  total: number
}

export const CATEGORY_META: Record<HabitCategory, { label: string; tint: string }> = {
  mind: { label: 'Mind', tint: 'var(--color-iris-400)' },
  body: { label: 'Body', tint: 'var(--color-rose-ish)' },
  craft: { label: 'Craft', tint: 'var(--color-aqua-400)' },
  social: { label: 'Social', tint: 'var(--color-mint-400)' },
  system: { label: 'System', tint: 'var(--color-amber-400, #fbbf24)' },
}

export const COLOR_HEX: Record<HabitColor, string> = {
  iris: '#a78bfa',
  aqua: '#22d3ee',
  mint: '#34d399',
  amber: '#fbbf24',
  rose: '#fb7185',
}

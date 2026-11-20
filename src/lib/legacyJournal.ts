import { fromKey, toKey } from './dates'
import { habitFields } from './habitRepository'
import { colors, type Accent, type Category } from './tracking'

const storageKey = 'habittism-store-v1'
const legacyCategories: Record<string, Category> = {
  mind: 'mindset', body: 'fitness', craft: 'focus', social: 'custom', system: 'custom',
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function validDay(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && toKey(fromKey(value)) === value
}

function oldSchedule(id: string, target: number) {
  if (target >= 5) return [0, 1, 2, 3, 4, 5, 6]
  const base = ({ 1: [2], 2: [2, 6], 3: [1, 3, 5], 4: [1, 2, 4, 5] })[target] ?? [1, 3, 5]
  let hash = 2166136261
  for (let index = 0; index < id.length; index++) hash = Math.imul(hash ^ id.charCodeAt(index), 16777619)
  return base.map((day) => (day + Math.abs(hash) % base.length) % 7)
}

export function parseLegacyJournal(raw: string, today: string) {
  const parsed = record(JSON.parse(raw))
  const state = record(parsed.state ?? parsed)
  const byHabit = record(state.completions)
  const seen = new Set<string>()
  const logs: { legacy_id: string; day: string }[] = []
  const habits = (Array.isArray(state.habits) ? state.habits : []).flatMap((input: unknown) => {
    const existing = record(input)
    const id = typeof existing.id === 'string' ? existing.id.slice(0, 200) : ''
    const name = typeof existing.name === 'string' ? existing.name.trim().slice(0, 80) : ''
    if (!id || !name || seen.has(id)) return []
    seen.add(id)

    const checkIns = byHabit[id]
    const days = Array.isArray(checkIns) ? [...new Set(checkIns.filter(validDay))].sort() : []
    for (const day of days) logs.push({ legacy_id: id, day })
    const oldDate = typeof existing.createdAt === 'string' ? existing.createdAt.slice(0, 10) : ''
    const target = typeof existing.targetPerWeek === 'number' ? existing.targetPerWeek : 7
    const week = Array.isArray(existing.schedule)
      ? [...new Set(existing.schedule.filter((day): day is number => typeof day === 'number' && Number.isInteger(day) && day >= 0 && day <= 6))]
      : []
    const schedule = week.length ? week : oldSchedule(id, target)
    const previous = typeof existing.category === 'string' ? existing.category : ''
    const category = Object.hasOwn(legacyCategories, previous) ? legacyCategories[previous] : 'custom'
    const customCategory = category === 'custom' && previous ? (previous[0].toUpperCase() + previous.slice(1)).slice(0, 40) : null
    const color = typeof existing.color === 'string' && Object.hasOwn(colors, existing.color) ? existing.color as Accent : 'mint'
    const icon = typeof existing.icon === 'string' && existing.icon.trim() ? Array.from(existing.icon).slice(0, 32).join('') : 'target'

    return [{
      ...habitFields({
        name, icon, color, category, customCategory,
        schedule: schedule.length === 7 ? 'daily' : 'weekdays',
        weekdays: schedule.length === 7 ? [] : schedule,
        weeklyTarget: 7, kind: 'binary', goal: 1, unit: '',
      }),
      legacy_id: id,
      archived: existing.archived === true,
      created_on: validDay(oldDate) ? oldDate : days[0] ?? today,
    }]
  })

  const affirmations = Object.entries(record(state.affirmations)).flatMap(([day, text]) => {
    if (!validDay(day) || typeof text !== 'string' || !text.trim()) return []
    return [{ day, body: text.trim().slice(0, 4000) }]
  })

  if (!habits.length && !affirmations.length) return null
  return { habits, logs, affirmations }
}

export type LegacyJournal = NonNullable<ReturnType<typeof parseLegacyJournal>>

export function readBrowserBackup(today: string) {
  try {
    const raw = localStorage.getItem(storageKey)
    return raw ? parseLegacyJournal(raw, today) : null
  } catch {
    return null
  }
}

export function browserBackupImported(userId: string) {
  try { return localStorage.getItem(`habittism-imported:${userId}`) === 'yes' } catch { return false }
}

export function markBrowserBackupImported(userId: string) {
  try { localStorage.setItem(`habittism-imported:${userId}`, 'yes') } catch { /* Import remains idempotent. */ }
}

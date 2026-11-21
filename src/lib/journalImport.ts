import { toKey, fromKey } from './dates'
import { colors, type Accent, type ArchivePeriod, type Category, type HabitLog, type Journal, type Mood, type Schedule, type TrackedHabit } from './tracking'

/**
 * Parse and validate a modern Habittism JSON export (version 1).
 *
 * The modern format is emitted by `downloadJournal` with format 'json' and
 * contains `{ version: 1, habits, logs, affirmations }` matching the Journal
 * interface.  This parser validates every field defensively so a corrupt or
 * hand-edited file cannot silently lose records or reinterpret a numeric habit
 * as a binary one.
 */

const validCategories = new Set<string>(['health', 'focus', 'mindset', 'fitness', 'custom'])
const validSchedules = new Set<string>(['daily', 'weekdays', 'weekly'])
const validKinds = new Set<string>(['binary', 'numeric'])
const validMoods = new Set<string>(['energized', 'steady', 'low'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function validDay(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && toKey(fromKey(value)) === value
}

function validAccent(value: unknown): value is Accent {
  return typeof value === 'string' && Object.hasOwn(colors, value)
}

function validateArchivePeriods(raw: unknown): ArchivePeriod[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((period): period is ArchivePeriod =>
    isRecord(period) &&
    (period.start === null || validDay(period.start)) &&
    (period.end === null || validDay(period.end)) &&
    !(typeof period.start === 'string' && typeof period.end === 'string' && period.start > period.end),
  )
}

function validateHabit(raw: unknown): TrackedHabit | null {
  if (!isRecord(raw)) return null

  const id = typeof raw.id === 'string' ? raw.id.trim() : ''
  const name = typeof raw.name === 'string' ? raw.name.trim().slice(0, 80) : ''
  if (!id || !name) return null

  const icon = typeof raw.icon === 'string' && raw.icon.trim()
    ? Array.from(raw.icon).slice(0, 32).join('') : 'target'
  const color = validAccent(raw.color) ? raw.color : 'mint'
  const category = typeof raw.category === 'string' && validCategories.has(raw.category)
    ? raw.category as Category : 'custom'
  const customCategory = category === 'custom' && typeof raw.customCategory === 'string' && raw.customCategory.trim()
    ? raw.customCategory.trim().slice(0, 40) : null
  const schedule = typeof raw.schedule === 'string' && validSchedules.has(raw.schedule)
    ? raw.schedule as Schedule : 'daily'
  const weekdays = Array.isArray(raw.weekdays)
    ? [...new Set(raw.weekdays.filter((d): d is number => typeof d === 'number' && Number.isInteger(d) && d >= 0 && d <= 6))]
    : []
  const weeklyTarget = typeof raw.weeklyTarget === 'number' && Number.isInteger(raw.weeklyTarget) && raw.weeklyTarget >= 1 && raw.weeklyTarget <= 7
    ? raw.weeklyTarget : 7
  const kind = typeof raw.kind === 'string' && validKinds.has(raw.kind) ? raw.kind as 'binary' | 'numeric' : 'binary'
  const goal = typeof raw.goal === 'number' && raw.goal > 0 && raw.goal <= 1e9 ? raw.goal : 1
  const unit = kind === 'numeric' && typeof raw.unit === 'string' ? raw.unit.slice(0, 24) : ''
  const createdOn = validDay(raw.createdOn) ? raw.createdOn : ''
  if (!createdOn) return null

  const archived = raw.archived === true
  const archived_at = typeof raw.archived_at === 'string' ? raw.archived_at : undefined
  const archivePeriods = validateArchivePeriods(raw.archivePeriods)

  return {
    id, name, icon, color, category, customCategory, schedule, weekdays,
    weeklyTarget, kind, goal, unit, createdOn, archived, archived_at,
    archivePeriods: archivePeriods.length ? archivePeriods : undefined,
  }
}

function validateLog(raw: unknown): HabitLog | null {
  if (!isRecord(raw)) return null
  const value = typeof raw.value === 'number' && raw.value >= 0 && raw.value <= 1e9 ? raw.value : 0
  const frozen = raw.frozen === true
  if (frozen && value !== 0) return null
  const note = typeof raw.note === 'string' && raw.note.trim() ? raw.note.trim().slice(0, 280) : null
  const mood = typeof raw.mood === 'string' && validMoods.has(raw.mood) ? raw.mood as Mood : null
  if (!value && !frozen && !note && !mood) return null
  return { value, frozen, note, mood }
}

export interface ImportPreview {
  habits: number
  checkIns: number
  affirmations: number
  numericHabits: number
  archivedHabits: number
}

export interface ParsedModernJournal {
  journal: Journal
  preview: ImportPreview
}

/** Returns null if the input is not a valid modern Habittism export. */
export function parseModernJournal(raw: string): ParsedModernJournal | null {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return null }
  if (!isRecord(parsed)) return null

  // The modern format always has version: 1
  if (parsed.version !== 1) return null
  if (!Array.isArray(parsed.habits)) return null
  if (!isRecord(parsed.logs)) return null
  if (!isRecord(parsed.affirmations)) return null

  const seen = new Set<string>()
  const habits: TrackedHabit[] = []
  for (const entry of parsed.habits) {
    const habit = validateHabit(entry)
    if (!habit || seen.has(habit.id)) continue
    seen.add(habit.id)
    habits.push(habit)
  }

  const logs: Journal['logs'] = {}
  let checkIns = 0
  const rawLogs = parsed.logs as Record<string, unknown>
  for (const habitId of Object.keys(rawLogs)) {
    if (!seen.has(habitId)) continue
    const habitLogs = rawLogs[habitId]
    if (!isRecord(habitLogs)) continue
    const validated: Record<string, HabitLog> = {}
    for (const [day, logData] of Object.entries(habitLogs)) {
      if (!validDay(day)) continue
      const log = validateLog(logData)
      if (!log) continue
      validated[day] = log
      checkIns++
    }
    if (Object.keys(validated).length) logs[habitId] = validated
  }

  const affirmations: Journal['affirmations'] = {}
  let affirmationCount = 0
  for (const [day, body] of Object.entries(parsed.affirmations as Record<string, unknown>)) {
    if (!validDay(day) || typeof body !== 'string' || !body.trim()) continue
    affirmations[day] = body.trim().slice(0, 4000)
    affirmationCount++
  }

  if (!habits.length && !affirmationCount) return null

  return {
    journal: { habits, logs, affirmations },
    preview: {
      habits: habits.length,
      checkIns,
      affirmations: affirmationCount,
      numericHabits: habits.filter((h) => h.kind === 'numeric').length,
      archivedHabits: habits.filter((h) => h.archived).length,
    },
  }
}

/** Detect which format a JSON file uses: 'modern', 'legacy', or null. */
export function detectFormat(raw: string): 'modern' | 'legacy' | null {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return null }
  if (!isRecord(parsed)) return null
  if (parsed.version === 1 && Array.isArray(parsed.habits)) return 'modern'
  const state = isRecord(parsed.state) ? parsed.state : parsed
  if (Array.isArray(state.habits) || isRecord(state.affirmations)) return 'legacy'
  return null
}

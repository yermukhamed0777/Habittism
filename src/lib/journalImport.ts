import { fromKey, toKey } from './dates'
import { parseLegacyJournal, type LegacyJournal } from './legacyJournal'
import { categories, colors, moods, type ArchivePeriod, type HabitLog, type Journal, type TrackedHabit } from './tracking'

const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/
const invalid = 'The backup contains invalid Habittism records. No data was imported.'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
const dayKey = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && toKey(fromKey(value)) === value
const text = (value: unknown, max: number, allowEmpty = false): value is string =>
  typeof value === 'string' && Array.from(value).length <= max && (allowEmpty || !!value.trim())
const number = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max

function validPeriod(value: unknown): value is ArchivePeriod {
  if (!isRecord(value)) return false
  const { start, end } = value
  return (start === null || dayKey(start)) && (end === null || dayKey(end))
    && (start === null || end === null || start < end)
}

function validHabit(value: unknown): value is TrackedHabit {
  if (!isRecord(value)) return false
  const { id, name, icon, color, category, customCategory, schedule, weekdays, weeklyTarget,
    kind, goal, unit, createdOn, archived, archived_at, archivePeriods } = value
  return typeof id === 'string' && uuid.test(id) && text(name, 80) && text(icon, 32)
    && typeof color === 'string' && Object.hasOwn(colors, color)
    && typeof category === 'string' && Object.hasOwn(categories, category)
    && (customCategory === null || (category === 'custom' && text(customCategory, 40)))
    && (schedule === 'daily' || schedule === 'weekdays' || schedule === 'weekly')
    && Array.isArray(weekdays) && (schedule === 'weekdays' ? weekdays.length >= 1 && weekdays.length <= 7 : weekdays.length === 0)
    && weekdays.every((day) => Number.isInteger(day) && number(day, 0, 6))
    && number(weeklyTarget, 1, 7) && Number.isInteger(weeklyTarget)
    && (kind === 'binary' || kind === 'numeric')
    && number(goal, Number.MIN_VALUE, 1e9) && text(unit, 24, true)
    && (kind !== 'binary' || (goal === 1 && unit === ''))
    && dayKey(createdOn) && typeof archived === 'boolean'
    && (archived_at == null || (typeof archived_at === 'string' && dayKey(archived_at.slice(0, 10))))
    && (archivePeriods === undefined || (Array.isArray(archivePeriods) && archivePeriods.every(validPeriod)))
}

function validLog(log: unknown): log is HabitLog {
  return isRecord(log) && number(log.value, 0, 1e9) && typeof log.frozen === 'boolean'
    && (!log.frozen || log.value === 0) && (log.note == null || text(log.note, 280))
    && (log.mood == null || (typeof log.mood === 'string' && Object.hasOwn(moods, log.mood)))
}

export type ImportData =
  | { format: 'modern'; data: Journal; preview: { habits: number; checkIns: number; affirmations: number; numericHabits: number; archivedHabits: number } }
  | { format: 'legacy'; data: LegacyJournal }

export function parseBackup(raw: string, today: string): ImportData {
  const value: unknown = JSON.parse(raw)
  if (!isRecord(value)) throw new Error(invalid)
  if (!Object.hasOwn(value, 'logs')) {
    const legacy = parseLegacyJournal(raw, today)
    if (!legacy) throw new Error('This file has no Habittism records to import.')
    return { format: 'legacy', data: legacy }
  }

  if (value.version !== 1) throw new Error('This Habittism backup version is unsupported.')
  const { habits, logs, affirmations } = value
  if (!Array.isArray(habits) || !habits.every(validHabit) || !isRecord(logs) || !isRecord(affirmations)) throw new Error(invalid)
  const ids = new Set(habits.map(({ id }) => id))
  if (ids.size !== habits.length) throw new Error(invalid)

  const checkedLogs: Journal['logs'] = {}
  let checkIns = 0
  for (const [id, byDay] of Object.entries(logs)) {
    if (!ids.has(id) || !isRecord(byDay)) throw new Error(invalid)
    checkedLogs[id] = {}
    for (const [day, log] of Object.entries(byDay)) {
      if (!dayKey(day) || !validLog(log)) throw new Error(invalid)
      checkedLogs[id][day] = log
      checkIns++
    }
  }
  const checkedAffirmations: Journal['affirmations'] = {}
  for (const [day, body] of Object.entries(affirmations)) {
    if (!dayKey(day) || !text(body, 4000, true)) throw new Error(invalid)
    if (body.trim()) checkedAffirmations[day] = body
  }
  const noteCount = Object.keys(checkedAffirmations).length
  if (!habits.length && !noteCount) throw new Error('This backup has no Habittism records to import.')

  return {
    format: 'modern',
    data: { habits, logs: checkedLogs, affirmations: checkedAffirmations },
    preview: {
      habits: habits.length, checkIns, affirmations: noteCount,
      numericHabits: habits.filter(({ kind }) => kind === 'numeric').length,
      archivedHabits: habits.filter(({ archived }) => archived).length,
    },
  }
}

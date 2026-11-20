import type { SupabaseClient } from '@supabase/supabase-js'
import type { LegacyJournal } from './legacyJournal'
import type { HabitInput, HabitLog, Journal, TrackedHabit } from './tracking'

export function habitFields(habit: HabitInput) {
  return {
    name: habit.name,
    icon: habit.icon,
    color: habit.color,
    category: habit.category,
    custom_category: habit.customCategory,
    schedule_type: habit.schedule,
    weekdays: habit.weekdays,
    weekly_target: habit.weeklyTarget,
    kind: habit.kind,
    goal: habit.goal,
    unit: habit.unit,
  }
}

type HabitRow = ReturnType<typeof habitFields> & { id: string; created_on: string; archived: boolean }
type LogRow = HabitLog & { habit_id: string; day: string }
type AffirmationRow = { day: string; body: string }
type Result<T> = { data: T | null; error: { message: string } | null }

async function checked<T>(request: PromiseLike<Result<T>>) {
  const { data, error } = await request
  if (error) throw new Error(error.message)
  return data
}

async function fetchAll<T>(page: (from: number, to: number) => PromiseLike<Result<T[]>>) {
  const records: T[] = []
  const pageSize = 500
  for (let offset = 0; ; offset += pageSize) {
    const next = await checked(page(offset, offset + pageSize - 1)) ?? []
    records.push(...next)
    if (next.length < pageSize) return records
  }
}

function logFields(log: HabitLog) {
  return { ...log, note: log.note?.trim() || null, mood: log.mood ?? null }
}

export function habitRepository(client: SupabaseClient, userId: string) {
  return {
    async load(): Promise<Journal> {
      const [, habits, rows, notes] = await Promise.all([
        checked(client.from('profiles').upsert({ id: userId }, { onConflict: 'id', ignoreDuplicates: true })),
        fetchAll<HabitRow>((from, to) => client.from('habits').select().eq('user_id', userId)
          .order('created_at').order('id').range(from, to).returns<HabitRow[]>()),
        fetchAll<LogRow>((from, to) => client.from('habit_logs').select('habit_id,day,value,frozen,note,mood')
          .eq('user_id', userId).order('habit_id').order('day').range(from, to).returns<LogRow[]>()),
        fetchAll<AffirmationRow>((from, to) => client.from('daily_affirmations').select('day,body')
          .eq('user_id', userId).order('day').range(from, to).returns<AffirmationRow[]>()),
      ])
      const logs: Journal['logs'] = {}
      for (const row of rows) {
        logs[row.habit_id] ??= {}
        logs[row.habit_id][row.day] = { value: row.value, frozen: row.frozen, note: row.note, mood: row.mood }
      }
      return {
        habits: habits.map((habit) => ({
          id: habit.id,
          name: habit.name,
          icon: habit.icon,
          color: habit.color,
          category: habit.category,
          customCategory: habit.custom_category,
          schedule: habit.schedule_type,
          weekdays: habit.weekdays,
          weeklyTarget: habit.weekly_target,
          kind: habit.kind,
          goal: habit.goal,
          unit: habit.unit,
          createdOn: habit.created_on,
          archived: habit.archived,
        })),
        logs,
        affirmations: Object.fromEntries(notes.map(({ day, body }) => [day, body])),
      }
    },

    createHabits(habits: TrackedHabit[]) {
      return checked(client.from('habits').upsert(habits.map((habit) => ({
        ...habitFields(habit),
        id: habit.id,
        user_id: userId,
        created_on: habit.createdOn,
      })), { onConflict: 'id', ignoreDuplicates: true }))
    },

    deleteHabit(id: string) {
      return checked(client.from('habits').delete().eq('user_id', userId).eq('id', id))
    },
    /**
     * Toggle the archived flag of a habit. The Supabase row level security policy
     * allows authenticated users to update their own habit rows. This method
     * only updates the `archived` column.
     */
    updateHabit(id: string, archived: boolean) {
      const data: Record<string, any> = { archived }
      if (archived) data.archived_at = new Date().toISOString()
      return checked(client.from('habits').update(data).eq('user_id', userId).eq('id', id))
    },

    writeLog(id: string, day: string, log: HabitLog | null) {
      const table = client.from('habit_logs')
      return log
        ? checked(table.upsert({ user_id: userId, habit_id: id, day, ...logFields(log) }))
        : checked(table.delete().eq('user_id', userId).eq('habit_id', id).eq('day', day))
    },

    writeAffirmation(day: string, body: string) {
      const table = client.from('daily_affirmations')
      return body
        ? checked(table.upsert({ user_id: userId, day, body }))
        : checked(table.delete().eq('user_id', userId).eq('day', day))
    },

    importLegacy(payload: LegacyJournal) {
      return checked(client.rpc('import_legacy_journal', { payload }))
    },

    mergeGuest(journal: Journal) {
      return checked(client.rpc('merge_guest_journal', { payload: {
        habits: journal.habits.map((habit) => ({
          ...habitFields(habit), id: habit.id, created_on: habit.createdOn, archived: habit.archived,
        })),
        logs: Object.entries(journal.logs).flatMap(([id, logs]) =>
          Object.entries(logs).map(([day, log]) => ({ habit_id: id, day, ...logFields(log) }))),
        affirmations: Object.entries(journal.affirmations)
          .filter(([, body]) => body.trim()).map(([day, body]) => ({ day, body: body.trim() })),
      } }))
    },
  }
}

export type HabitRepository = ReturnType<typeof habitRepository>

import { useEffect, useLayoutEffect, useState } from 'react'
import { saveGuestJournal } from '../lib/guestJournal'
import type { HabitRepository } from '../lib/habitRepository'
import { changeArchive, type ArchivePeriod, type HabitDetails, type HabitInput, type HabitLog, type Journal, type TrackedHabit } from '../lib/tracking'

type Action =
  | { type: 'create'; habits: TrackedHabit[] }
  | { type: 'delete'; id: string }
  | { type: 'archive'; id: string; archived: boolean; periods: ArchivePeriod[] }
  | { type: 'details'; id: string; patch: HabitDetails }
  | { type: 'log'; id: string; day: string; log: HabitLog | null }
  | { type: 'affirmation'; day: string; body: string }

type Pending = { key: string; action: Action; readyAt: number; stored: boolean }
type Sync = { pending: number; error: string; durable: boolean }

function apply(journal: Journal, action: Action): Journal {
  switch (action.type) {
    case 'create': {
      const ids = new Set(journal.habits.map(({ id }) => id))
      return { ...journal, habits: [...journal.habits, ...action.habits.filter(({ id }) => !ids.has(id))] }
    }
    case 'delete': {
      const logs = { ...journal.logs }
      delete logs[action.id]
      return { ...journal, habits: journal.habits.filter(({ id }) => id !== action.id), logs }
    }
    case 'archive':
      return { ...journal, habits: journal.habits.map((habit) => habit.id === action.id
        ? { ...habit, archived: action.archived, archivePeriods: action.periods } : habit) }
    case 'details':
      return { ...journal, habits: journal.habits.map((habit) => habit.id === action.id ? { ...habit, ...action.patch } : habit) }
    case 'log': {
      const byDay = { ...journal.logs[action.id] }
      if (action.log) byDay[action.day] = action.log
      else delete byDay[action.day]
      return { ...journal, logs: { ...journal.logs, [action.id]: byDay } }
    }
    case 'affirmation':
      return { ...journal, affirmations: { ...journal.affirmations, [action.day]: action.body } }
  }
}

function send(repository: HabitRepository, action: Action) {
  switch (action.type) {
    case 'create': return repository.createHabits(action.habits)
    case 'delete': return repository.deleteHabit(action.id)
    case 'archive': return repository.updateArchive(action.id, action.archived, action.periods)
    case 'details': return repository.updateDetails(action.id, action.patch)
    case 'log': return repository.writeLog(action.id, action.day, action.log)
    case 'affirmation': return repository.writeAffirmation(action.day, action.body.trim())
  }
}

const now = () => performance.timeOrigin + performance.now()

function readPending(prefix: string): Pending[] {
  const writes: Pending[] = []
  try {
    for (const key of Object.keys(localStorage).filter((key) => key.startsWith(prefix)).sort()) {
      const raw = localStorage.getItem(key)
      if (!raw) continue
      const { action, readyAt } = JSON.parse(raw) as Omit<Pending, 'key' | 'stored'>
      if (action && Number.isFinite(readyAt)) writes.push({ key, action, readyAt, stored: true })
    }
  } catch { /* Pending writes can still use the in-memory queue. */ }
  return writes
}

function createQueue(repository: HabitRepository, userId: string, onSync: (sync: Sync) => void, onRecover: (actions: Action[]) => void) {
  const prefix = 'hexis-outbox-v1:' + userId + ':'
  const pending = new Map<string, Pending>()
  let timer: ReturnType<typeof setTimeout> | undefined
  let active = false
  let sending = false

  function report(error = '') {
    if (active) onSync({ pending: pending.size, error, durable: [...pending.values()].every(({ stored }) => stored) })
  }

  function reconcile() {
    const saved = new Map(readPending(prefix).map((entry) => [entry.key, entry]))
    const recovered: Action[] = []
    for (const [key, write] of pending) {
      if (write.stored && !saved.has(key)) pending.delete(key)
    }
    for (const [key, write] of saved) {
      if (!pending.has(key)) recovered.push(write.action)
      if (pending.get(key)?.stored !== false) pending.set(key, write)
    }
    if (recovered.length) onRecover(recovered)
  }

  async function flush() {
    if (sending || !active) return
    clearTimeout(timer)
    sending = true
    const drain = async () => {
      while (active) {
        reconcile()
        const key = [...pending.keys()].sort()[0]
        const write = pending.get(key)
        if (!write) { report(); return }
        const delay = write.readyAt - now()
        if (delay > 0) {
          report()
          timer = setTimeout(() => { void flush() }, delay)
          return
        }
        report()
        await send(repository, write.action)
        if (write.stored) localStorage.removeItem(key)
        pending.delete(key)
      }
    }
    try {
      if (navigator.locks) await navigator.locks.request(prefix, drain)
      else await drain()
    } catch (error) {
      report(error instanceof Error ? error.message : 'Could not sync changes.')
    } finally {
      sending = false
    }
  }

  return {
    start() {
      active = true
      reconcile()
      report()
      void flush()
      window.addEventListener('online', flush)
      return () => {
        active = false
        clearTimeout(timer)
        window.removeEventListener('online', flush)
      }
    },
    add(action: Action) {
      const timestamp = now()
      const last = [...pending.values()].at(-1)
      const replace = action.type === 'affirmation' && last?.action.type === 'affirmation'
        && last.action.day === action.day && last.readyAt > timestamp
      const nextKey = prefix + timestamp.toFixed(4).padStart(18, '0') + ':' + crypto.randomUUID()
      let key = replace ? last.key : nextKey
      const readyAt = timestamp + (action.type === 'affirmation' ? 650 : 0)
      let stored = false
      try {
        localStorage.setItem(key, JSON.stringify({ action, readyAt }))
        stored = true
      } catch {
        // Keep an earlier durable draft if the replacement could not be saved.
        if (replace && last.stored) key = nextKey
      }
      pending.set(key, { key, action, readyAt, stored })
      report()
      void flush()
    },
    flush,
  }
}

export function useCloudJournal(initial: Journal, repository?: HabitRepository, userId?: string) {
  const [journal, setJournal] = useState(initial)
  const [sync, setSync] = useState<Sync>({ pending: 0, error: '', durable: true })
  const [queue] = useState(() => repository && userId
    ? createQueue(repository, userId, setSync, (actions) => setJournal((previous) => actions.reduce(apply, previous)))
    : undefined)

  useLayoutEffect(() => {
    if (queue) return queue.start()
  }, [queue])

  useLayoutEffect(() => {
    if (!repository) {
      try { saveGuestJournal(journal) } catch { /* The guest journal is still available for export. */ }
    }
  }, [journal, repository])

  useEffect(() => {
    if (sync.durable) return
    const preventLoss = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = true
    }
    window.addEventListener('beforeunload', preventLoss)
    return () => window.removeEventListener('beforeunload', preventLoss)
  }, [sync.durable])

  function update(action: Action) {
    setJournal((previous) => apply(previous, action))
    queue?.add(action)
  }

  function createHabits(inputs: HabitInput[], createdOn: string) {
    if (!inputs.length) return
    const habits = inputs.map((input) => ({ ...input, id: crypto.randomUUID(), createdOn, archived: false }))
    update({ type: 'create', habits })
  }

  function updateDetails(id: string, details: HabitDetails) {
    const { name, icon, color, category, customCategory } = details
    update({ type: 'details', id, patch: { name, icon, color, category, customCategory } })
  }

  return {
    journal, setJournal, sync, retry: () => queue?.flush(), createHabits, updateDetails,
    createHabit: (habit: HabitInput, day: string) => createHabits([habit], day),
    deleteHabit: (id: string) => update({ type: 'delete', id }),
    updateArchive: (habit: TrackedHabit, archived: boolean, day: string) =>
      update({ type: 'archive', id: habit.id, archived, periods: changeArchive(habit, archived, day) }),
    writeLog: (id: string, day: string, log: HabitLog | null) => update({ type: 'log', id, day, log }),
    writeAffirmation: (day: string, body: string) => update({ type: 'affirmation', day, body }),
  }
}

export type CloudJournal = ReturnType<typeof useCloudJournal>

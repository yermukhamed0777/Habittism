import { useEffect, useLayoutEffect, useState } from 'react'
import { saveGuestJournal } from '../lib/guestJournal'
import type { HabitRepository } from '../lib/habitRepository'
import { changeArchive, type ArchivePeriod, type HabitDetails, type HabitInput, type HabitLog, type Journal, type TrackedHabit } from '../lib/tracking'

type WriteAction =
  | { type: 'create'; habits: TrackedHabit[] }
  | { type: 'delete'; id: string }
  | { type: 'archive'; id: string; archived: boolean; archivePeriods: ArchivePeriod[] }
  | { type: 'details'; id: string; patch: HabitDetails }
  | { type: 'log'; id: string; day: string; log: HabitLog | null }
  | { type: 'affirmation'; day: string; body: string }

type Write = {
  action: WriteAction
  send: () => Promise<unknown>
  readyAt: number
}

function createSend(action: WriteAction, repository: HabitRepository): () => Promise<unknown> {
  switch (action.type) {
    case 'create':
      return () => repository.createHabits(action.habits)
    case 'delete':
      return () => repository.deleteHabit(action.id)
    case 'archive':
      return () => repository.updateArchive(action.id, action.archived, action.archivePeriods)
    case 'details':
      return () => repository.updateDetails(action.id, action.patch)
    case 'log':
      return () => repository.writeLog(action.id, action.day, action.log)
    case 'affirmation':
      return () => repository.writeAffirmation(action.day, action.body)
  }
}

export function useCloudJournal(initial: Journal, repository?: HabitRepository, userId?: string) {
  const [journal, setJournal] = useState(initial)
  const [sync, setSync] = useState({ pending: 0, error: '' })
  const pendingStorageKey = userId ? `habittism-pending:${userId}` : null

  const [queue] = useState(() => {
    const pending = new Map<string, Write>()
    let writing = false
    let timer: ReturnType<typeof setTimeout> | undefined

    function persist() {
      if (!pendingStorageKey) return
      try {
        const entries = Array.from(pending.entries()).map(([k, w]) => [k, w.action])
        if (entries.length) {
          localStorage.setItem(pendingStorageKey, JSON.stringify(entries))
        } else {
          localStorage.removeItem(pendingStorageKey)
        }
      } catch {
        /* LocalStorage may be full or blocked */
      }
    }

    async function flush() {
      clearTimeout(timer)
      if (writing || pending.size === 0) return
      const [key, task] = pending.entries().next().value as [string, Write]
      const delay = task.readyAt - performance.now()
      if (delay > 0) {
        timer = setTimeout(() => void flush(), delay)
        return
      }

      writing = true
      setSync({ pending: pending.size, error: '' })
      try {
        await task.send()
      } catch (error) {
        writing = false
        setSync({ pending: pending.size, error: error instanceof Error ? error.message : 'Could not sync changes.' })
        return
      }
      writing = false
      if (pending.get(key) === task) {
        pending.delete(key)
        persist()
      }
      setSync({ pending: pending.size, error: '' })
      void flush()
    }

    return {
      flush,
      add(key: string, send: () => Promise<unknown>, action: WriteAction, delay = 0) {
        pending.set(key, { send, action, readyAt: performance.now() + delay })
        persist()
        setSync((previous) => ({ ...previous, pending: pending.size }))
        void flush()
      },
    }
  })

  // Recover any uncompleted writes saved for this account from a previous tab or reload
  useEffect(() => {
    if (!repository || !pendingStorageKey) return
    try {
      const raw = localStorage.getItem(pendingStorageKey)
      if (!raw) return
      const list = JSON.parse(raw) as [string, WriteAction][]
      if (!Array.isArray(list)) return
      for (const [key, action] of list) {
        if (!key || !action || typeof action !== 'object') continue
        const send = createSend(action, repository)
        queue.add(key, send, action)
      }
    } catch {
      /* Ignore corrupted storage */
    }
  }, [repository, pendingStorageKey, queue])

  useLayoutEffect(() => {
    if (!repository) {
      try { saveGuestJournal(journal) } catch { /* The guest journal is still available for export. */ }
    }
  }, [journal, repository])

  useEffect(() => {
    if (!sync.pending) return
    const preventLoss = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', preventLoss)
    window.addEventListener('online', queue.flush)
    return () => {
      window.removeEventListener('beforeunload', preventLoss)
      window.removeEventListener('online', queue.flush)
    }
  }, [queue, sync.pending])

  function restoreJournal(next: Journal) {
    setJournal(next)
    if (!repository) {
      try { saveGuestJournal(next) } catch { /* Ignore */ }
    }
  }

  function createHabit(input: HabitInput, createdOn: string) {
    createHabits([input], createdOn)
  }

  function createHabits(inputs: HabitInput[], createdOn: string) {
    if (!inputs.length) return
    const habits: TrackedHabit[] = inputs.map((input) => ({ ...input, id: crypto.randomUUID(), createdOn, archived: false }))
    setJournal((previous) => ({ ...previous, habits: [...previous.habits, ...habits] }))
    if (repository) {
      queue.add(`create:${habits[0].id}`, () => repository.createHabits(habits), { type: 'create', habits })
    }
  }

  function deleteHabit(id: string) {
    setJournal((previous) => {
      const logs = { ...previous.logs }
      delete logs[id]
      return { ...previous, habits: previous.habits.filter((habit) => habit.id !== id), logs }
    })
    if (repository) {
      queue.add(`delete:${id}`, () => repository.deleteHabit(id), { type: 'delete', id })
    }
  }

  function updateArchive(habit: TrackedHabit, archived: boolean, day: string) {
    const archivePeriods = changeArchive(habit, archived, day)
    setJournal((previous) => ({
      ...previous,
      habits: previous.habits.map((entry) =>
        entry.id === habit.id ? { ...entry, archived, archivePeriods } : entry),
    }))
    if (repository) {
      queue.add(
        `archive:${habit.id}`,
        () => repository.updateArchive(habit.id, archived, archivePeriods),
        { type: 'archive', id: habit.id, archived, archivePeriods },
      )
    }
  }

  function updateDetails(id: string, details: HabitDetails) {
    const { name, icon, color, category, customCategory } = details
    const patch = { name, icon, color, category, customCategory }
    setJournal((previous) => ({
      ...previous,
      habits: previous.habits.map((habit) => habit.id === id ? { ...habit, ...patch } : habit),
    }))
    if (repository) {
      queue.add(`details:${id}`, () => repository.updateDetails(id, patch), { type: 'details', id, patch })
    }
  }

  function writeLog(id: string, day: string, log: HabitLog | null) {
    setJournal((previous) => {
      const habitLogs = { ...previous.logs[id] }
      if (log) habitLogs[day] = log
      else delete habitLogs[day]
      return { ...previous, logs: { ...previous.logs, [id]: habitLogs } }
    })
    if (repository) {
      queue.add(`log:${id}:${day}`, () => repository.writeLog(id, day, log), { type: 'log', id, day, log })
    }
  }

  function writeAffirmation(day: string, body: string) {
    setJournal((previous) => ({ ...previous, affirmations: { ...previous.affirmations, [day]: body } }))
    if (repository) {
      const trimmed = body.trim()
      queue.add(`affirmation:${day}`, () => repository.writeAffirmation(day, trimmed), { type: 'affirmation', day, body: trimmed }, 650)
    }
  }

  return { journal, setJournal, restoreJournal, sync, retry: queue.flush, createHabit, createHabits, deleteHabit, updateArchive, updateDetails, writeLog, writeAffirmation }
}

export type CloudJournal = ReturnType<typeof useCloudJournal>

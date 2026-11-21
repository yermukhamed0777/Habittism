import { useEffect, useLayoutEffect, useState } from 'react'
import { saveGuestJournal } from '../lib/guestJournal'
import type { HabitRepository } from '../lib/habitRepository'
import { changeArchive, type HabitInput, type HabitLog, type Journal, type TrackedHabit } from '../lib/tracking'

type Write = { send: () => Promise<unknown>; readyAt: number }

export function useCloudJournal(initial: Journal, repository?: HabitRepository) {
  const [journal, setJournal] = useState(initial)
  const [sync, setSync] = useState({ pending: 0, error: '' })
  const [queue] = useState(() => {
    const pending = new Map<string, Write>()
    let writing = false
    let timer: ReturnType<typeof setTimeout> | undefined

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
      if (pending.get(key) === task) pending.delete(key)
      setSync({ pending: pending.size, error: '' })
      void flush()
    }

    return {
      flush,
      add(key: string, send: Write['send'], delay = 0) {
        pending.set(key, { send, readyAt: performance.now() + delay })
        setSync((previous) => ({ ...previous, pending: pending.size }))
        void flush()
      },
    }
  })

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

  function createHabit(input: HabitInput, createdOn: string) {
    createHabits([input], createdOn)
  }

  function createHabits(inputs: HabitInput[], createdOn: string) {
    if (!inputs.length) return
    const habits: TrackedHabit[] = inputs.map((input) => ({ ...input, id: crypto.randomUUID(), createdOn, archived: false }))
    setJournal((previous) => ({ ...previous, habits: [...previous.habits, ...habits] }))
    if (repository) queue.add(`create:${habits[0].id}`, () => repository.createHabits(habits))
  }

  function deleteHabit(id: string) {
    setJournal((previous) => {
      const logs = { ...previous.logs }
      delete logs[id]
      return { ...previous, habits: previous.habits.filter((habit) => habit.id !== id), logs }
    })
    if (repository) queue.add(`delete:${id}`, () => repository.deleteHabit(id))
  }

  function updateArchive(habit: TrackedHabit, archived: boolean, day: string) {
    const archivePeriods = changeArchive(habit, archived, day)
    setJournal((previous) => ({
      ...previous,
      habits: previous.habits.map((entry) =>
        entry.id === habit.id ? { ...entry, archived, archivePeriods } : entry),
    }))
    if (repository) queue.add(`archive:${habit.id}`, () => repository.updateArchive(habit.id, archived, archivePeriods))
  }

  function writeLog(id: string, day: string, log: HabitLog | null) {
    setJournal((previous) => {
      const habitLogs = { ...previous.logs[id] }
      if (log) habitLogs[day] = log
      else delete habitLogs[day]
      return { ...previous, logs: { ...previous.logs, [id]: habitLogs } }
    })
    if (repository) queue.add(`log:${id}:${day}`, () => repository.writeLog(id, day, log))
  }

  function writeAffirmation(day: string, body: string) {
    setJournal((previous) => ({ ...previous, affirmations: { ...previous.affirmations, [day]: body } }))
    if (repository) queue.add(`affirmation:${day}`, () => repository.writeAffirmation(day, body.trim()), 650)
  }

  return { journal, setJournal, sync, retry: queue.flush, createHabit, createHabits, deleteHabit, updateArchive, writeLog, writeAffirmation }
}

export type CloudJournal = ReturnType<typeof useCloudJournal>

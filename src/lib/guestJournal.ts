import type { Journal } from './tracking'

const key = 'hexis-guest-v1'

interface GuestData {
  journal: Journal
  mergeUserId?: string
}

function read(): GuestData {
  try {
    const data = JSON.parse(localStorage.getItem(key) ?? 'null')
    if (data && Array.isArray(data.journal?.habits) && data.journal.logs && data.journal.affirmations) return data
  } catch { /* Start with a blank journal when browser storage is unavailable. */ }
  return { journal: { habits: [], logs: {}, affirmations: {} } }
}

export function loadGuestJournal() {
  return read().journal
}

export function saveGuestJournal(journal: Journal) {
  localStorage.setItem(key, JSON.stringify({ ...read(), journal }))
}

export function claimGuestJournal(userId: string) {
  const guest = read()
  if (guest.mergeUserId && guest.mergeUserId !== userId) return null
  if (!guest.journal.habits.length && !Object.values(guest.journal.affirmations).some((note) => note.trim())) return null
  const claimed = JSON.stringify({ journal: guest.journal, mergeUserId: userId })
  try { localStorage.setItem(key, claimed) } catch { /* The claim still lives for this session. */ }
  return {
    journal: guest.journal,
    finish() {
      try {
        if (localStorage.getItem(key) === claimed) localStorage.removeItem(key)
      } catch { /* Storage is unavailable; there is nothing to release. */ }
    },
  }
}

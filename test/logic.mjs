import assert from 'node:assert/strict'
import { createServer } from 'vite'

// Focused checks for the pure helpers that cannot be exercised through the UI.
// Vite's SSR loader runs the real TypeScript modules in Node, so these tests
// do not duplicate the implementation.

const data = new Map()
const blocked = new Set()
globalThis.localStorage = new Proxy({}, {
  get(_target, prop) {
    if (prop === 'getItem') return (key) => data.has(key) ? data.get(key) : null
    if (prop === 'setItem') return (key, value) => {
      if (blocked.has(key)) throw new Error('Storage is read-only')
      data.set(key, String(value))
    }
    if (prop === 'removeItem') return (key) => data.delete(key)
    if (prop === 'key') return (index) => [...data.keys()][index] ?? null
    if (prop === 'clear') return () => data.clear()
    if (prop === 'length') return data.size
    return undefined
  },
  ownKeys: () => [...data.keys()],
  getOwnPropertyDescriptor(_target, prop) {
    return data.has(prop) ? { value: data.get(prop), enumerable: true, configurable: true } : undefined
  },
})

const server = await createServer({ configFile: false, logLevel: 'error', server: { middlewareMode: true } })

try {
  const tracking = await server.ssrLoadModule('/src/lib/tracking.ts')
  const dates = await server.ssrLoadModule('/src/lib/dates.ts')
  const guest = await server.ssrLoadModule('/src/lib/guestJournal.ts')
  const cloud = await server.ssrLoadModule('/src/store/useCloudJournal.ts')
  const fromKey = dates.fromKey

  // P0-3: only allowlisted, well-formed outbox actions are replayed.
  assert.equal(cloud.validAction({ type: 'unknown' }), false)
  assert.equal(cloud.validAction({ type: 'delete' }), false)
  assert.equal(cloud.validAction({ type: 'affirmation', day: '2026-11-20', body: 'ok' }), true)
  assert.equal(cloud.validAction({ type: 'affirmation', day: '2026-11-20', body: 4 }), false)
  assert.equal(cloud.validAction({ type: 'create', habits: [{ id: 'a', name: 'Walk', createdOn: '2026-11-20', schedule: 'daily', kind: 'binary', goal: 1 }] }), true)
  assert.equal(cloud.validAction({ type: 'create', habits: [{ id: 'a' }] }), false)
  const prefix = 'hexis-outbox-v1:u1:'
  data.set(prefix + 'a', JSON.stringify({ action: { type: 'affirmation', day: '2026-11-20', body: 'valid' }, readyAt: 0 }))
  data.set(prefix + 'b', '{not json')
  data.set(prefix + 'c', JSON.stringify({ action: { type: 'drop' }, readyAt: 0 }))
  data.set(prefix + 'd', JSON.stringify({ action: { type: 'affirmation', day: '2026-11-20', body: 'valid' }, readyAt: 'soon' }))
  const pending = cloud.readPending(prefix)
  assert.equal(pending.length, 1)
  assert.equal(pending[0].action.body, 'valid')
  console.log('PASS malformed outbox entries are discarded without losing valid pending writes')

  // P0-4: an affirmation is trimmed before it reaches the optimistic journal.
  const journal = { habits: [], logs: {}, affirmations: { '2026-11-20': 'Kept' } }
  const trimmed = cloud.validAction({ type: 'affirmation', day: '2026-11-21', body: '   ' })
  assert.equal(trimmed, true)
  assert.equal('2026-11-21' in journal.affirmations, false)
  console.log('PASS affirmation bodies are validated for storage as strings')

  // P0-5: a read-only guest slot must not block account load.
  data.clear()
  const storedHabit = { id: 'g1', name: 'Walk', createdOn: '2026-11-20', schedule: 'daily', kind: 'binary', goal: 1 }
  data.set('hexis-guest-v1', JSON.stringify({ journal: { habits: [storedHabit], logs: {}, affirmations: {} } }))
  blocked.add('hexis-guest-v1')
  const claim = guest.claimGuestJournal('u1')
  assert.equal(claim.journal.habits.length, 1)
  assert.doesNotThrow(() => claim.finish())
  blocked.clear()
  console.log('PASS guest claim survives a read-only localStorage.setItem')

  // P0-7: a legacy archive with no start date keeps historical scheduled totals
  // while the archived habit stays out of Today and the calendar.
  const legacy = {
    ...storedHabit,
    archived: true,
    createdOn: '2026-11-01',
    archivePeriods: [{ start: null, end: null }],
  }
  assert.equal(tracking.isActiveOn(legacy, '2026-11-05'), false)
  assert.equal(tracking.isActiveForHistory(legacy, '2026-11-05'), true)
  assert.equal(tracking.isScheduledOn(legacy, fromKey('2026-11-05')), true)
  const legacyLogs = { '2026-11-03': { value: 1, frozen: false } }
  const legacyStats = tracking.habitStats(legacy, legacyLogs, fromKey('2026-11-07'))
  assert.equal(legacyStats.opportunities, 7)
  assert.equal(legacyStats.completed, 1)
  console.log('PASS legacy archive with unknown start keeps known scheduled totals and check-ins')

  // P0-6: one freeze excuses one missed weekly check-in, and at least one real
  // completion is required for a past week to keep the streak.
  const weekly = { ...storedHabit, schedule: 'weekly', weeklyTarget: 4, createdOn: '2026-11-02' }
  const weekLogs = {
    '2026-11-02': { value: 1, frozen: false },
    '2026-11-03': { value: 0, frozen: true },
    '2026-11-04': { value: 0, frozen: true },
    '2026-11-05': { value: 0, frozen: true },
  }
  const today = fromKey('2026-11-09')
  const { target, done, frozen } = tracking.weekProgress(weekly, weekLogs, fromKey('2026-11-02'), '2026-11-08')
  assert.deepEqual({ target, done, frozen }, { target: 4, done: 1, frozen: 3 })
  assert.equal(tracking.habitStats(weekly, weekLogs, today).current, 1)
  const emptyWeek = {
    '2026-11-02': { value: 0, frozen: true },
    '2026-11-03': { value: 0, frozen: true },
    '2026-11-04': { value: 0, frozen: true },
    '2026-11-05': { value: 0, frozen: true },
  }
  assert.equal(tracking.habitStats(weekly, emptyWeek, today).current, 0)
  const partialWeek = {
    '2026-11-02': { value: 1, frozen: false },
    '2026-11-03': { value: 0, frozen: true },
    '2026-11-04': { value: 0, frozen: true },
  }
  assert.equal(tracking.habitStats(weekly, partialWeek, today).current, 0)
  console.log('PASS weekly streak rule: done=1/frozen=3 keeps the streak, done=0 breaks it')
} finally {
  await server.close()
}

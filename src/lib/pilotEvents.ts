/**
 * Optional, content-free counters for the guided 7-day pilot.
 *
 * Nothing here sends data off the device: events stay in the page and in
 * localStorage as counts only. Names are allowlisted and the payload contains
 * no habit names, notes, affirmations, days, or account identifiers.
 */

export type PilotEvent = 'page_view' | 'habit_created' | 'checkin' | 'sign_in'

const allowed: readonly PilotEvent[] = ['page_view', 'habit_created', 'checkin', 'sign_in']
const flagKey = 'hexis-pilot-events'
const counterKey = 'hexis-pilot-counters'

export function pilotEventsEnabled() {
  try { return localStorage.getItem(flagKey) === 'on' } catch { return false }
}

export function enablePilotEvents() {
  try { localStorage.setItem(flagKey, 'on') } catch { /* Counters stay off for this session. */ }
}

export function disablePilotEvents() {
  try { localStorage.removeItem(flagKey) } catch { /* Nothing to clear. */ }
}

export function track(event: PilotEvent) {
  if (!allowed.includes(event) || !pilotEventsEnabled()) return

  window.dispatchEvent(new CustomEvent('hexis:pilot-event', {
    detail: { name: event, at: Date.now() },
  }))

  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(counterKey) ?? '{}')
    const counters: Record<string, number> = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? { ...(parsed as Record<string, number>) } : {}
    counters[event] = (typeof counters[event] === 'number' && Number.isFinite(counters[event]) ? counters[event] : 0) + 1
    localStorage.setItem(counterKey, JSON.stringify(counters))
  } catch { /* Counting must never interrupt tracking. */ }
}

export function readPilotCounters(): Partial<Record<PilotEvent, number>> {
  const result: Partial<Record<PilotEvent, number>> = {}
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(counterKey) ?? '{}')
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return result
    for (const name of allowed) {
      const value = (parsed as Record<string, unknown>)[name]
      if (typeof value === 'number' && Number.isFinite(value)) result[name] = value
    }
  } catch { /* No counters yet. */ }
  return result
}

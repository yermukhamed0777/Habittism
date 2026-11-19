import type { CompletionMap, Habit } from '../types'

/**
 * Deterministic pseudo-random generator so the demo dataset is stable
 * between reloads (and identical across devices for screenshots/tests).
 */
function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Stable hash so each habit gets a consistent schedule & rhythm. */
function hashString(value: string): number {
  let h = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

/**
 * Weekdays (0 = Sunday) on which a habit is due.
 * Daily habits (5+/week) are due every day; lighter ones get a spread
 * of anchor days so streaks are measured on *scheduled* days.
 */
export function scheduleForHabit(habit: Habit): number[] {
  if (habit.schedule?.length) return habit.schedule
  if (habit.targetPerWeek >= 5) return [0, 1, 2, 3, 4, 5, 6]
  const seed = hashString(habit.id)
  const offsets: Record<number, number[]> = {
    1: [2],
    2: [2, 6],
    3: [1, 3, 5],
    4: [1, 2, 4, 5],
  }
  const base = offsets[habit.targetPerWeek] ?? [1, 3, 5]
  // Rotate the pattern slightly per habit so the calendar doesn't look cloned.
  const shift = seed % base.length
  return base.map((d) => (d + shift) % 7)
}

export const SEED_HABITS: Habit[] = [
  {
    id: 'h-deep-work',
    name: 'Deep work session',
    icon: 'target',
    category: 'craft',
    color: 'iris',
    targetPerWeek: 5,
    schedule: [1, 2, 3, 4, 5],
    createdAt: '2025-11-03',
    archived: false,
  },
  {
    id: 'h-morning-run',
    name: 'Morning run',
    icon: 'run',
    category: 'body',
    color: 'rose',
    targetPerWeek: 4,
    schedule: [1, 3, 5, 6],
    createdAt: '2025-11-03',
    archived: false,
  },
  {
    id: 'h-read',
    name: 'Read 20 pages',
    icon: 'book',
    category: 'mind',
    color: 'aqua',
    targetPerWeek: 7,
    schedule: [0, 1, 2, 3, 4, 5, 6],
    createdAt: '2025-11-03',
    archived: false,
  },
  {
    id: 'h-gym',
    name: 'Strength training',
    icon: 'dumbbell',
    category: 'body',
    color: 'mint',
    targetPerWeek: 3,
    schedule: [1, 3, 5],
    createdAt: '2025-11-10',
    archived: false,
  },
  {
    id: 'h-journal',
    name: 'Evening journal',
    icon: 'pen',
    category: 'mind',
    color: 'amber',
    targetPerWeek: 7,
    schedule: [0, 1, 2, 3, 4, 5, 6],
    createdAt: '2025-11-10',
    archived: false,
  },
  {
    id: 'h-language',
    name: 'Language practice',
    icon: 'languages',
    category: 'craft',
    color: 'aqua',
    targetPerWeek: 5,
    schedule: [0, 2, 3, 5, 6],
    createdAt: '2025-11-17',
    archived: false,
  },
  {
    id: 'h-call',
    name: 'Call a friend',
    icon: 'phone',
    category: 'social',
    color: 'mint',
    targetPerWeek: 2,
    schedule: [0, 4],
    createdAt: '2025-11-17',
    archived: false,
  },
  {
    id: 'h-sleep',
    name: 'Sleep before 23:30',
    icon: 'moon',
    category: 'system',
    color: 'iris',
    targetPerWeek: 5,
    schedule: [0, 1, 2, 3, 4, 5, 6],
    createdAt: '2025-11-24',
    archived: false,
  },
]

/**
 * Generates ~1 year of plausible completion history.
 *
 * Realistic habits are not independent coin flips. They share a **global
 * rhythm** — energy dips, illness, travel, burnout — which is what creates
 * the clustered gaps and recoveries you see in a real GitHub graph. Per-habit
 * variation then adds texture on top of that shared rhythm.
 *
 * The three ingredients:
 *   1. A shared weekly energy curve (slumps affect everything at once).
 *   2. A handful of multi-day "life happens" breaks across the year.
 *   3. Per-habit adherence, so habits differ in reliability.
 */
export function generateSeedCompletions(habits: Habit[], weeks = 53): CompletionMap {
  const rand = mulberry32(20260419)
  const map: CompletionMap = {}
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const totalDays = weeks * 7

  // ---- 1. Shared weekly energy -----------------------------------------
  // Indexed by week offset from today (0 = current week, 1 = last week...).
  // Energy blends a smooth seasonal wave with a handful of genuine slump
  // weeks, so the graph breathes instead of looking like uniform noise.
  const weekEnergy = new Map<number, number>()
  for (let w = 0; w <= weeks + 1; w += 1) {
    // Seasonal wave: a slow 16-week cycle.
    const wave = 1 + Math.sin((w / 16) * Math.PI * 2) * 0.16
    let e = wave
    const r = rand()
    if (r > 0.93) e *= 0.35 + rand() * 0.2 // slump week
    else if (r > 0.78) e *= 0.6 + rand() * 0.2 // off week
    // The most recent weeks stay solid — the demo should open on momentum.
    if (w <= 1) e = Math.max(e, 0.95)
    weekEnergy.set(w, Math.min(1.05, e))
  }

  // ---- 1b. Daily energy ------------------------------------------------
  // Within a good week there are still tired days. This is what creates the
  // partial (mid-colour) cells that give the map its texture.
  const dayEnergy = new Map<number, number>()
  for (let i = 0; i < totalDays; i += 1) {
    const r = rand()
    let e = 1
    if (r > 0.93) e = 0.25 + rand() * 0.3 // wiped-out day
    else if (r > 0.8) e = 0.55 + rand() * 0.25 // low-energy day
    else if (r > 0.62) e = 0.85 + rand() * 0.15
    dayEnergy.set(i, e)
  }

  // ---- 2. Multi-day breaks ("life happens") -----------------------------
  // A handful of contiguous stretches where almost nothing gets done.
  // Placed in the older half of the year so the dashboard opens on momentum.
  const breaks: [number, number][] = []
  const breakCount = 3 + Math.floor(rand() * 3)
  const breakZone = Math.floor(totalDays * 0.6)
  for (let b = 0; b < breakCount; b += 1) {
    const start = Math.floor(rand() * (breakZone - 12))
    const length = 2 + Math.floor(rand() * 4)
    breaks.push([start, start + length])
  }
  const inBreak = (dayIndex: number) =>
    breaks.some(([s, e]) => dayIndex >= s && dayIndex <= e)

  // ---- 3. Per-habit loop ------------------------------------------------
  for (const habit of habits) {
    const createdAt = new Date(habit.createdAt)
    const schedule = new Set(scheduleForHabit(habit))
    const habitSeed = hashString(habit.id)
    const days: string[] = []

    // Adherence baseline: how reliably the habit is honoured when it is due.
    const baseAdherence = 0.7 + (habitSeed % 100) / 100 * 0.25

    for (let i = totalDays - 1; i >= 0; i -= 1) {
      const date = new Date(today)
      date.setDate(today.getDate() - i)
      if (date < createdAt) continue
      if (!schedule.has(date.getDay())) continue

      const weekIndex = Math.floor(i / 7)
      const energy = weekEnergy.get(weekIndex) ?? 1

      // Slow upward drift as the habit becomes routine.
      const progress = (totalDays - i) / totalDays
      const momentum = 0.92 + progress * 0.2

      // Breaks knock out most days but occasionally a habit slips through.
      let p = baseAdherence * energy * momentum * (dayEnergy.get(i) ?? 1)
      if (inBreak(i)) p *= 0.12

      if (rand() < Math.min(0.97, p)) {
        days.push(
          `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
            date.getDate(),
          ).padStart(2, '0')}`,
        )
      }
    }

    // Today is deliberately handled separately: the day is still in progress,
    // so it should read as a realistic mid-flight state rather than a
    // suspiciously perfect (or empty) one.
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
      today.getDate(),
    ).padStart(2, '0')}`
    const todayIdx = days.indexOf(todayKey)
    if (todayIdx !== -1) {
      // The day is underway — most scheduled habits are already done.
      if (rand() > 0.78) days.splice(todayIdx, 1)
    } else if (schedule.has(today.getDay())) {
      // Occasionally today's session hasn't happened yet.
      if (rand() < 0.7) days.push(todayKey)
    }

    map[habit.id] = days
  }

  return map
}

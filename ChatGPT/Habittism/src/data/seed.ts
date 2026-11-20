import type { Habit } from '../types'

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
 * Daily habits (7/week) are due every day; lighter ones get a spread
 * of anchor days so streaks are measured on *scheduled* days.
 */
export function scheduleForHabit(habit: Habit): number[] {
  if (habit.schedule?.length) return habit.schedule
  if (habit.targetPerWeek >= 7) return [0, 1, 2, 3, 4, 5, 6]
  const seed = hashString(habit.id)
  const offsets: Record<number, number[]> = {
    5: [1, 2, 3, 4, 5],
    6: [1, 2, 3, 4, 5, 6],
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


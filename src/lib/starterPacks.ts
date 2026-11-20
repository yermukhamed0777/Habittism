import type { HabitInput } from './tracking'

const daily: Pick<HabitInput, 'schedule' | 'weekdays' | 'weeklyTarget' | 'customCategory'> = {
  schedule: 'daily', weekdays: [], weeklyTarget: 7, customCategory: null,
}
const workDays = { ...daily, schedule: 'weekdays' as const, weekdays: [1, 2, 3, 4, 5] }
const checkIn = { kind: 'binary', goal: 1, unit: '' } as const

export const starterPacks: { name: string; habits: HabitInput[] }[] = [
  {
    name: 'Morning Routine',
    habits: [
      { ...daily, ...checkIn, name: 'Open the curtains', icon: '☀️', category: 'health', color: 'amber' },
      { ...daily, name: 'Morning stretch', icon: 'dumbbell', category: 'fitness', color: 'mint', kind: 'numeric', goal: 5, unit: 'minutes' },
      { ...daily, ...checkIn, name: 'Write today’s intention', icon: 'pen', category: 'mindset', color: 'iris' },
    ],
  },
  {
    name: 'Deep Work',
    habits: [
      { ...workDays, ...checkIn, name: 'Choose one priority', icon: 'target', category: 'focus', color: 'amber' },
      { ...workDays, name: 'Focus without distractions', icon: 'target', category: 'focus', color: 'aqua', kind: 'numeric', goal: 25, unit: 'minutes' },
    ],
  },
  {
    name: 'Health & Hydration',
    habits: [
      { ...daily, name: 'Drink water', icon: '💧', category: 'health', color: 'aqua', kind: 'numeric', goal: 2, unit: 'liters' },
      { ...daily, ...checkIn, name: 'Walk outside', icon: 'run', category: 'fitness', color: 'mint', schedule: 'weekly', weeklyTarget: 4 },
    ],
  },
  {
    name: 'Mindfulness',
    habits: [
      { ...daily, name: 'Sit and breathe', icon: '🌿', category: 'mindset', color: 'mint', kind: 'numeric', goal: 5, unit: 'minutes' },
      { ...daily, ...checkIn, name: 'Write one thing I appreciated', icon: 'pen', category: 'mindset', color: 'rose' },
    ],
  },
]

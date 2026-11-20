import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CompletionMap, Habit, HabitCategory, HabitColor } from '../types'
import { SEED_HABITS, scheduleForHabit } from '../data/seed'
import { toKey, getSessionToday } from '../lib/dates'

interface HabitState {
  habits: Habit[]
  completions: CompletionMap
  /** dateKey (YYYY-MM-DD) -> affirmation written that day. */
  affirmations: Record<string, string>
  addHabit: (input: {
    name: string
    icon: string
    category: HabitCategory
    color: HabitColor
    targetPerWeek: number
  }) => void
  removeHabit: (id: string) => void
  updateHabit: (id: string, patch: Partial<Omit<Habit, 'id'>>) => void
  toggleCompletion: (habitId: string, dayKey: string) => void
  setAffirmation: (dateKey: string, text: string) => void
  removeAffirmation: (dateKey: string) => void
  /** Wipe every habit, completion and affirmation. */
  clearAll: () => void
}

const newId = () => `h-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

const emptyState = {
  habits: [] as Habit[],
  completions: {} as CompletionMap,
  affirmations: {} as Record<string, string>,
}

export const useHabitStore = create<HabitState>()(
  persist(
    (set) => ({
      ...emptyState,

      addHabit: ({ name, icon, category, color, targetPerWeek }) =>
        set((state) => {
          const habit: Habit = {
            id: newId(),
            name,
            icon,
            category,
            color,
            targetPerWeek,
            createdAt: toKey(getSessionToday()),
            archived: false,
          }
          habit.schedule = scheduleForHabit(habit)
          return {
            habits: [...state.habits, habit],
            completions: { ...state.completions, [habit.id]: [] },
          }
        }),

      removeHabit: (id) =>
        set((state) => {
          const completions = { ...state.completions }
          delete completions[id]
          return { habits: state.habits.filter((h) => h.id !== id), completions }
        }),

      updateHabit: (id, patch) =>
        set((state) => ({
          habits: state.habits.map((h) => (h.id === id ? { ...h, ...patch } : h)),
        })),

      toggleCompletion: (habitId, dayKey) =>
        set((state) => {
          if (dayKey > toKey(getSessionToday()) || !state.habits.some((habit) => habit.id === habitId)) return state
          const existing = state.completions[habitId] ?? []
          const has = existing.includes(dayKey)
          const next = has ? existing.filter((d) => d !== dayKey) : [...existing, dayKey]
          return {
            completions: { ...state.completions, [habitId]: next.sort() },
          }
        }),

      setAffirmation: (dateKey, text) =>
        set((state) => {
          const trimmed = text.trim()
          const affirmations = { ...state.affirmations }
          if (trimmed) affirmations[dateKey] = text
          else delete affirmations[dateKey]
          return { affirmations }
        }),

      removeAffirmation: (dateKey) =>
        set((state) => {
          const affirmations = { ...state.affirmations }
          delete affirmations[dateKey]
          return { affirmations }
        }),

      clearAll: () => set({ ...emptyState }),
    }),
    {
      name: 'habittism-store-v1',
      version: 8,
      migrate: (persisted) => {
        const previous = persisted as Partial<typeof emptyState> | null
        const demoIds = new Set(SEED_HABITS.map((habit) => habit.id))
        const habits = (previous?.habits ?? []).filter((habit) => !demoIds.has(habit.id))
        const completions = Object.fromEntries(
          habits.map(({ id }) => [id, previous?.completions?.[id] ?? []]),
        )
        return { habits, completions, affirmations: previous?.affirmations ?? {} }
      },
    },
  ),
)

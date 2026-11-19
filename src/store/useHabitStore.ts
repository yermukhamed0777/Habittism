import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CompletionMap, Habit, HabitCategory, HabitColor } from '../types'
import { SEED_HABITS, generateSeedCompletions, scheduleForHabit } from '../data/seed'
import { toKey, getSessionToday } from '../lib/dates'

interface HabitState {
  habits: Habit[]
  completions: CompletionMap
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
  resetDemo: () => void
}

const newId = () => `h-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

export const useHabitStore = create<HabitState>()(
  persist(
    (set) => ({
      habits: SEED_HABITS,
      completions: generateSeedCompletions(SEED_HABITS),

      addHabit: ({ name, icon, category, color, targetPerWeek }) =>
        set((state) => {
          const habit: Habit = {
            id: newId(),
            name,
            icon,
            category,
            color,
            targetPerWeek,
            schedule:
              targetPerWeek >= 5
                ? [0, 1, 2, 3, 4, 5, 6]
                : (scheduleForHabit({
                    id: name + icon,
                    name,
                    icon,
                    category,
                    color,
                    targetPerWeek,
                    createdAt: '',
                    archived: false,
                  }) as number[]),
            createdAt: toKey(getSessionToday()),
            archived: false,
          }
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
          const existing = state.completions[habitId] ?? []
          const has = existing.includes(dayKey)
          const next = has ? existing.filter((d) => d !== dayKey) : [...existing, dayKey]
          return {
            completions: { ...state.completions, [habitId]: next.sort() },
          }
        }),

      resetDemo: () =>
        set({
          habits: SEED_HABITS,
          completions: generateSeedCompletions(SEED_HABITS),
        }),
    }),
    {
      name: 'habittism-store-v1',
      version: 6,
      migrate: (persisted: unknown) => {
        // v1 stored no `schedule`; v2 used a less realistic seed generator.
        // Rebuild both so the dashboard ships with coherent demo data.
        const state = persisted as { habits?: Habit[]; completions?: CompletionMap } | undefined
        if (!state?.habits) return persisted
        const habits = state.habits.map((h) => ({
          ...h,
          schedule: h.schedule?.length ? h.schedule : scheduleForHabit(h),
        }))
        return {
          ...state,
          habits,
          completions: generateSeedCompletions(habits),
        }
      },
    },
  ),
)

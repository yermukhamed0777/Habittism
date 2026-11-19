import { useState } from 'react'
import { motion } from 'motion/react'
import { Award, CalendarCheck, Layers, Percent } from 'lucide-react'

import { Background } from './components/Background'
import { TopBar } from './components/TopBar'
import { Hero } from './components/Hero'
import { StatCard } from './components/StatCard'
import { ContributionCalendar } from './components/ContributionCalendar'
import { TodayPanel } from './components/TodayPanel'
import { ActivityChart } from './components/ActivityChart'
import { HabitCard } from './components/HabitCard'
import { AddHabitModal } from './components/AddHabitModal'
import { GlassPanel, SectionHeading } from './components/GlassPanel'

import { useHabitStore } from './store/useHabitStore'
import { useHabitStats, useOverview, useDayStats } from './hooks/useHabitStats'
import { useToday } from './hooks/useToday'
import { scheduleForHabit } from './data/seed'
import { toKey } from './lib/dates'

function App() {
  const [modalOpen, setModalOpen] = useState(false)

  const habits = useHabitStore((s) => s.habits)
  const completions = useHabitStore((s) => s.completions)
  const toggleCompletion = useHabitStore((s) => s.toggleCompletion)
  const addHabit = useHabitStore((s) => s.addHabit)
  const removeHabit = useHabitStore((s) => s.removeHabit)
  const resetDemo = useHabitStore((s) => s.resetDemo)

  const stats = useHabitStats()
  const overview = useOverview()
  const dayStats = useDayStats()

  const today = useToday()
  const todayKey = toKey(today)

  const todayItems = habits.map((h) => ({
    id: h.id,
    name: h.name,
    icon: h.icon,
    color: h.color,
    done: (completions[h.id] ?? []).includes(todayKey),
    due: scheduleForHabit(h).includes(today.getDay()),
  }))

  const doneToday = todayItems.filter((i) => i.done).length
  const dueToday = todayItems.filter((i) => i.due).length

  const todayLabel = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="relative min-h-dvh">
      <Background />

      <TopBar
        onAdd={() => setModalOpen(true)}
        streak={overview.currentStreak}
        onReset={() => {
          if (window.confirm('Reset all habits and completion history to the demo dataset?')) {
            resetDemo()
          }
        }}
      />

      <main className="mx-auto flex max-w-[1240px] flex-col gap-5 px-4 pb-16 pt-5 sm:px-6 sm:pb-20 sm:pt-6">
        <Hero
          name="Yermukhamed"
          streak={overview.currentStreak}
          bestStreak={overview.bestStreak}
          todayLabel={todayLabel}
          doneToday={doneToday}
          totalToday={dueToday}
        />

        {/* KPI row */}
        <section className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          <StatCard
            index={0}
            label="Current streak"
            value={String(overview.currentStreak)}
            unit="days"
            accent="iris"
            icon={<Award size={17} strokeWidth={2.1} />}
            hint="Strongest running streak across all habits"
          />
          <StatCard
            index={1}
            label="Perfect days"
            value={String(overview.perfectDays)}
            unit="/ 371"
            accent="aqua"
            icon={<CalendarCheck size={17} strokeWidth={2.1} />}
            hint="Days where every scheduled habit was completed"
          />
          <StatCard
            index={2}
            label="Consistency"
            value={overview.completionRate.toFixed(1)}
            unit="%"
            accent="mint"
            icon={<Percent size={17} strokeWidth={2.1} />}
            hint="Completions over scheduled opportunities"
          />
          <StatCard
            index={3}
            label="Total check-ins"
            value={overview.totalCompletions.toLocaleString()}
            accent="amber"
            icon={<Layers size={17} strokeWidth={2.1} />}
            hint={`Across ${habits.length} active habits`}
          />
        </section>

        {/* Full-width contribution map, GitHub-profile style */}
        <ContributionCalendar days={dayStats} totalHabits={habits.length} />

        {/* Today + Momentum */}
        <section className="grid gap-5 lg:grid-cols-[1fr_1.45fr]">
          <TodayPanel
            items={todayItems}
            onToggle={(id) => toggleCompletion(id, todayKey)}
          />
          <ActivityChart days={dayStats} />
        </section>

        {/* Habits */}
        <GlassPanel className="overflow-hidden" sheen>
          <div className="flex flex-col p-5 sm:p-6">
            <SectionHeading
              icon={<Layers size={17} strokeWidth={2.1} />}
              title="Your habits"
              subtitle={`${habits.length} tracked · tap the icon to check in`}
              action={
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className="btn-ghost !px-2.5 !py-1.5 !text-[0.72rem]"
                >
                  Add
                </button>
              }
            />

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {stats.map((s, i) => (
                <HabitCard
                  key={s.habit.id}
                  stats={s}
                  index={i}
                  isDoneToday={(completions[s.habit.id] ?? []).includes(todayKey)}
                  onToggle={() => toggleCompletion(s.habit.id, todayKey)}
                  onDelete={() => {
                    if (
                      window.confirm(
                        `Delete "${s.habit.name}" and its entire history? This cannot be undone.`,
                      )
                    ) {
                      removeHabit(s.habit.id)
                    }
                  }}
                />
              ))}
            </div>
          </div>
        </GlassPanel>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="mt-2 flex flex-col items-center gap-3 border-t border-white/[0.07] pt-7 text-center"
        >
          <div className="hairline h-px w-full max-w-md opacity-50" />
          <p className="text-[0.76rem] text-mist-500">
            <span className="font-semibold text-mist-300">Habittism</span> — build the habits that
            build you.
          </p>
          <p className="text-[0.7rem] text-mist-500/70">
            Crafted by Yermukhamed TUKTIBAY · Data stored locally on your device
          </p>
        </motion.footer>
      </main>

      <AddHabitModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={addHabit}
      />
    </div>
  )
}

export default App

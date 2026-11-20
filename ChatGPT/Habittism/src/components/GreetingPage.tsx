import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import {
  ArrowRight,
  CalendarDays,
  Feather,
  Quote,
  RotateCcw,
  Sparkles,
  Trash2,
} from 'lucide-react'

import { GlassPanel, SectionHeading } from './GlassPanel'
import { HabitIcon } from './HabitIcon'
import { COLOR_HEX } from '../types'
import { AFFIRMATION_PROMPTS, greetingFor, pickPrompt } from '../lib/affirmations'
import { toKey } from '../lib/dates'
import { useHabitStore } from '../store/useHabitStore'
import { scheduleForHabit } from '../data/seed'
import { cn } from '../lib/utils'

interface GreetingPageProps {
  today: Date
  onOpenDashboard: () => void
  onOpenHabit: (id: string) => void
  onAddHabit: () => void
}

export function GreetingPage({ today, onOpenDashboard, onAddHabit, onOpenHabit }: GreetingPageProps) {
  const [greeting] = useState(() => greetingFor(new Date()))
  const todayKey = toKey(today)
  const habits = useHabitStore((s) => s.habits)
  const completions = useHabitStore((s) => s.completions)
  const affirmations = useHabitStore((s) => s.affirmations)
  const setAffirmation = useHabitStore((s) => s.setAffirmation)
  const removeAffirmation = useHabitStore((s) => s.removeAffirmation)
  const toggleCompletion = useHabitStore((s) => s.toggleCompletion)

  const draft = affirmations[todayKey] ?? ''
  const saved = Boolean(draft.trim())
  const [prompt, setPrompt] = useState<string>()
  const setDraft = (value: string) => setAffirmation(todayKey, value)

  /** Past entries, newest first. */
  const history = useMemo(
    () =>
      Object.entries(affirmations)
        .filter(([key, text]) => key !== todayKey && text.trim())
        .sort((a, b) => b[0].localeCompare(a[0])),
    [affirmations, todayKey],
  )

  const dueHabits = useMemo(
    () =>
      habits.filter((h) => scheduleForHabit(h).includes(today.getDay())),
    [habits, today],
  )
  const doneToday = dueHabits.filter((h) =>
    (completions[h.id] ?? []).includes(todayKey),
  ).length

  const dateLabel = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="flex flex-col gap-5">
      {/* Greeting hero */}
      <GlassPanel className="relative overflow-hidden !rounded-[28px]" sheen>
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-28 h-[340px] w-[340px] rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.32)_0%,transparent_68%)] blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-28 left-[22%] h-[280px] w-[280px] rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.2)_0%,transparent_70%)] blur-3xl"
        />

        <div className="relative p-6 sm:p-8 lg:p-10">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="chip !border-aqua-300/25 !bg-aqua-400/10 text-aqua-200"
          >
            <CalendarDays size={12} strokeWidth={2.4} />
            {dateLabel}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            className="mt-5 text-[2.2rem] font-extrabold leading-[1.08] tracking-tight sm:text-[3rem]"
          >
            <span className="text-gradient">{greeting},</span>{' '}
            <span className="text-gradient-soft">Yermukhamed.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.6 }}
            className="mt-3 max-w-lg text-[0.92rem] leading-relaxed text-mist-400"
          >
            Before the day asks anything of you, decide what you are carrying into it.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.6 }}
            className="mt-6 flex flex-wrap gap-2.5"
          >
            <button type="button" onClick={onOpenDashboard} className="btn-primary">
              Open dashboard
              <ArrowRight size={15} strokeWidth={2.4} />
            </button>
            <span className="chip !border-white/10 !bg-white/[0.05] text-mist-300">
              {habits.length === 0
                ? 'No habits yet'
                : `${doneToday} of ${dueHabits.length} scheduled done`}
            </span>
          </motion.div>
        </div>
      </GlassPanel>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
        {/* Affirmation editor */}
        <GlassPanel className="overflow-hidden" sheen>
          <div className="flex flex-col p-5 sm:p-6">
            <SectionHeading
              icon={<Feather size={17} strokeWidth={2.1} />}
              title="Today's affirmation"
              subtitle={
                saved ? 'Saved' : 'Write it down — it autosaves as you type'
              }
              action={
                saved ? (
                  <span className="chip !border-mint-300/30 !bg-mint-400/12 text-mint-300">
                    Saved
                  </span>
                ) : null
              }
            />

            <div className="relative mt-5">
              <Quote
                size={54}
                strokeWidth={1.4}
                className="pointer-events-none absolute -left-1 -top-2 text-white/[0.05]"
              />
              <textarea
                aria-label="Today's affirmation"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={5}
                placeholder="Today I am…"
                className="w-full resize-none rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-[0.95rem] font-medium leading-relaxed text-mist-100 outline-none transition-colors placeholder:text-mist-500 placeholder:font-normal focus:border-aqua-400/45 focus:bg-white/[0.05]"
              />
            </div>

            {/* Prompt suggestions */}
            <div className="mt-4">
              <p className="flex items-center gap-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.09em] text-mist-500">
                <Sparkles size={11} strokeWidth={2.4} />
                Need a starting point?
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {AFFIRMATION_PROMPTS.slice(0, 3).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setDraft(p)}
                    className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-left text-[0.74rem] font-medium text-mist-300 transition-all duration-250 hover:border-aqua-300/40 hover:bg-aqua-400/10 hover:text-mist-100"
                  >
                    {p}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const next = pickPrompt(prompt)
                    setPrompt(next)
                    setDraft(next)
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[0.74rem] font-semibold text-mist-400 transition-all duration-250 hover:border-violet-300/40 hover:bg-violet-400/10 hover:text-mist-100"
                >
                  <RotateCcw size={11} strokeWidth={2.4} />
                  Another
                </button>
              </div>
            </div>
          </div>
        </GlassPanel>

        {/* Today's habits */}
        <GlassPanel className="overflow-hidden" sheen>
          <div className="flex flex-col p-5 sm:p-6">
            <SectionHeading
              icon={<Sparkles size={17} strokeWidth={2.1} />}
              title="Today's habits"
              subtitle={
                habits.length === 0
                  ? 'Start with one'
                  : `${doneToday} of ${dueHabits.length} scheduled completed`
              }
              action={
                <button
                  type="button"
                  onClick={onAddHabit}
                  className="btn-ghost !px-2.5 !py-1.5 !text-[0.72rem]"
                >
                  Add
                </button>
              }
            />

            {habits.length === 0 ? (
              <div className="mt-5 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/12 px-5 py-10 text-center">
                <span className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/[0.05] text-mist-400">
                  <Feather size={18} strokeWidth={2} />
                </span>
                <p className="max-w-[26ch] text-[0.82rem] leading-relaxed text-mist-400">
                  You have no habits yet. Create your first one and start tracking from
                  today.
                </p>
                <button type="button" onClick={onAddHabit} className="btn-primary mt-1">
                  Create a habit
                  <ArrowRight size={15} strokeWidth={2.4} />
                </button>
              </div>
            ) : (
              <ul className="mt-5 flex flex-col gap-1.5">
                {dueHabits.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-white/12 px-4 py-8 text-center text-[0.8rem] text-mist-400">
                    Nothing scheduled today — a rest day for every habit.
                  </p>
                ) : null}
                {dueHabits.map((habit) => {
                  const done = (completions[habit.id] ?? []).includes(todayKey)
                  const tint = COLOR_HEX[habit.color]
                  return (
                    <li key={habit.id} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleCompletion(habit.id, todayKey)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left transition-all duration-300',
                          done ? 'bg-white/[0.04]' : 'hover:border-white/10 hover:bg-white/[0.04]',
                        )}
                      >
                        <span
                          className={cn(
                            'grid h-7 w-7 shrink-0 place-items-center rounded-lg border transition-all duration-300',
                            done
                              ? 'text-ink-950'
                              : 'border-white/12 bg-white/[0.05] text-mist-500',
                          )}
                          style={done ? { background: tint, borderColor: tint } : undefined}
                        >
                          <HabitIcon name={habit.icon} size={13} />
                        </span>
                        <span
                          className={cn(
                            'flex-1 truncate text-[0.85rem] font-semibold transition-colors duration-300',
                            done ? 'text-mist-400 line-through' : 'text-mist-200',
                          )}
                        >
                          {habit.name}
                        </span>
                        {done ? (
                          <span className="text-[0.62rem] font-bold uppercase tracking-wider text-mint-400">
                            Done
                          </span>
                        ) : (
                          <span className="text-[0.62rem] font-bold uppercase tracking-wider text-mist-500">
                            Due
                          </span>
                        )}
                      </button>
                      <button type="button" className="btn-ghost" aria-label={`Open ${habit.name} history`} onClick={() => onOpenHabit(habit.id)}>History</button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </GlassPanel>
      </div>

      {/* Journal history */}
      {history.length > 0 ? (
        <GlassPanel className="overflow-hidden" sheen>
          <div className="flex flex-col p-5 sm:p-6">
            <SectionHeading
              icon={<Quote size={17} strokeWidth={2.1} />}
              title="Journal"
              subtitle={`${history.length} past ${history.length === 1 ? 'entry' : 'entries'}`}
            />
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {history.map(([key, text]) => (
                <li
                  key={key}
                  className="group rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 transition-colors duration-300 hover:border-white/15"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-mist-500">
                      {new Date(`${key}T12:00:00`).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeAffirmation(key)}
                      aria-label="Delete entry"
                      className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-mist-500 opacity-0 transition-all duration-300 hover:bg-rose-500/15 hover:text-rose-300 focus-visible:opacity-100 group-hover:opacity-100"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <p className="mt-2 text-[0.85rem] font-medium leading-relaxed text-mist-200">
                    {text}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </GlassPanel>
      ) : null}
    </div>
  )
}

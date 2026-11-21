import { ArrowRight, Compass } from 'lucide-react'
import { toKey } from '../lib/dates'
import { focusQueue, isComplete, isOnToday, type Journal } from '../lib/tracking'
import { EntryIcon } from './HabitEntry'

const amount = new Intl.NumberFormat(undefined, { maximumFractionDigits: 5 })

export function WeeklyCoach({ journal, today, completed, onOpenHabit }: {
  journal: Journal
  today: Date
  completed: number
  onOpenHabit: (id: string, day: string) => void
}) {
  if (!journal.habits.length) return null
  const key = toKey(today)
  const due = journal.habits.filter((habit) => {
    const logs = journal.logs[habit.id] ?? {}
    return isOnToday(habit, logs, today) && !logs[key]?.frozen && !isComplete(habit, logs[key])
  })
  const next = focusQueue(due, journal, today)[0]
  const logged = next && (journal.logs[next.id]?.[key]?.value ?? 0)
  const summary = completed
    ? 'You’ve completed ' + completed.toLocaleString() + ' scheduled ' + (completed === 1 ? 'goal' : 'goals') + ' this week.'
    : 'Your next scheduled check-in starts this week’s progress.'

  let detail = 'Pick a time today to check this off.'
  if (next?.kind === 'numeric') {
    const remaining = amount.format(next.goal - (logged ?? 0))
    detail = remaining + (next.unit ? ' ' + next.unit : '') + ' left to reach today’s goal.'
  } else if (next?.schedule === 'weekly') {
    detail = 'A check-in today counts toward your weekly target.'
  }

  return (
    <section className="panel coach" aria-labelledby="coach-title">
      <div className="panel-heading">
        <span className="section-icon"><Compass size={20} aria-hidden="true" /></span>
        <div><h2 id="coach-title">Weekly Coach</h2><p>{summary}</p></div>
      </div>
      {next ? <button type="button" className="coach-action" onClick={() => onOpenHabit(next.id, key)}
        aria-label={'Open ' + next.name + ' for today'}>
        <EntryIcon habit={next} />
        <span><strong>{next.name}</strong><small>{detail}</small></span>
        <ArrowRight size={18} aria-hidden="true" />
      </button> : <p className="coach-done">You’re caught up on today’s scheduled habits.</p>}
    </section>
  )
}

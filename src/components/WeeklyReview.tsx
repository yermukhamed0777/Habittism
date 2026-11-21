import { addDays, format } from 'date-fns'
import { CalendarRange } from 'lucide-react'
import { startOfWeekMonday, toKey } from '../lib/dates'
import { formatDay, isComplete, isScheduled, weekProgress, type Journal } from '../lib/tracking'

export function WeeklyReview({ journal, today, onSelectDay }: {
  journal: Journal
  today: Date
  onSelectDay: (key: string) => void
}) {
  const start = startOfWeekMonday(today)
  const todayKey = toKey(today)
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(start, index)
    const key = toKey(date)
    const planned = journal.habits.filter((habit) => isScheduled(habit, date, key))
    const completed = planned.filter((habit) => isComplete(habit, journal.logs[habit.id]?.[key])).length
    return { date, key, total: planned.length, completed, future: key > todayKey }
  })
  const targets = journal.habits.filter((habit) => habit.schedule === 'weekly').flatMap((habit) => {
    const { done, target } = weekProgress(habit, journal.logs[habit.id] ?? {}, start, todayKey)
    return target ? [{ habit, done, target }] : []
  })

  return (
    <section className="panel week-review">
      <div className="panel-heading">
        <span className="section-icon"><CalendarRange size={20} /></span>
        <div><h2>This week</h2><p>{format(start, 'MMM d')} – {format(days[6].date, 'MMM d')}</p></div>
      </div>
      <ol className="week-days" aria-label="Scheduled check-ins by day">
        {days.map(({ date, key, total, completed, future }) => {
          const label = future ? `${total} planned` : `${completed} of ${total} complete`
          return (
            <li key={key}>
              <button type="button" disabled={future} aria-current={key === todayKey ? 'date' : undefined}
                aria-label={`${formatDay(date)}, ${label}`} onClick={() => onSelectDay(key)}>
                <small>{format(date, 'EEE')}</small>
                <strong>{format(date, 'd')}</strong>
                <span>{total ? future ? total : `${completed}/${total}` : '—'}</span>
              </button>
            </li>
          )
        })}
      </ol>
      {!!targets.length && <div className="weekly-targets">
        <h3>Flexible targets</h3>
        <ul>{targets.map(({ habit, done, target }) => <li key={habit.id}>
          <span>{habit.name}</span><progress aria-label={`${habit.name} weekly target`} value={Math.min(done, target)} max={target} />
          <strong>{done}/{target}</strong>
        </li>)}</ul>
      </div>}
    </section>
  )
}

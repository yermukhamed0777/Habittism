import { useMemo, useState } from 'react'
import { ChartNoAxesColumnIncreasing } from 'lucide-react'
import { completionTrend, type Period } from '../lib/insights'
import { completionRate, habitStats, scheduleLabel, type Journal } from '../lib/tracking'
import { EntryIcon } from './HabitEntry'

export function TrackerInsights({ journal, today, onOpenHabit }: {
  journal: Journal
  today: Date
  onOpenHabit: (id: string) => void
}) {
  const [period, setPeriod] = useState<Period>('week')
  const points = useMemo(() => completionTrend(journal, today, period), [journal, period, today])
  const rows = useMemo(() => journal.habits.map((habit) => ({ habit, ...habitStats(habit, journal.logs[habit.id] ?? {}, today) })), [journal, today])
  const overview = rows.reduce((totals, row) => ({
    count: totals.count + row.total, done: totals.done + row.completed, planned: totals.planned + row.opportunities,
  }), { count: 0, done: 0, planned: 0 })
  const last = points.at(-2)
  const previous = points.at(-3)
  const change = last?.planned && previous?.planned ? last.rate - previous.rate : null

  return (
    <>
      <div className="page-heading"><h1>Insights</h1><p>Track consistency and streaks over time.</p></div>
      <div className="insight-summary">
        <div className="panel"><span>Overall completion</span><strong>{overview.planned ? `${completionRate(overview.done, overview.planned)}%` : '—'}</strong></div>
        <div className="panel"><span>Check-ins completed</span><strong>{overview.count.toLocaleString()}</strong></div>
        <div className="panel"><span>Habits tracked</span><strong>{rows.length.toLocaleString()}</strong></div>
      </div>
      <section className="panel">
        <div className="calendar-header">
          <div className="panel-heading">
            <span className="section-icon"><ChartNoAxesColumnIncreasing size={19} /></span>
            <div><h2>Completion trend</h2><p>{change === null ? 'Completed share of scheduled goals' : `${change > 0 ? '+' : ''}${change} percentage points across the last two full ${period}s`}</p></div>
          </div>
          <div className="chips">
            <button className="pill" type="button" aria-pressed={period === 'week'} onClick={() => setPeriod('week')}>Weekly</button>
            <button className="pill" type="button" aria-pressed={period === 'month'} onClick={() => setPeriod('month')}>Monthly</button>
          </div>
        </div>
        <ul className="trend" aria-label={`${period === 'week' ? 'Weekly' : 'Monthly'} completion rates`} style={{ gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` }}>
          {points.map(({ key, label, planned, complete, rate }) => (
            <li key={key} aria-label={`${label}: ${planned ? `${rate}%, ${complete} of ${planned} goals complete` : 'No scheduled goals'}`}>
              <span title={planned ? `${complete} of ${planned} goals complete` : 'No scheduled goals'}>{planned ? `${rate}%` : '—'}</span>
              <div className="trend-track" aria-hidden="true"><div style={{ height: `${rate}%` }} /></div>
              <small>{label}</small>
            </li>
          ))}
        </ul>
      </section>
      <section className="panel insight-streaks">
        <div className="panel-heading"><div><h2>Habit streaks</h2><p>Weekly goals count consecutive weeks. Daily and weekday goals count consecutive scheduled check-ins.</p></div></div>
        {rows.length ? (
          <div className="table-scroll">
            <table>
              <thead><tr><th scope="col">Habit</th><th scope="col">Current</th><th scope="col">Best</th><th scope="col">Completion</th></tr></thead>
              <tbody>{rows.map(({ habit, current, best, rate, opportunities }) => (
                <tr key={habit.id}>
                  <th scope="row"><button type="button" className="habit-name" onClick={() => onOpenHabit(habit.id)}><EntryIcon habit={habit} />
                    <span><strong>{habit.name}</strong><small>{scheduleLabel(habit)}</small></span>
                  </button></th>
                  <td>{current}</td><td>{best}</td><td>{opportunities ? `${rate}%` : '—'}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <p className="empty">Create a habit to start tracking your streaks.</p>}
      </section>
    </>
  )
}

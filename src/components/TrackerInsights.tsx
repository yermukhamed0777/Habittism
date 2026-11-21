import { useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { ChartNoAxesColumnIncreasing, Flame, Sparkles } from 'lucide-react'
import { completionTrend, type Period } from '../lib/insights'
import { completionRate, habitStats, scheduleLabel, type Journal } from '../lib/tracking'
import { buildWeeklySummary, getSanitizedCoachStats } from '../lib/coach'
import { EntryIcon } from './HabitEntry'
import { TrackerCalendar } from './TrackerCalendar'

export function TrackerInsights({ journal, today, session, onOpenHabit, onSelectDay }: {
  journal: Journal
  today: Date
  session?: Session
  onOpenHabit: (id: string) => void
  onSelectDay: (day: string) => void
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

  const summary = useMemo(() => buildWeeklySummary(journal, today), [journal, today])
  const [aiSuggestion, setAiSuggestion] = useState<{ observation: string; adjustment: string } | null>(null)
  const [coachStatus, setCoachStatus] = useState<string>('')
  const [loadingCoach, setLoadingCoach] = useState(false)

  async function requestAiCoach() {
    if (!session?.access_token || loadingCoach) return
    setLoadingCoach(true)
    setCoachStatus('')
    try {
      const stats = getSanitizedCoachStats(journal, today)
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(stats),
      })
      if (!res.ok) {
        if (res.status === 429) {
          setCoachStatus('Daily AI suggestion limit reached. Your deterministic summary remains active.')
        } else {
          setCoachStatus('AI coach service is currently resting. Your deterministic summary is always available.')
        }
        return
      }
      const data = await res.json()
      if (data.available && data.observation && data.adjustment) {
        setAiSuggestion({ observation: data.observation, adjustment: data.adjustment })
        setCoachStatus('AI suggestion generated for next week.')
      } else {
        setCoachStatus(data.message || 'AI coach is unconfigured on this deployment. Deterministic review is active.')
      }
    } catch {
      setCoachStatus('Could not reach the coach service. Your deterministic summary is shown below.')
    } finally {
      setLoadingCoach(false)
    }
  }

  return (
    <>
      <div className="page-heading"><h1>Insights</h1><p>Track consistency and streaks over time.</p></div>
      <div className="insight-summary">
        <div className="panel"><span>Overall completion</span><strong>{overview.planned ? `${completionRate(overview.done, overview.planned)}%` : '—'}</strong></div>
        <div className="panel"><span>Check-ins completed</span><strong>{overview.count.toLocaleString()}</strong></div>
        <div className="panel"><span>Habits tracked</span><strong>{rows.length.toLocaleString()}</strong></div>
      </div>
      <TrackerCalendar journal={journal} today={today} onSelect={onSelectDay} consistency />
      <section className="panel">
        <div className="panel-heading"><span className="section-icon"><Flame size={19} /></span><div>
          <h2>Streak milestones</h2><p>Consecutive scheduled check-in days for daily and weekday habits.</p>
        </div></div>
        <ul className="milestones">
          {[7, 30, 100].map((days) => {
            const reached = rows.filter(({ habit, best }) => habit.schedule !== 'weekly' && best >= days)
            return <li key={days} data-reached={reached.length > 0}><strong>{days}d</strong>
              <span>{reached.length ? `${reached.length} ${reached.length === 1 ? 'habit' : 'habits'} reached` : 'In progress'}</span>
              {reached.length > 0 && <small>{reached.map(({ habit }) => habit.name).join(', ')}</small>}
            </li>
          })}
        </ul>
      </section>

      <section className="panel coach-panel">
        <div className="panel-heading">
          <span className="section-icon"><Sparkles size={19} /></span>
          <div>
            <h2>Weekly Habit Coach</h2>
            <p>Grounding reflection and realistic adjustments for next week.</p>
          </div>
        </div>
        <div className="coach-content">
          <div className="coach-bubble">
            <strong>Weekly observation</strong>
            <p>{aiSuggestion?.observation || summary.observation}</p>
          </div>
          <div className="coach-bubble coach-action">
            <strong>Recommended adjustment</strong>
            <p>{aiSuggestion?.adjustment || summary.adjustment}</p>
          </div>
          {session ? (
            <div className="coach-actions">
              <button
                type="button"
                className="secondary"
                disabled={loadingCoach}
                onClick={() => void requestAiCoach()}
              >
                <Sparkles size={16} /> {loadingCoach ? 'Consulting coach…' : 'Get AI suggestion'}
              </button>
              <p className="coach-privacy">
                Privacy first: Only aggregate stats ({summary.habitsCount} habits, {summary.rate}% rate) are sent. Notes, reflections, and affirmations stay private on your device.
              </p>
              {coachStatus && <p className="coach-status" role="status">{coachStatus}</p>}
            </div>
          ) : (
            <p className="coach-privacy">
              Deterministic weekly summary. Sign in to optionally request an AI suggestion.
            </p>
          )}
        </div>
      </section>

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

import { useState } from 'react'
import { addDays, addMonths, endOfMonth, format, startOfMonth } from 'date-fns'
import { ChevronLeft, ChevronRight, Snowflake, Trash2 } from 'lucide-react'
import { fromKey, startOfWeekMonday, toKey } from '../lib/dates'
import { formatDay, habitStats, isComplete, isScheduled, scheduleLabel, weekdays, type HabitLog, type TrackedHabit } from '../lib/tracking'
import type { CloudJournal } from '../store/useCloudJournal'
import { EntryControl, EntryIcon } from './HabitEntry'
import { JournalDialog } from './JournalDialog'

export function TrackerHistory({ tracker, habit, today, initialDay, onClose }: {
  tracker: CloudJournal
  habit: TrackedHabit
  today: Date
  initialDay?: string
  onClose: () => void
}) {
  const [selected, setSelected] = useState(initialDay ?? toKey(today))
  const [month, setMonth] = useState(() => startOfMonth(initialDay ? fromKey(initialDay) : today))
  const [freezeMode, setFreezeMode] = useState(false)
  const todayKey = toKey(today)
  const monthEnd = endOfMonth(month)
  const days = Array.from({ length: monthEnd.getDate() }, (_, index) => addDays(month, index))
  const logs = tracker.journal.logs[habit.id] ?? {}
  const stats = habitStats(habit, logs, today)
  const unit = habit.schedule === 'weekly' ? 'wk' : 'check-ins'
  const selectedLog = logs[selected]
  const selectedDate = fromKey(selected)

  function update(day: string, log: HabitLog | null) {
    tracker.writeLog(habit.id, day, log)
  }

  function canFreeze(day: Date) {
    const key = toKey(day)
    return !habit.archived && key <= todayKey && key >= habit.createdOn && !logs[key]?.value &&
      (habit.schedule === 'weekly' || isScheduled(habit, day, key))
  }

  function toggleFreeze(day: string) {
    update(day, logs[day]?.frozen ? null : { value: 0, frozen: true })
  }

  function choose(date: Date) {
    const key = toKey(date)
    setSelected(key)
    if (habit.kind !== 'binary') return
    if (freezeMode) {
      if (canFreeze(date)) toggleFreeze(key)
      return
    }
    update(key, isComplete(habit, logs[key]) ? null : { value: 1, frozen: false })
  }

  function shiftMonth(direction: number) {
    const next = addMonths(month, direction)
    setMonth(next)
    setSelected(toKey(direction < 0 ? endOfMonth(next) : next))
  }

  return (
    <JournalDialog title={habit.name} subtitle={scheduleLabel(habit)} onClose={onClose}>
      <div className="history-summary">
        <div><strong>{stats.current}</strong><small>Current streak, {unit}</small></div>
        <div><strong>{stats.best}</strong><small>Best streak, {unit}</small></div>
        <div><strong>{stats.rate}%</strong><small>Completion</small></div>
      </div>
      <div className="month-nav">
        <button className="icon-button" type="button" aria-label="Previous month" onClick={() => shiftMonth(-1)}><ChevronLeft size={19} /></button>
        <h3 aria-live="polite">{format(month, 'MMMM yyyy')}</h3>
        <button className="icon-button" type="button" aria-label="Next month" disabled={month >= startOfMonth(today)} onClick={() => shiftMonth(1)}><ChevronRight size={19} /></button>
      </div>
      {habit.kind === 'binary' && <div className="chips history-mode">
        <button type="button" className="pill" aria-pressed={!freezeMode} onClick={() => setFreezeMode(false)}>Check-ins</button>
        <button type="button" className="pill" aria-pressed={freezeMode} onClick={() => setFreezeMode(true)}><Snowflake size={15} /> Streak freeze</button>
      </div>}
      <div className="month-grid">
        {weekdays.map(({ label }) => <span className="weekday" key={label}>{label}</span>)}
        {days.map((date, index) => {
          const key = toKey(date)
          const log = logs[key]
          const done = isComplete(habit, log)
          const status = done ? 'Complete' : log?.frozen ? 'Frozen' : log?.value ? 'In progress' : 'No check-in'
          const focus = key === selected
          const due = isScheduled(habit, date, key)
          return <button className="month-cell" type="button" key={key}
            style={index === 0 ? { gridColumnStart: 1 + ((date.getDay() + 6) % 7) } : undefined}
            disabled={key > todayKey || freezeMode && !canFreeze(date)}
            data-state={done ? 'complete' : log?.frozen ? 'frozen' : log?.value ? 'partial' : undefined}
            data-scheduled={due}
            aria-current={key === todayKey ? 'date' : undefined}
            aria-pressed={habit.kind === 'numeric' ? focus : freezeMode ? !!log?.frozen : done}
            aria-label={`${formatDay(date)}, ${status}`}
            onClick={() => choose(date)}>
              {date.getDate()}{log?.frozen && <Snowflake size={11} />}
          </button>
        })}
      </div>
      {habit.kind === 'numeric' && <div className="selected-day">
        <div><strong>{formatDay(selectedDate)}</strong>{selected < habit.createdOn && <small>Before the habit started</small>}</div>
        <EntryControl key={selected} habit={habit} log={selectedLog} onChange={(log) => update(selected, log)} />
        {canFreeze(selectedDate) && <button type="button" className="secondary" onClick={() => toggleFreeze(selected)}><Snowflake size={16} />{selectedLog?.frozen ? 'Remove freeze' : 'Freeze this day'}</button>}
      </div>}
      <p className="history-hint">{freezeMode || habit.kind === 'numeric'
        ? 'Frozen days protect streaks and stay out of completed totals.'
        : 'Select a date to toggle its check-in.'}</p>
      <div className="dialog-actions">
        <button className="danger-button" type="button" onClick={() => {
          if (window.confirm(`Delete “${habit.name}” and its check-in history?`)) {
            tracker.deleteHabit(habit.id)
            onClose()
          }
        }}><Trash2 size={16} /> Delete habit</button>
      </div>
    </JournalDialog>
  )
}

export function TrackerDay({ tracker, day, today, onClose, onOpenHabit, entries }: {
  tracker: CloudJournal
  day: string
  today: Date
  onClose: () => void
  onOpenHabit: (id: string, day: string) => void
  entries: (date: Date) => { habit: TrackedHabit; log?: HabitLog; done: boolean; unfinished: boolean }[]
}) {
  const date = fromKey(day)
  const items = entries(date)
  const done = items.filter((item) => item.done).length
  const unfinished = items.filter((item) => item.unfinished).length
  const frozen = items.filter((item) => item.log?.frozen).length
  const week = startOfWeekMonday(date)

  return (
    <JournalDialog title={formatDay(date)} subtitle={`${done} completed · ${unfinished} unfinished${frozen ? ` · ${frozen} frozen` : ''}`} onClose={onClose}>
      {items.length ? (
        <ul className="habit-list day-list">
          {items.map(({ habit, log, unfinished: pending, done: complete }) => (
            <li key={habit.id} className="habit-row">
              <button className="habit-name" type="button" onClick={() => onOpenHabit(habit.id, day)}>
                <EntryIcon habit={habit} />
                <span><strong>{habit.name}</strong><small>{log?.frozen ? 'Frozen' : complete ? 'Complete' : pending ? 'Unfinished' : habit.schedule === 'weekly' && day >= habit.createdOn ? `Flexible · week of ${format(week, 'MMM d')}` : 'Optional check-in'}</small></span>
              </button>
              {day <= toKey(today) && <EntryControl habit={habit} log={log} onChange={(next) => tracker.writeLog(habit.id, day, next)} />}
            </li>
          ))}
        </ul>
      ) : <p className="empty">No scheduled habits or check-ins on this date.</p>}
    </JournalDialog>
  )
}

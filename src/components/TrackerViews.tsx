import { useEffect, useId, useState } from 'react'
import { Archive, ArchiveRestore, ArrowRight, CalendarDays, Feather, Leaf, Plus, Search, Snowflake } from 'lucide-react'
import { AFFIRMATION_PROMPTS, greetingFor, pickPrompt } from '../lib/affirmations'
import { fromKey, startOfWeekMonday, toKey } from '../lib/dates'
import { categoryLabel, focusQueue, formatDay, isComplete, scheduleLabel, weekProgress, type TrackedHabit } from '../lib/tracking'
import type { CloudJournal } from '../store/useCloudJournal'
import { EntryControl, EntryIcon, EntryReflection } from './HabitEntry'
import { WeeklyReview } from './WeeklyReview'

const dateLabel = (date: Date) => date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

function AffirmationEditor({ tracker, today, showHistory = false }: {
  tracker: CloudJournal
  today: Date
  showHistory?: boolean
}) {
  const key = toKey(today)
  const editorId = useId()
  const value = tracker.journal.affirmations[key] ?? ''
  const history = Object.entries(tracker.journal.affirmations)
    .filter(([day, note]) => day < key && note.trim()).sort(([first], [second]) => second.localeCompare(first))

  return (
    <section className="panel affirmation">
      <div className="panel-heading">
        <span className="section-icon"><Feather size={19} /></span>
        <div><h2><label htmlFor={editorId}>Daily affirmation</label></h2><p>{dateLabel(today)}</p></div>
      </div>
      <textarea id={editorId} rows={5} value={value} maxLength={4000} placeholder="Today I choose…"
        onChange={(event) => tracker.writeAffirmation(key, event.target.value)} />
      <div className="affirmation-actions">
        <small>Changes save automatically.</small>
        {value.trim()
          ? <button className="text-button" type="button" onClick={() => {
            if (window.confirm('Clear today’s affirmation?')) tracker.writeAffirmation(key, '')
          }}>Clear entry</button>
          : !showHistory && <button className="text-button" type="button" onClick={() => tracker.writeAffirmation(key, pickPrompt())}>Use a prompt</button>}
      </div>
      {showHistory && (
        <>
          <div className="prompt">
            <p>{AFFIRMATION_PROMPTS[2]}</p>
            <button type="button" className="text-button" onClick={() => {
              if (!value.trim() || window.confirm('Replace today’s affirmation with this prompt?')) tracker.writeAffirmation(key, AFFIRMATION_PROMPTS[2])
            }}>Use this affirmation</button>
          </div>
          {!!history.length && <details className="past-notes">
            <summary>Past affirmations</summary>
            <ul>{history.map(([day, note]) => <li key={day}><time dateTime={day}>{formatDay(fromKey(day))}</time><p>{note}</p></li>)}</ul>
          </details>}
        </>
      )}
    </section>
  )
}

type HabitViewProps = {
  tracker: CloudJournal
  today: Date
  onAdd: () => void
  onTemplates: () => void
  onOpenHabit: (id: string) => void
}

export function DailyGreeting({ tracker, today, name, due, onToday, onAdd, onOpenHabit, onTemplates }: HabitViewProps & {
  name: string
  due: TrackedHabit[]
  onToday: () => void
}) {
  const [greeting, setGreeting] = useState(() => greetingFor(new Date()))

  useEffect(() => {
    const update = () => setGreeting(greetingFor(new Date()))
    const clock = window.setInterval(update, 60_000)
    window.addEventListener('focus', update)
    return () => {
      window.clearInterval(clock)
      window.removeEventListener('focus', update)
    }
  }, [])

  return (
    <>
      <section className="greeting-hero">
        <time dateTime={toKey(today)}><CalendarDays size={17} /> {dateLabel(today)}</time>
        <h1>{greeting}{name ? `, ${name}` : ''}.</h1>
        <button type="button" className="hero-button" onClick={onToday}>Open Today <ArrowRight size={17} /></button>
      </section>
      <div className="dashboard-columns">
        <AffirmationEditor tracker={tracker} today={today} showHistory />
        <TodayList tracker={tracker} today={today} due={due} onAdd={onAdd} onOpenHabit={onOpenHabit} onTemplates={onTemplates} />
      </div>
    </>
  )
}

export function TodayView({ tracker, today, due, onAdd, onOpenHabit, onTemplates, onSelectDay }: HabitViewProps & {
  due: TrackedHabit[]
  onSelectDay: (key: string) => void
}) {
  return (
    <>
      <div className="page-heading"><h1>Today</h1><p>{formatDay(today)}</p></div>
      <div className="dashboard-columns today-columns">
        <TodayList tracker={tracker} today={today} due={due} onAdd={onAdd} onOpenHabit={onOpenHabit} onTemplates={onTemplates} focus />
        <AffirmationEditor tracker={tracker} today={today} />
      </div>
      {!!tracker.journal.habits.length && <WeeklyReview journal={tracker.journal} today={today} onSelectDay={onSelectDay} />}
    </>
  )
}

function TodayList({ tracker, today, due, onAdd, onOpenHabit, onTemplates, focus }: HabitViewProps & { due: TrackedHabit[]; focus?: boolean }) {
  const key = toKey(today)
  const done = due.filter((habit) => isComplete(habit, tracker.journal.logs[habit.id]?.[key])).length
  const frozen = due.filter((habit) => tracker.journal.logs[habit.id]?.[key]?.frozen).length
  const ordered = focus ? focusQueue(due, tracker.journal, today) : due

  return (
    <section className="panel today-list">
      <div className="panel-heading">
        <span className="section-icon"><Leaf size={19} /></span>
        <div><h2>{focus ? 'Today’s Focus' : 'Today’s habits'}</h2>
          {!!due.length && <p aria-live="polite">{done} of {due.length} complete{frozen > 0 && ` · ${frozen} frozen`}</p>}
        </div>
      </div>
      {due.length ? (
        <ul className="habit-list">
          {ordered.map((habit) => <HabitRow key={habit.id} habit={habit} tracker={tracker} today={today} onOpenHabit={onOpenHabit} showControl />)}
        </ul>
      ) : (
        <div className="empty">
          <p>{tracker.journal.habits.length ? 'You have no habits due today.' : 'Create your first habit to start tracking.'}</p>
          <div className="chips">
            <button className="secondary" type="button" onClick={onAdd}><Plus size={16} /> New habit</button>
            {!tracker.journal.habits.length && <button className="secondary" type="button" onClick={onTemplates}>Quick-Start Templates</button>}
          </div>
        </div>
      )}
    </section>
  )
}

function HabitRow({ habit, tracker, today, onOpenHabit, showControl, manageArchive }: Pick<HabitViewProps, 'tracker' | 'today' | 'onOpenHabit'> & {
  habit: TrackedHabit
  showControl: boolean
  manageArchive?: boolean
}) {
  const key = toKey(today)
  const logs = tracker.journal.logs[habit.id] ?? {}
  const log = logs[key]
  const write = (next: Parameters<CloudJournal['writeLog']>[2]) => tracker.writeLog(habit.id, key, next)
  const weekly = habit.schedule === 'weekly' ? weekProgress(habit, logs, startOfWeekMonday(today), key) : null
  return (
    <li className="habit-row">
      <button className="habit-name" type="button" onClick={() => onOpenHabit(habit.id)}>
        <EntryIcon habit={habit} />
        <span><strong>{habit.name}</strong><small>{habit.archived ? 'Archived · ' : ''}{categoryLabel(habit)} · {scheduleLabel(habit)}</small></span>
      </button>
      {manageArchive && <button type="button" className="icon-button" aria-label={habit.archived ? `Restore ${habit.name}` : `Archive ${habit.name}`}
        onClick={() => tracker.updateArchive(habit, !habit.archived, key)}>
        {habit.archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
      </button>}
      {weekly && <span className="weekly-caption">{weekly.done}/{weekly.target} this week</span>}
      {log?.frozen && <span className="freeze-status"><Snowflake size={14} /> Frozen</span>}
      {showControl && <EntryControl habit={habit} log={log} onChange={write} />}
      {!showControl && <button className="icon-button history-shortcut" type="button" aria-label={`Open ${habit.name} history`} onClick={() => onOpenHabit(habit.id)}><ArrowRight size={18} /></button>}
      {showControl && <EntryReflection key={key} habit={habit} log={log} onChange={write} />}
    </li>
  )
}

export function HabitLibrary({ tracker, today, onAdd, onOpenHabit, due, onTemplates }: HabitViewProps & { due: TrackedHabit[] }) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState<'active' | 'archived'>('active')
  const labels = Array.from(new Set(tracker.journal.habits.map(categoryLabel))).sort()
  const query = search.trim().toLocaleLowerCase()
  const matches = tracker.journal.habits.filter((habit) =>
    habit.archived === (status === 'archived') &&
    (!category || categoryLabel(habit) === category) &&
    `${habit.name} ${categoryLabel(habit)} ${habit.unit}`.toLocaleLowerCase().includes(query))
  const dueIds = new Set(due.map(({ id }) => id))

  return (
    <>
      <div className="page-heading"><h1>Habits</h1><p>{tracker.journal.habits.filter((habit) => !habit.archived).length} active</p></div>
      <section className="panel">
        {!!tracker.journal.habits.length && <div className="library-filters">
          <div className="chips" role="group" aria-label="Habit status">
            <button type="button" className="pill" aria-pressed={status === 'active'} onClick={() => setStatus('active')}>Active</button>
            <button type="button" className="pill" aria-pressed={status === 'archived'} onClick={() => setStatus('archived')}>Archived</button>
          </div>
          <label className="search-field"><Search size={18} /><input aria-label="Search habits" type="search" placeholder="Search habits" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
          <div className="chips" aria-label="Filter by category">
            <button type="button" className="pill" aria-pressed={!category} onClick={() => setCategory('')}>All habits</button>
            {labels.map((label) => <button type="button" key={label} className="pill" aria-pressed={category === label} onClick={() => setCategory(label)}>{label}</button>)}
          </div>
        </div>}
        {matches.length ? (
          <ul className="habit-list">
            {matches.map((habit) => <HabitRow key={habit.id} habit={habit} tracker={tracker} today={today} onOpenHabit={onOpenHabit} showControl={dueIds.has(habit.id)} manageArchive />)}
          </ul>
        ) : <div className="empty"><p>{tracker.journal.habits.length ? 'No habits match your filters.' : 'Your habit list is empty.'}</p>
          {!tracker.journal.habits.length && <div className="chips">
            <button className="secondary" type="button" onClick={onAdd}><Plus size={16} /> New habit</button>
            <button className="secondary" type="button" onClick={onTemplates}>Quick-Start Templates</button>
          </div>}
        </div>}
      </section>
    </>
  )
}

import { useId, useState, type CSSProperties, type FormEvent } from 'react'
import { Check, Snowflake } from 'lucide-react'
import { HABIT_ICON_MAP } from '../lib/icons'
import { colors, isComplete, moods, updateProgress, type HabitLog, type Mood, type TrackedHabit } from '../lib/tracking'

export function EntryIcon({ habit }: { habit: TrackedHabit }) {
  const Icon = Object.hasOwn(HABIT_ICON_MAP, habit.icon) ? HABIT_ICON_MAP[habit.icon] : null
  return (
    <span className="entry-icon" style={{ '--habit-color': colors[habit.color] } as CSSProperties} aria-hidden="true">
      {Icon ? <Icon size={19} /> : habit.icon}
    </span>
  )
}

const formatValue = new Intl.NumberFormat(undefined, { maximumFractionDigits: 5 })

export function EntryControl({ habit, log, onChange }: {
  habit: TrackedHabit
  log?: HabitLog
  onChange: (log: HabitLog | null) => void
}) {
  const done = isComplete(habit, log)
  const value = log?.value ?? 0
  const [draft, setDraft] = useState<{ base: number; text: string }>()
  const amount = draft?.base === value ? draft.text : value ? String(value) : ''

  if (habit.kind === 'binary') {
    return (
      <button type="button" className="check-button" aria-label={`Complete ${habit.name}`} aria-pressed={done}
        onClick={() => onChange(updateProgress(log, done ? 0 : 1))}>
        {log?.frozen ? <Snowflake size={17} /> : <Check size={18} strokeWidth={2.5} />}
      </button>
    )
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    const next = Number(amount)
    if (!Number.isFinite(next) || next < 0 || next > 1e9) return
    setDraft(undefined)
    onChange(updateProgress(log, next))
  }

  return (
    <div className="numeric-control">
      <div className="progress-caption">
        <span>{formatValue.format(value)} / {formatValue.format(habit.goal)} {habit.unit}</span>
        {log?.frozen && <span><Snowflake size={13} /> Frozen</span>}
      </div>
      <progress aria-label={`${habit.name} progress`} value={Math.min(value, habit.goal)} max={habit.goal} />
      <form onSubmit={submit} className="numeric-form">
        <input aria-label={`${habit.name} amount`} type="number" inputMode="decimal" min={0} max={1e9} step="any" placeholder="0"
          value={amount} onChange={(event) => setDraft({ base: value, text: event.target.value })} />
        <button type="submit" className="secondary">Save</button>
      </form>
    </div>
  )
}

export function EntryReflection({ habit, log, onChange }: {
  habit: TrackedHabit
  log?: HabitLog
  onChange: (log: HabitLog) => void
}) {
  const labelId = useId()
  const [draft, setDraft] = useState<string>()
  if (!log || !(isComplete(habit, log) || log.note || log.mood)) return null
  const note = draft ?? log.note ?? ''
  return (
    <div className="entry-reflection">
      <div className="reflection-actions">
        <div className="chips" role="group" aria-label={`Energy for ${habit.name}`}>
          {(Object.keys(moods) as Mood[]).map((mood) => (
            <button key={mood} type="button" className="pill" aria-pressed={log.mood === mood}
              onClick={() => onChange({ ...log, mood: log.mood === mood ? null : mood })}>{moods[mood]}</button>
          ))}
        </div>
      </div>
      <details>
        <summary aria-label={`Reflection for ${habit.name}`}>{log.note ? 'Edit reflection note' : 'Add a reflection note'}</summary>
        <form className="reflection-fields" onSubmit={(event) => {
          event.preventDefault()
          onChange({ ...log, note: note.trim() || null })
          setDraft(undefined)
        }}>
          <label className="field" htmlFor={labelId}>Daily note</label>
          <textarea id={labelId} rows={2} maxLength={280} value={note} onChange={(event) => setDraft(event.target.value)} />
          <button type="submit" className="secondary" disabled={note.trim() === (log.note ?? '')}>Save note</button>
        </form>
      </details>
    </div>
  )
}

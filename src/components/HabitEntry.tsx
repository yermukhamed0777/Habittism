import { useState, type CSSProperties, type FormEvent } from 'react'
import { Check, Snowflake } from 'lucide-react'
import { HABIT_ICON_MAP } from '../lib/icons'
import { colors, isComplete, type HabitLog, type TrackedHabit } from '../lib/tracking'

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
        onClick={() => onChange(done ? null : { value: 1, frozen: false })}>
        {log?.frozen ? <Snowflake size={17} /> : <Check size={18} strokeWidth={2.5} />}
      </button>
    )
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    const next = Number(amount)
    if (!Number.isFinite(next) || next < 0 || next > 1e9) return
    setDraft(undefined)
    onChange(next > 0 ? { value: next, frozen: false } : null)
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

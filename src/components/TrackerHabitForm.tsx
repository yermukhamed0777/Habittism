import { useId, useState, type FormEvent } from 'react'
import { Check, Plus } from 'lucide-react'
import { HABIT_ICON_MAP, ICON_CHOICES } from '../lib/icons'
import { categories, colors, weekdays, type Accent, type Category, type HabitInput, type Schedule } from '../lib/tracking'
import { JournalDialog } from './JournalDialog'

const accentNames: Record<Accent, string> = {
  iris: 'Lilac',
  aqua: 'Teal',
  mint: 'Sage',
  amber: 'Ochre',
  rose: 'Rose',
  violet: 'Violet',
  indigo: 'Indigo',
  cobalt: 'Cobalt',
  sky: 'Sky',
  cyan: 'Cyan',
  emerald: 'Emerald',
  lime: 'Lime',
  gold: 'Gold',
  tangerine: 'Tangerine',
  coral: 'Coral',
  magenta: 'Magenta',
}

export function TrackerHabitForm({ onSave, onClose, habit }: {
  onSave: (habit: HabitInput) => void
  onClose: () => void
  habit?: HabitInput
}) {
  const fieldId = useId()
  const [schedule, setSchedule] = useState<Schedule>('daily')
  const [days, setDays] = useState<number[]>([1, 3, 5])
  const [category, setCategory] = useState<Category>(habit?.category ?? 'health')
  const [kind, setKind] = useState<HabitInput['kind']>('binary')
  const [icon, setIcon] = useState(habit?.icon ?? 'target')
  const [customIcon, setCustomIcon] = useState(habit && !ICON_CHOICES.includes(habit.icon) ? habit.icon : '')
  const [color, setColor] = useState<Accent>(habit?.color ?? 'mint')
  const [error, setError] = useState('')

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    const field = (name: string) => String(fields.get(name) ?? '').trim()
    const name = field('name')
    if (!name) {
      setError('Enter a habit name.')
      return
    }
    const details = {
      name, icon: customIcon.trim() || icon, color, category,
      customCategory: category === 'custom' ? field('customCategory') || null : null,
    }
    if (habit) {
      onSave({ ...habit, ...details })
      onClose()
      return
    }
    const goal = kind === 'numeric' ? Number(field('goal')) : 1
    if ((schedule === 'weekdays' && !days.length) || !(goal > 0 && goal <= 1e9)) {
      setError('Select days for a weekday schedule and use a goal greater than zero.')
      return
    }
    onSave({
      ...details, kind, goal, schedule,
      weekdays: schedule === 'weekdays' ? days : [],
      weeklyTarget: schedule === 'weekly' ? Number(field('target')) : 7,
      unit: kind === 'numeric' ? field('unit') : '',
    })
    onClose()
  }

  return (
    <JournalDialog title={habit ? 'Edit habit details' : 'New habit'} onClose={onClose}>
      <form className="habit-form" onSubmit={submit}>
        <label className="field">Habit name <input name="name" required maxLength={80} placeholder="Read 20 pages" defaultValue={habit?.name} /></label>
        {!habit && <>
        <div className="form-columns">
          <div className="field">
            <label htmlFor={`${fieldId}-schedule`}>Schedule</label>
            <select id={`${fieldId}-schedule`} value={schedule} onChange={(event) => setSchedule(event.target.value as Schedule)}>
              <option value="daily">Every day</option>
              <option value="weekdays">Specific weekdays</option>
              <option value="weekly">Weekly frequency</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor={`${fieldId}-kind`}>Tracking type</label>
            <select id={`${fieldId}-kind`} value={kind} onChange={(event) => setKind(event.target.value as HabitInput['kind'])}>
              <option value="binary">Check-in</option>
              <option value="numeric">Numeric goal</option>
            </select>
          </div>
        </div>
        {schedule === 'weekdays' && (
          <fieldset className="choice-group">
            <legend>Scheduled days</legend>
            <div className="chips">
              {weekdays.map(({ value, label }) => (
                <button key={value} type="button" className="pill" aria-pressed={days.includes(value)}
                  onClick={() => setDays((previous) => previous.includes(value) ? previous.filter((day) => day !== value) : [...previous, value])}>{label}</button>
              ))}
            </div>
          </fieldset>
        )}
        {schedule === 'weekly' && (
          <div className="field">
            <label htmlFor={`${fieldId}-target`}>Days per week</label>
            <select id={`${fieldId}-target`} name="target" defaultValue="4">{[1, 2, 3, 4, 5, 6, 7].map((count) => <option key={count}>{count}</option>)}</select>
          </div>
        )}
        {kind === 'numeric' && (
          <div className="form-columns">
            <label className="field">Goal per day <input name="goal" type="number" step="any" max={1e9} required placeholder="20" /></label>
            <label className="field">Unit <input name="unit" maxLength={24} placeholder="pages" /></label>
          </div>
        )}
        </>}
        <div className="form-columns">
          <div className="field">
            <label htmlFor={`${fieldId}-category`}>Category</label>
            <select id={`${fieldId}-category`} value={category} onChange={(event) => setCategory(event.target.value as Category)}>
              {Object.entries(categories).map(([key, name]) => <option key={key} value={key}>{name}</option>)}
            </select>
          </div>
          {category === 'custom' && <label className="field">Custom category <input name="customCategory" maxLength={40} placeholder="Learning" defaultValue={habit?.customCategory ?? ''} /></label>}
        </div>
        <fieldset className="choice-group">
          <legend>Icon</legend>
          <div className="chips">
            {ICON_CHOICES.map((choice) => {
              const Icon = HABIT_ICON_MAP[choice]
              return <button key={choice} type="button" className="icon-button" aria-pressed={!customIcon && icon === choice} aria-label={choice}
                onClick={() => { setIcon(choice); setCustomIcon('') }}><Icon size={18} /></button>
            })}
          </div>
        </fieldset>
        <label className="field">Custom icon <input maxLength={32} placeholder="Paste an emoji" value={customIcon} onChange={(event) => setCustomIcon(event.target.value)} /></label>
        <fieldset className="choice-group">
          <legend>Accent color</legend>
          <div className="color-grid">
            {(Object.keys(colors) as Accent[]).map((accent) => (
              <button key={accent} type="button" className="color-choice" aria-label={accentNames[accent]}
                title={accentNames[accent]} aria-pressed={color === accent} onClick={() => setColor(accent)}>
                <span style={{ backgroundColor: colors[accent] }}>{color === accent && <Check size={16} aria-hidden="true" />}</span>
              </button>
            ))}
          </div>
          <p className="color-caption" aria-live="polite">{accentNames[color]}</p>
        </fieldset>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="dialog-actions"><button type="submit" className="primary">
          {habit ? <><Check size={16} /> Save details</> : <><Plus size={16} /> Create habit</>}
        </button></div>
      </form>
    </JournalDialog>
  )
}

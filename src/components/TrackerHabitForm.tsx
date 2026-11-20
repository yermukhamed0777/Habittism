import { useId, useState, type FormEvent } from 'react'
import { Plus } from 'lucide-react'
import { HABIT_ICON_MAP, ICON_CHOICES } from '../lib/icons'
import { categories, colors, weekdays, type Accent, type Category, type HabitInput, type Schedule } from '../lib/tracking'
import { JournalDialog } from './JournalDialog'

const accentNames: Record<Accent, string> = { iris: 'Lilac', aqua: 'Teal', mint: 'Sage', amber: 'Ochre', rose: 'Rose' }

export function TrackerHabitForm({ onCreate, onClose }: { onCreate: (habit: HabitInput) => void; onClose: () => void }) {
  const fieldId = useId()
  const [schedule, setSchedule] = useState<Schedule>('daily')
  const [days, setDays] = useState<number[]>([1, 3, 5])
  const [category, setCategory] = useState<Category>('health')
  const [kind, setKind] = useState<HabitInput['kind']>('binary')
  const [icon, setIcon] = useState('target')
  const [color, setColor] = useState<Accent>('mint')
  const [error, setError] = useState('')

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    const field = (name: string) => String(fields.get(name) ?? '').trim()
    const name = field('name')
    const goal = kind === 'numeric' ? Number(field('goal')) : 1
    if (!name || (schedule === 'weekdays' && !days.length) || !(goal > 0 && goal <= 1e9)) {
      setError('Enter a habit name, select days for a weekday schedule, and use a goal greater than zero.')
      return
    }
    onCreate({
      name, kind, goal, color, category, schedule,
      icon: field('customIcon') || icon,
      customCategory: category === 'custom' ? field('customCategory') || null : null,
      weekdays: schedule === 'weekdays' ? days : [],
      weeklyTarget: schedule === 'weekly' ? Number(field('target')) : 7,
      unit: kind === 'numeric' ? field('unit') : '',
    })
    onClose()
  }

  return (
    <JournalDialog title="New habit" onClose={onClose}>
      <form className="habit-form" onSubmit={submit}>
        <label className="field">Habit name <input name="name" required maxLength={80} placeholder="Read 20 pages" /></label>
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
        <div className="form-columns">
          <div className="field">
            <label htmlFor={`${fieldId}-category`}>Category</label>
            <select id={`${fieldId}-category`} value={category} onChange={(event) => setCategory(event.target.value as Category)}>
              {Object.entries(categories).map(([key, name]) => <option key={key} value={key}>{name}</option>)}
            </select>
          </div>
          {category === 'custom' && <label className="field">Custom category <input name="customCategory" maxLength={40} placeholder="Learning" /></label>}
        </div>
        <fieldset className="choice-group">
          <legend>Icon</legend>
          <div className="chips">
            {ICON_CHOICES.map((choice) => {
              const Icon = HABIT_ICON_MAP[choice]
              return <button key={choice} type="button" className="icon-button" aria-pressed={icon === choice} aria-label={choice} onClick={() => setIcon(choice)}><Icon size={18} /></button>
            })}
          </div>
        </fieldset>
        <label className="field">Custom icon <input name="customIcon" maxLength={32} placeholder="Paste an emoji" /></label>
        <fieldset className="choice-group">
          <legend>Accent color</legend>
          <div className="chips">
            {Object.entries(colors).map(([key, hex]) => (
              <button key={key} type="button" className="color-choice" aria-label={accentNames[key as Accent]} aria-pressed={color === key}
                onClick={() => setColor(key as Accent)} style={{ backgroundColor: hex }} />
            ))}
          </div>
        </fieldset>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="dialog-actions"><button type="submit" className="primary"><Plus size={16} /> Create habit</button></div>
      </form>
    </JournalDialog>
  )
}

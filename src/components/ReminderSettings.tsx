import { useState, type FormEvent } from 'react'
import { Bell } from 'lucide-react'
import type { useReminder } from '../hooks/useReminder'

export function ReminderSettings({ reminder }: { reminder: ReturnType<typeof useReminder> }) {
  const [time, setTime] = useState(reminder.preference.time)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  async function update(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setSaved(false)
    setSaved(await reminder.save(time, true))
    setBusy(false)
  }

  return (
    <section className="settings-section">
      <h3><Bell size={17} /> Habit reminders</h3>
      <p>Get one notification a day for unfinished habits while Hexis is open. Reminders use this browser’s local time.</p>
      {reminder.supported ? (
        <form className="reminder-form" onSubmit={(event) => void update(event)}>
          <label className="field">Reminder time <input type="time" required value={time} onChange={(event) => { setTime(event.target.value); setSaved(false) }} /></label>
          <button type="submit" className="secondary" disabled={busy}>{reminder.preference.enabled ? 'Save time' : 'Enable reminders'}</button>
          {reminder.preference.enabled && <button type="button" className="text-button" disabled={busy} onClick={() => {
            setSaved(false)
            void reminder.save(reminder.preference.time, false)
          }}>Turn off</button>}
        </form>
      ) : <p>This browser does not offer notifications here.</p>}
      {reminder.error && <p className="error" role="alert">{reminder.error}</p>}
      {saved && <p role="status">Reminder saved.</p>}
    </section>
  )
}

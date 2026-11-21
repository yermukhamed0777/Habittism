import { archiveHistory, categoryLabel, type Journal } from './tracking'

function cell(value: string | number | boolean | null | undefined) {
  const text = String(value ?? '')
  const safe = typeof value === 'string' && /^[\s]*[=+\-@\t\r]/.test(value) ? `'${text}` : text
  return `"${safe.replace(/"/g, '""')}"`
}

function journalCsv(journal: Journal) {
  const header = [
    'record_type', 'habit_id', 'date', 'habit', 'category', 'schedule', 'weekdays_sunday_0',
    'weekly_target', 'tracking_type', 'goal', 'unit', 'value', 'frozen', 'mood', 'note', 'affirmation',
    'icon', 'color', 'archived', 'archive_periods',
  ]
  const lines = [header.map(cell).join(',')]

  for (const habit of journal.habits) {
    lines.push([
      'habit', habit.id, habit.createdOn, habit.name, categoryLabel(habit), habit.schedule, habit.weekdays.join(' '),
      habit.schedule === 'weekly' ? habit.weeklyTarget : null, habit.kind, habit.goal, habit.unit,
      null, null, null, null, null, habit.icon, habit.color, habit.archived, JSON.stringify(archiveHistory(habit)),
    ].map(cell).join(','))
    for (const [day, log] of Object.entries(journal.logs[habit.id] ?? {}).sort()) {
      lines.push([
        'check_in', habit.id, day, habit.name, null, null, null, null, null, null, null,
        log.value, log.frozen, log.mood, log.note, null, null, null, null, null,
      ].map(cell).join(','))
    }
  }
  for (const [day, affirmation] of Object.entries(journal.affirmations).sort()) {
    if (!affirmation.trim()) continue
    lines.push([
      'affirmation', null, day, null, null, null, null, null, null, null, null,
      null, null, null, null, affirmation, null, null, null, null,
    ].map(cell).join(','))
  }
  return '\ufeff' + lines.join('\r\n') + '\r\n'
}

export function downloadJournal(journal: Journal, format: 'json' | 'csv', date: string) {
  const contents = format === 'csv' ? journalCsv(journal) : JSON.stringify({ version: 1, ...journal }, null, 2)
  const url = URL.createObjectURL(new Blob([contents], {
    type: format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json',
  }))
  const link = document.createElement('a')
  link.href = url
  link.download = `habittism-${date}.${format}`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

import { useState, type ChangeEvent } from 'react'
import { Upload } from 'lucide-react'
import { parseLegacyJournal, type LegacyJournal } from '../lib/legacyJournal'
import { detectFormat, parseModernJournal, type ParsedModernJournal } from '../lib/journalImport'
import { JournalDialog } from './JournalDialog'

export type ImportData =
  | { format: 'modern'; data: ParsedModernJournal }
  | { format: 'legacy'; data: LegacyJournal }

export function LegacyImport({ browserBackup, today, email, onImport, onClose }: {
  browserBackup: LegacyJournal | null
  today: string
  email?: string
  onImport: (backup: ImportData, fromBrowser: boolean) => Promise<void>
  onClose: () => void
}) {
  const [fileBackup, setFileBackup] = useState<ImportData>()
  const [fileSelected, setFileSelected] = useState(false)
  const [loadingFile, setLoadingFile] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')

  const activeBackup: ImportData | null = fileSelected
    ? (fileBackup ?? null)
    : browserBackup
    ? { format: 'legacy', data: browserBackup }
    : null

  async function readFile(event: ChangeEvent<HTMLInputElement>) {
    setError('')
    setFileBackup(undefined)
    const file = event.target.files?.[0]
    setFileSelected(!!file)
    if (!file) return
    setLoadingFile(true)
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error('Choose a JSON backup under 10 MB.')
      const raw = await file.text()
      const format = detectFormat(raw)
      if (format === 'modern') {
        const parsed = parseModernJournal(raw)
        if (!parsed) throw new Error('This modern backup is invalid or has no Habittism records to import.')
        setFileBackup({ format: 'modern', data: parsed })
      } else if (format === 'legacy') {
        const parsed = parseLegacyJournal(raw, today)
        if (!parsed) throw new Error('This legacy backup has no Habittism records to import.')
        setFileBackup({ format: 'legacy', data: parsed })
      } else {
        throw new Error('This file is not a valid Habittism backup format.')
      }
    } catch (reason) {
      setError(reason instanceof SyntaxError ? 'This file is not a valid JSON backup.' : reason instanceof Error ? reason.message : 'The backup could not be opened.')
    } finally {
      setLoadingFile(false)
    }
  }

  async function importBackup() {
    if (!activeBackup || importing || loadingFile) return
    setImporting(true)
    setError('')
    try {
      await onImport(activeBackup, !fileSelected)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not import your backup. Please try again.')
      setImporting(false)
    }
  }

  const preview = activeBackup?.format === 'modern' ? (
    <p>
      {activeBackup.data.preview.habits} habits
      {activeBackup.data.preview.numericHabits > 0 && ` (${activeBackup.data.preview.numericHabits} numeric)`}
      {activeBackup.data.preview.archivedHabits > 0 && ` (${activeBackup.data.preview.archivedHabits} archived)`} ·{' '}
      {activeBackup.data.preview.checkIns} check-ins ·{' '}
      {activeBackup.data.preview.affirmations} affirmations
    </p>
  ) : activeBackup?.format === 'legacy' ? (
    <p>
      {activeBackup.data.habits.length} habits · {activeBackup.data.logs.length} check-ins ·{' '}
      {activeBackup.data.affirmations.length} affirmations
    </p>
  ) : null

  return (
    <JournalDialog title="Import previous data" subtitle={email ? `Import into ${email}` : 'Import into your current account'} onClose={onClose} busy={importing}>
      <div className="import-form">
        {preview}
        <label className="field">{browserBackup ? 'Or choose a backup file' : 'Habittism backup file'}
          <input type="file" accept=".json,application/json" onChange={(event) => void readFile(event)} disabled={importing || loadingFile} />
        </label>
        {!browserBackup && <p>Supports modern Habittism exports and legacy browser backups.</p>}
        {error && <p className="error" role="alert">{error}</p>}
      </div>
      <div className="dialog-actions">
        <button type="button" className="primary" disabled={!activeBackup || importing || loadingFile} onClick={() => void importBackup()}>
          <Upload size={17} /> {importing ? 'Importing…' : 'Import data'}
        </button>
      </div>
    </JournalDialog>
  )
}

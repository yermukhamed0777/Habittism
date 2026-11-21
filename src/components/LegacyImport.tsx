import { useState, type ChangeEvent } from 'react'
import { Upload } from 'lucide-react'
import type { LegacyJournal } from '../lib/legacyJournal'
import { parseBackup, type ImportData } from '../lib/journalImport'
import { JournalDialog } from './JournalDialog'

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
      setFileBackup(parseBackup(await file.text(), today))
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
      {activeBackup.preview.habits} habits
      {activeBackup.preview.numericHabits > 0 && ` (${activeBackup.preview.numericHabits} numeric)`}
      {activeBackup.preview.archivedHabits > 0 && ` (${activeBackup.preview.archivedHabits} archived)`} ·{' '}
      {activeBackup.preview.checkIns} check-ins ·{' '}
      {activeBackup.preview.affirmations} affirmations
    </p>
  ) : activeBackup?.format === 'legacy' ? (
    <p>
      {activeBackup.data.habits.length} habits · {activeBackup.data.logs.length} check-ins ·{' '}
      {activeBackup.data.affirmations.length} affirmations
    </p>
  ) : null

  return (
    <JournalDialog title="Import a backup" subtitle={email ? `Import into ${email}` : 'Import into your current account'} onClose={onClose} busy={importing}>
      <div className="import-form">
        {preview}
        <label className="field">{browserBackup ? 'Or choose a backup file' : 'Habittism backup file'}
          <input type="file" accept=".json,application/json" onChange={(event) => void readFile(event)} disabled={importing || loadingFile} />
        </label>
        <p>Adds missing records from a Habittism JSON export or older browser backup. Existing check-ins and affirmations are kept.</p>
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

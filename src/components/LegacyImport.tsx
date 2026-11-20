import { useState, type ChangeEvent } from 'react'
import { Upload } from 'lucide-react'
import { parseLegacyJournal, type LegacyJournal } from '../lib/legacyJournal'
import { JournalDialog } from './JournalDialog'

export function LegacyImport({ browserBackup, today, email, onImport, onClose }: {
  browserBackup: LegacyJournal | null
  today: string
  email?: string
  onImport: (backup: LegacyJournal, fromBrowser: boolean) => Promise<void>
  onClose: () => void
}) {
  const [fileBackup, setFileBackup] = useState<LegacyJournal>()
  const [fileSelected, setFileSelected] = useState(false)
  const [loadingFile, setLoadingFile] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')
  const backup = fileSelected ? fileBackup : browserBackup

  async function readFile(event: ChangeEvent<HTMLInputElement>) {
    setError('')
    setFileBackup(undefined)
    const file = event.target.files?.[0]
    setFileSelected(!!file)
    if (!file) return
    setLoadingFile(true)
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error('Choose a JSON backup under 10 MB.')
      const parsed = parseLegacyJournal(await file.text(), today)
      if (!parsed) throw new Error('This backup has no Habittism records to import.')
      setFileBackup(parsed)
    } catch (reason) {
      setError(reason instanceof SyntaxError ? 'This file is not a valid JSON backup.' : reason instanceof Error ? reason.message : 'The backup could not be opened.')
    } finally {
      setLoadingFile(false)
    }
  }

  async function importBackup() {
    if (!backup || importing || loadingFile) return
    setImporting(true)
    setError('')
    try {
      await onImport(backup, !fileSelected)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not import your backup. Please try again.')
      setImporting(false)
    }
  }

  return (
    <JournalDialog title="Import previous data" subtitle={email ? `Import into ${email}` : 'Import into your current account'} onClose={onClose} busy={importing}>
      <div className="import-form">
        {backup && <p>{backup.habits.length} habits · {backup.logs.length} check-ins · {backup.affirmations.length} affirmations</p>}
        <label className="field">{browserBackup ? 'Or choose a backup file' : 'Habittism backup file'}
          <input type="file" accept=".json,application/json" onChange={(event) => void readFile(event)} disabled={importing || loadingFile} />
        </label>
        {!browserBackup && <p>Use a JSON backup exported from the browser where you previously used Habittism.</p>}
        {error && <p className="error" role="alert">{error}</p>}
      </div>
      <div className="dialog-actions">
        <button type="button" className="primary" disabled={!backup || importing || loadingFile} onClick={() => void importBackup()}>
          <Upload size={17} /> {importing ? 'Importing…' : 'Import data'}
        </button>
      </div>
    </JournalDialog>
  )
}

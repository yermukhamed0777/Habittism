import { useEffect, useMemo, useState } from 'react'
import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { CalendarDays, ChartNoAxesColumnIncreasing, Download, House, ListChecks, Plus, Search, Settings, Sun, Target } from 'lucide-react'
import { AuthShell } from './components/AuthGate'
import { JournalDialog } from './components/JournalDialog'
import { CommandMenu, type WorkspaceCommand } from './components/CommandMenu'
import { InstallApp } from './components/InstallApp'
import { LegacyImport, type ImportData } from './components/LegacyImport'
import { ReminderSettings } from './components/ReminderSettings'
import { StarterPacks } from './components/StarterPacks'
import { ThemeToggle } from './components/ThemeToggle'
import { TrackerCalendar } from './components/TrackerCalendar'
import { TrackerHabitForm } from './components/TrackerHabitForm'
import { TrackerDay, TrackerHistory } from './components/TrackerHistory'
import { TrackerInsights } from './components/TrackerInsights'
import { DailyGreeting, HabitLibrary, TodayView } from './components/TrackerViews'
import { useToday } from './hooks/useToday'
import { useReminder } from './hooks/useReminder'
import { toKey } from './lib/dates'
import { habitRepository, type HabitRepository } from './lib/habitRepository'
import { claimGuestJournal, loadGuestJournal } from './lib/guestJournal'
import { downloadJournal } from './lib/journalExport'
import { useInstallState } from './lib/installApp'
import { browserBackupImported, markBrowserBackupImported, readBrowserBackup } from './lib/legacyJournal'
import { dayEntries, isComplete, isOnToday, type Journal } from './lib/tracking'
import { useCloudJournal } from './store/useCloudJournal'

const navigation = [
  { id: 'greeting', label: 'Greeting', icon: House },
  { id: 'today', label: 'Today', icon: Sun },
  { id: 'habits', label: 'Habits', icon: ListChecks },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'insights', label: 'Insights', icon: ChartNoAxesColumnIncreasing },
] as const

type View = (typeof navigation)[number]['id']
type Dialog = { kind: 'create' | 'settings' | 'import' | 'importing' | 'templates' | 'commands' | 'install' } | { kind: 'day'; day: string }
  | { kind: 'habit'; id: string; day?: string } | { kind: 'edit'; id: string }
type Account = { client: SupabaseClient; session: Session }

function initialView(): View {
  const requested = new URLSearchParams(window.location.search).get('view')
  return navigation.find(({ id }) => id === requested)?.id ?? 'greeting'
}

function displayName(session: Session) {
  const name = session.user.user_metadata.full_name ?? session.user.user_metadata.name
  if (typeof name === 'string' && name.trim()) return name.trim().slice(0, 60)
  const first = session.user.email?.split(/[@._+-]/, 1)[0] ?? ''
  return first.charAt(0).toLocaleUpperCase() + first.slice(1, 40)
}

export default function App({ client, session }: Account) {
  const repository = useMemo(() => habitRepository(client, session.user.id), [client, session.user.id])
  const [attempt, setAttempt] = useState(0)
  const [initial, setInitial] = useState<Journal>()
  const [error, setError] = useState('')
  const [merged, setMerged] = useState(false)

  useEffect(() => {
    let active = true
    async function openJournal() {
      const guest = claimGuestJournal(session.user.id)
      if (guest) await repository.mergeGuest(guest.journal)
      const journal = await repository.load()
      if (active && guest) {
        guest.finish()
        setMerged(true)
      }
      return journal
    }
    void openJournal().then(
      (journal) => { if (active) setInitial(journal) },
      (reason) => { if (active) setError(reason instanceof Error ? reason.message : 'Could not load the journal.') },
    )
    return () => { active = false }
  }, [repository, attempt, session.user.id])

  if (initial) return <Dashboard account={{ client, session, repository }} initial={initial} merged={merged} />
  return <AuthShell>
    {error ? <>
      <h1>Couldn’t load your journal.</h1>
      <p role="alert">{error}</p>
      <p>Check that the Supabase schema and its migrations have been applied.</p>
      <div className="dialog-actions">
        <button type="button" className="primary" onClick={() => { setError(''); setAttempt((previous) => previous + 1) }}>Try again</button>
        <button type="button" className="secondary" onClick={() => void client.auth.signOut({ scope: 'local' })}>Sign out</button>
      </div>
    </> : <p role="status">Opening your journal…</p>}
  </AuthShell>
}

export function GuestApp({ openAccount }: { openAccount: () => void }) {
  const [initial] = useState(loadGuestJournal)
  return <Dashboard initial={initial} openAccount={openAccount} />
}

function Dashboard({ account, initial, openAccount, merged }: {
  account?: Account & { repository: HabitRepository }
  initial: Journal
  openAccount?: () => void
  merged?: boolean
}) {
  const { client, session, repository } = account ?? {}
  const userId = session?.user.id
  const tracker = useCloudJournal(initial, repository, userId)
  const installState = useInstallState()
  const [view, setView] = useState(initialView)
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const [accountError, setAccountError] = useState('')
  const [signingOut, setSigningOut] = useState(false)
  const today = useToday()
  const [browserBackup, setBrowserBackup] = useState(() => userId && !browserBackupImported(userId) ? readBrowserBackup(toKey(today)) : null)
  const [showImport, setShowImport] = useState(true)
  const [imported, setImported] = useState(false)
  const [showMerged, setShowMerged] = useState(merged)
  const [importError, setImportError] = useState('')
  const due = tracker.journal.habits.filter((habit) => isOnToday(habit, tracker.journal.logs[habit.id] ?? {}, today))
  const todayKey = toKey(today)
  const outstanding = due.filter((habit) => {
    const log = tracker.journal.logs[habit.id]?.[todayKey]
    return !log?.frozen && !isComplete(habit, log)
  }).length
  const reminder = useReminder(userId ?? 'guest', outstanding)
  const selectedHabit = (dialog?.kind === 'habit' || dialog?.kind === 'edit') && tracker.journal.habits.find((habit) => habit.id === dialog.id)
  const close = () => setDialog(null)
  const openHabit = (id: string, day?: string) => setDialog({ kind: 'habit', id, day })
  const onAdd = () => setDialog({ kind: 'create' })
  const onInstall = () => setDialog({ kind: 'install' })
  const habitView = { tracker, today, due, onAdd, onOpenHabit: openHabit, onTemplates: () => setDialog({ kind: 'templates' }) }

  function openView(next: View) {
    setView(next)
    window.scrollTo(0, 0)
  }

  useEffect(() => {
    function openCommands(event: KeyboardEvent) {
      if ((!event.ctrlKey && !event.metaKey) || event.key.toLowerCase() !== 'k' || event.repeat) return
      if (dialog && dialog.kind !== 'commands') return
      event.preventDefault()
      setDialog(dialog ? null : { kind: 'commands' })
    }
    window.addEventListener('keydown', openCommands)
    return () => window.removeEventListener('keydown', openCommands)
  }, [dialog])

  const commands: WorkspaceCommand[] = dialog?.kind === 'commands' ? [
    ...navigation.map(({ id, label, icon }) => ({ id, label, icon, detail: 'Page', run: () => openView(id) })),
    { id: 'new', label: 'New habit', detail: 'Action', icon: Plus, run: onAdd },
    { id: 'settings', label: 'Settings', detail: 'Action', icon: Settings, run: () => setDialog({ kind: 'settings' }) },
    { id: 'install', label: 'Install Habittism', detail: 'Action', icon: Download, run: onInstall },
    ...tracker.journal.habits.map((habit) => ({
      id: habit.id, label: habit.name, icon: Target, detail: habit.archived ? 'Archived habit' : 'Habit',
      run: () => openHabit(habit.id),
    })),
  ] : []

  async function importBackup(payload: ImportData, fromBrowser: boolean) {
    if (tracker.sync.pending) throw new Error('Wait for your changes to finish syncing.')
    if (payload.format === 'modern') {
      if (repository) {
        await repository.importModern(payload.data)
        tracker.setJournal(await repository.load())
      } else {
        tracker.restoreJournal(payload.data.journal)
      }
    } else {
      if (!repository || !userId) return
      await repository.importLegacy(payload.data)
      tracker.setJournal(await repository.load())
      if (fromBrowser) {
        markBrowserBackupImported(userId)
        setBrowserBackup(null)
      }
    }
    setImported(true)
    close()
  }

  async function importFromBrowser() {
    if (!browserBackup || tracker.sync.pending) return
    setImportError('')
    setDialog({ kind: 'importing' })
    try {
      await importBackup({ format: 'legacy', data: browserBackup }, true)
    } catch (reason) {
      setImportError(reason instanceof Error ? reason.message : 'Could not import your backup. Please try again.')
      close()
    }
  }

  async function signOut() {
    if (!client || tracker.sync.pending || signingOut) return
    setSigningOut(true)
    setAccountError('')
    try {
      const { error } = await client.auth.signOut({ scope: 'local' })
      if (error) throw error
    } catch (reason) {
      setAccountError(reason instanceof Error ? reason.message : 'Sign-out failed. Please try again.')
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <div className="workspace">
      <header className="site-header">
        <div className="header-inner">
          <button className="brand" type="button" onClick={() => openView('greeting')}>
            <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width={37} height={37} /> Habittism
          </button>
          <nav className="main-nav" aria-label="Workspace">
            {navigation.map(({ id, label, icon: Icon }) => <button key={id} type="button" aria-current={view === id ? 'page' : undefined}
              onClick={() => openView(id)}><Icon size={16} /> {label}</button>)}
          </nav>
          <div className="header-actions">
            <button className="icon-button" type="button" aria-label="Command menu" aria-keyshortcuts="Control+K Meta+K"
              title="Jump to (Ctrl/⌘ K)" onClick={() => setDialog({ kind: 'commands' })}><Search size={18} /></button>
            <ThemeToggle />
            <button className="icon-button" type="button" aria-label="Settings" onClick={() => setDialog({ kind: 'settings' })}><Settings size={19} /></button>
            <button className="primary header-add" type="button" onClick={onAdd} aria-label="New habit"><Plus size={17} /> <span>New habit</span></button>
          </div>
        </div>
      </header>
      <main className="workspace-main">
        {tracker.sync.error ? (
          <div className="sync-banner" role="alert"><span>Changes are waiting to sync. {tracker.sync.error}</span>
            <button type="button" className="secondary" onClick={() => void tracker.retry()}>Retry sync</button></div>
        ) : <div className="sync-status" data-pending={!!tracker.sync.pending} role="status">
          {tracker.sync.pending ? 'Saving changes…' : account ? 'All changes synced' : 'Guest journal'}
        </div>}
        {!account && <section className="import-banner">
          <div><strong>Try Habittism as a guest</strong><p>Sign in or create an account to sync this journal across devices.</p></div>
          <div className="chips">
            {installState !== 'installed' && <button className="secondary" type="button" onClick={onInstall}><Download size={16} /> Install app</button>}
            <button className="primary" type="button" onClick={openAccount}>Sign in or sign up</button>
          </div>
        </section>}
        {browserBackup && showImport && <section className="import-banner">
          <div><strong>Import your saved habits and affirmations</strong><p>Move this browser’s previous Habittism data into {session?.user.email ?? 'your account'}.</p>
            {importError && <p className="error" role="alert">{importError}</p>}
          </div>
          <div className="chips">
            <button type="button" className="secondary" onClick={() => setShowImport(false)}>Later</button>
            <button type="button" className="primary" disabled={!!tracker.sync.pending} onClick={() => void importFromBrowser()}>Import data</button>
          </div>
        </section>}
        {imported && <div className="import-banner" role="status">Your backup was imported.<button className="text-button" type="button" onClick={() => setImported(false)}>Dismiss</button></div>}
        {showMerged && <div className="import-banner" role="status">Your guest journal was merged.<button className="text-button" type="button" onClick={() => setShowMerged(false)}>Dismiss</button></div>}
        {view === 'greeting' && <DailyGreeting {...habitView} name={session ? displayName(session) : ''} onToday={() => openView('today')} />}
        {view === 'today' && <TodayView {...habitView} onSelectDay={(day) => setDialog({ kind: 'day', day })} />}
        {view === 'habits' && <HabitLibrary {...habitView} />}
        {view === 'calendar' && <TrackerCalendar journal={tracker.journal} today={today} onSelect={(day) => setDialog({ kind: 'day', day })} />}
        {view === 'insights' && <TrackerInsights journal={tracker.journal} today={today} session={session} onOpenHabit={openHabit} onSelectDay={(day) => setDialog({ kind: 'day', day })} />}
      </main>
      {dialog?.kind === 'create' && <TrackerHabitForm onClose={close} onSave={(habit) => tracker.createHabit(habit, todayKey)} />}
      {dialog?.kind === 'commands' && <CommandMenu commands={commands} onClose={close} />}
      {dialog?.kind === 'install' && <InstallApp onClose={close} />}
      {dialog?.kind === 'edit' && selectedHabit && <TrackerHabitForm habit={selectedHabit} onClose={close}
        onSave={(habit) => tracker.updateDetails(selectedHabit.id, habit)} />}
      {dialog?.kind === 'templates' && <StarterPacks onClose={close} onAdd={(habits) => tracker.createHabits(habits, todayKey)} />}
      {dialog?.kind === 'habit' && selectedHabit && <TrackerHistory key={selectedHabit.id} tracker={tracker} today={today}
        habit={selectedHabit} initialDay={dialog.day} onClose={close} onEdit={() => setDialog({ kind: 'edit', id: selectedHabit.id })} />}
      {dialog?.kind === 'day' && <TrackerDay tracker={tracker} day={dialog.day} today={today} onClose={close}
        onOpenHabit={openHabit} entries={(date) => dayEntries(tracker.journal, date, today)} />}
      {dialog?.kind === 'import' && <LegacyImport browserBackup={browserBackup} today={toKey(today)} email={session?.user.email} onImport={importBackup} onClose={close} />}
      {dialog?.kind === 'importing' && <JournalDialog title="Importing previous data" onClose={close} busy><p role="status">Moving your habits, check-ins, and affirmations to this account…</p></JournalDialog>}
      {dialog?.kind === 'settings' && <JournalDialog title="Settings" subtitle={session?.user.email} onClose={close}>
        {accountError && <p className="error" role="alert">{accountError}</p>}
        <ReminderSettings reminder={reminder} />
        {installState !== 'installed' && <div className="settings-section"><h3>App</h3>
          <button className="secondary" type="button" onClick={onInstall}><Download size={16} /> Install app</button>
        </div>}
        <div className="settings-section"><h3>Data</h3>
          <div className="chips">
            <button type="button" className="secondary" onClick={() => downloadJournal(tracker.journal, 'json', todayKey)}>Export JSON</button>
            <button type="button" className="secondary" onClick={() => downloadJournal(tracker.journal, 'csv', todayKey)}>Export CSV</button>
            {account && <button type="button" className="secondary" disabled={!!tracker.sync.pending} onClick={() => setDialog({ kind: 'import' })}>Import browser backup</button>}
          </div>
        </div>
        {!!tracker.sync.pending && <p>Finish syncing changes before signing out.</p>}
        <div className="dialog-actions">{account
          ? <button type="button" className="secondary" disabled={!!tracker.sync.pending || signingOut} onClick={() => void signOut()}>Sign out</button>
          : <button type="button" className="primary" onClick={openAccount}>Sign in or sign up</button>}</div>
      </JournalDialog>}
    </div>
  )
}

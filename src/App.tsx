import { useEffect, useMemo, useState } from 'react'
import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { CalendarDays, House, Leaf, ListChecks, Plus, Settings, Sun } from 'lucide-react'
import { AuthShell } from './components/AuthGate'
import { JournalDialog } from './components/JournalDialog'
import { TrackerCalendar } from './components/TrackerCalendar'
import { TrackerHabitForm } from './components/TrackerHabitForm'
import { TrackerDay, TrackerHistory } from './components/TrackerHistory'
import { DailyGreeting, HabitLibrary, TodayView } from './components/TrackerViews'
import { useToday } from './hooks/useToday'
import { toKey } from './lib/dates'
import { habitRepository, type HabitRepository } from './lib/habitRepository'
import { dayEntries, isOnToday, type Journal } from './lib/tracking'
import { useCloudJournal } from './store/useCloudJournal'

const navigation = [
  { id: 'greeting', label: 'Greeting', icon: House },
  { id: 'today', label: 'Today', icon: Sun },
  { id: 'habits', label: 'Habits', icon: ListChecks },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
] as const

type View = (typeof navigation)[number]['id']
type Dialog = { kind: 'create' | 'settings' } | { kind: 'day'; day: string } | { kind: 'habit'; id: string; day?: string }
type Account = { client: SupabaseClient; session: Session }

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

  useEffect(() => {
    let active = true
    void repository.load().then(
      (journal) => { if (active) setInitial(journal) },
      (reason) => { if (active) setError(reason instanceof Error ? reason.message : 'Could not load the journal.') },
    )
    return () => { active = false }
  }, [repository, attempt])

  if (initial) return <Dashboard client={client} session={session} initial={initial} repository={repository} />
  return <AuthShell>
    {error ? <>
      <h1>Couldn’t load your journal.</h1>
      <p role="alert">{error}</p>
      <p>For a new Supabase project, apply <code>supabase/schema.sql</code> in the SQL Editor.</p>
      <div className="dialog-actions">
        <button type="button" className="primary" onClick={() => { setError(''); setAttempt((previous) => previous + 1) }}>Try again</button>
        <button type="button" className="secondary" onClick={() => void client.auth.signOut({ scope: 'local' })}>Sign out</button>
      </div>
    </> : <p role="status">Opening your journal…</p>}
  </AuthShell>
}

function Dashboard({ client, session, initial, repository }: Account & { initial: Journal; repository: HabitRepository }) {
  const tracker = useCloudJournal(initial, repository)
  const [view, setView] = useState<View>('greeting')
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const [accountError, setAccountError] = useState('')
  const [signingOut, setSigningOut] = useState(false)
  const today = useToday()
  const due = tracker.journal.habits.filter((habit) => isOnToday(habit, tracker.journal.logs[habit.id] ?? {}, today))
  const selectedHabit = dialog?.kind === 'habit' && tracker.journal.habits.find((habit) => habit.id === dialog.id)
  const close = () => setDialog(null)
  const openHabit = (id: string, day?: string) => setDialog({ kind: 'habit', id, day })
  const onAdd = () => setDialog({ kind: 'create' })
  const habitView = { tracker, today, due, onAdd, onOpenHabit: openHabit }

  async function signOut() {
    if (tracker.sync.pending || signingOut) return
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
          <button className="brand" type="button" onClick={() => setView('greeting')}><span><Leaf size={20} /></span> Habittism</button>
          <nav className="main-nav" aria-label="Workspace">
            {navigation.map(({ id, label, icon: Icon }) => <button key={id} type="button" aria-current={view === id ? 'page' : undefined}
              onClick={() => setView(id)}><Icon size={16} /> {label}</button>)}
          </nav>
          <div className="header-actions">
            <button className="icon-button" type="button" aria-label="Settings" onClick={() => setDialog({ kind: 'settings' })}><Settings size={19} /></button>
            <button className="primary header-add" type="button" onClick={onAdd}><Plus size={17} /> <span>New habit</span></button>
          </div>
        </div>
      </header>
      <main className="workspace-main">
        {tracker.sync.error ? (
          <div className="sync-banner" role="alert"><span>Changes are waiting to sync. {tracker.sync.error}</span>
            <button type="button" className="secondary" onClick={() => void tracker.retry()}>Retry sync</button></div>
        ) : <div className="sync-status" role="status">{tracker.sync.pending ? 'Saving changes…' : 'All changes synced'}</div>}
        {view === 'greeting' && <DailyGreeting {...habitView} name={displayName(session)} onToday={() => setView('today')} />}
        {view === 'today' && <TodayView {...habitView} />}
        {view === 'habits' && <HabitLibrary {...habitView} />}
        {view === 'calendar' && <TrackerCalendar journal={tracker.journal} today={today} onSelect={(day) => setDialog({ kind: 'day', day })} />}
      </main>
      {dialog?.kind === 'create' && <TrackerHabitForm onClose={close} onCreate={(habit) => tracker.createHabit(habit, toKey(today))} />}
      {dialog?.kind === 'habit' && selectedHabit && <TrackerHistory key={selectedHabit.id} tracker={tracker} today={today}
        habit={selectedHabit} initialDay={dialog.day} onClose={close} />}
      {dialog?.kind === 'day' && <TrackerDay tracker={tracker} day={dialog.day} today={today} onClose={close}
        onOpenHabit={openHabit} entries={(date) => dayEntries(tracker.journal, date, today)} />}
      {dialog?.kind === 'settings' && <JournalDialog title="Settings" subtitle={session.user.email} onClose={close}>
        {accountError && <p className="error" role="alert">{accountError}</p>}
        {!!tracker.sync.pending && <p>Finish syncing changes before signing out.</p>}
        <div className="dialog-actions"><button type="button" className="secondary" disabled={!!tracker.sync.pending || signingOut} onClick={() => void signOut()}>Sign out</button></div>
      </JournalDialog>}
    </div>
  )
}

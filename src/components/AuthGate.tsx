import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { ArrowRight, GitFork } from 'lucide-react'
import { authRedirect, callbackError, supabase } from '../lib/supabase'
import { ThemeToggle } from './ThemeToggle'
import './auth.css'

type Mode = 'signin' | 'signup' | 'magic' | 'reset' | 'recovery'
type Account = { client: SupabaseClient; session: Session }

const title: Record<Mode, string> = {
  signin: 'Welcome back.',
  signup: 'Create an account.',
  magic: 'Sign in by email.',
  reset: 'Reset your password.',
  recovery: 'Choose a new password.',
}

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="auth-shell">
      <div className="auth-card">
        <div className="auth-top"><div className="auth-brand">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width={34} height={34} /> Hexis
        </div><ThemeToggle /></div>
        {children}
      </div>
    </main>
  )
}

export function AuthGate({ children, guest }: {
  children: (account: Account) => ReactNode
  guest: (openAccount: () => void) => ReactNode
}) {
  const client = supabase
  const [session, setSession] = useState<Session | null>()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState(callbackError ?? '')
  const [showAuth, setShowAuth] = useState(!!callbackError)

  useEffect(() => {
    if (!client) return
    const { data: { subscription } } = client.auth.onAuthStateChange((event, next) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('recovery')
        setPassword('')
      }
      setSession(next)
      if (event === 'SIGNED_OUT') {
        setMode('signin')
        setShowAuth(false)
        setPassword('')
        setNotice('')
        setError('')
      }
    })
    return () => subscription.unsubscribe()
  }, [client])

  function changeMode(next: Mode) {
    setMode(next)
    setPassword('')
    setError('')
    setNotice('')
  }

  async function run(action: () => Promise<void>) {
    if (busy) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await action()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Authentication failed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!client) return
    void run(async () => {
      const address = email.trim()
      const redirectTo = authRedirect()
      switch (mode) {
        case 'signin': {
          const result = await client.auth.signInWithPassword({ email: address, password })
          if (result.error) throw result.error
          break
        }
        case 'signup': {
          const result = await client.auth.signUp({
            email: address, password, options: { emailRedirectTo: redirectTo },
          })
          if (result.error) throw result.error
          if (!result.data.session) setNotice('Check your email to confirm your account.')
          break
        }
        case 'magic': {
          const result = await client.auth.signInWithOtp({
            email: address, options: { emailRedirectTo: redirectTo },
          })
          if (result.error) throw result.error
          setNotice('Check your email for a sign-in link.')
          break
        }
        case 'reset': {
          const result = await client.auth.resetPasswordForEmail(address, { redirectTo })
          if (result.error) throw result.error
          setNotice('Check your email for a password reset link.')
          break
        }
        case 'recovery': {
          const result = await client.auth.updateUser({ password })
          if (result.error) throw result.error
          changeMode('signin')
          break
        }
      }
    })
  }

  if (client && session === undefined) return <AuthShell><p role="status">Checking your session…</p></AuthShell>
  if (client && session && mode !== 'recovery') return children({ client, session })
  if (!showAuth && mode !== 'recovery') return guest(() => setShowAuth(true))

  if (!client) {
    return (
      <AuthShell>
        <h1>Connect Supabase.</h1>
        <p>Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in <code>.env.local</code> using <code>.env.example</code>, or add them in your Vercel project settings.</p>
        <p>Use a Supabase publishable or legacy anon key. Restart the dev server or redeploy after saving.</p>
        <button className="secondary" type="button" onClick={() => setShowAuth(false)}>Back to guest journal</button>
      </AuthShell>
    )
  }

  const usesPassword = mode === 'signin' || mode === 'signup' || mode === 'recovery'
  const submitLabel = { signin: 'Sign in', signup: 'Create account', magic: 'Send sign-in link', reset: 'Send reset link', recovery: 'Save password' }[mode]

  return (
    <AuthShell>
      <h1>{title[mode]}</h1>
      <form onSubmit={submit} className="auth-form">
        {mode !== 'recovery' && (
          <label>Email <input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        )}
        {usesPassword && (
          <label>Password <input type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} minLength={mode === 'signin' ? undefined : 6} value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
        )}
        <button type="submit" className="auth-submit" disabled={busy}>{submitLabel} <ArrowRight size={16} aria-hidden="true" /></button>
        {error && <p className="auth-error" role="alert">{error}</p>}
        {notice && <p role="status">{notice}</p>}
      </form>
      {mode === 'signin' && (
        <>
          <button type="button" className="auth-oauth" disabled={busy} onClick={() => void run(async () => {
            const { error: oauthError } = await client.auth.signInWithOAuth({ provider: 'github', options: { redirectTo: authRedirect() } })
            if (oauthError) throw oauthError
          })}><GitFork size={17} aria-hidden="true" /> Continue with GitHub</button>
          <div className="auth-links">
            <button type="button" disabled={busy} onClick={() => changeMode('signup')}>Create account</button>
            <button type="button" disabled={busy} onClick={() => changeMode('magic')}>Use a magic link</button>
            <button type="button" disabled={busy} onClick={() => changeMode('reset')}>Forgot password?</button>
          </div>
        </>
      )}
      {mode !== 'signin' && mode !== 'recovery' && (
        <div className="auth-links"><button type="button" disabled={busy} onClick={() => changeMode('signin')}>Back to sign in</button></div>
      )}
      {mode !== 'recovery' && <div className="auth-links">
        <button type="button" disabled={busy} onClick={() => { changeMode('signin'); setShowAuth(false) }}>Back to guest journal</button>
      </div>}
    </AuthShell>
  )
}

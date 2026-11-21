import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App, { GuestApp } from './App.tsx'
import { AuthGate } from './components/AuthGate'
import { registerAppWorker } from './lib/installApp'

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  void registerAppWorker().catch(() => { /* Online tracking remains available. */ })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthGate guest={(openAccount) => <GuestApp openAccount={openAccount} />}>
      {({ client, session }) => <App key={session.user.id} client={client} session={session} />}
    </AuthGate>
  </StrictMode>,
)

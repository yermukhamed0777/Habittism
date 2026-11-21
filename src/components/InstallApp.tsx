import { useState } from 'react'
import { Check, Download, Monitor, Smartphone } from 'lucide-react'
import { installApp, useInstallState } from '../lib/installApp'
import { JournalDialog } from './JournalDialog'

export function InstallApp({ onClose }: { onClose: () => void }) {
  const state = useInstallState()
  const [error, setError] = useState(false)

  return (
    <JournalDialog title="Install Habittism" onClose={onClose}>
      <div className="install-detail">
        {state === 'installed' ? (
          <p role="status"><Check size={18} /> Habittism is installed.</p>
        ) : (
          <>
            <p>Open Habittism in its own window from your desktop or home screen. Guest journals can open offline after the first visit.</p>
            {state === 'prompt' ? <button className="primary" type="button" onClick={() => void installApp().catch(() => setError(true))}>
              <Download size={17} /> Install app
            </button> : <ul>
              <li><Monitor size={18} /><span><strong>Desktop</strong> Use the install icon in the address bar or the browser’s app menu.</span></li>
              <li><Smartphone size={18} /><span><strong>Phone or tablet</strong> Open your browser’s menu and choose Install app or Add to Home Screen.</span></li>
            </ul>}
            {error && <p role="alert" className="error">The install prompt couldn’t open. Use the browser menu.</p>}
          </>
        )}
      </div>
    </JournalDialog>
  )
}

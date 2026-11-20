import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

export function JournalDialog({ title, subtitle, children, onClose, busy = false }: {
  title: string
  subtitle?: string
  children: ReactNode
  onClose: () => void
  busy?: boolean
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    return () => element?.close()
  }, [])

  return (
    <dialog ref={dialog} className="journal-dialog" aria-labelledby={titleId} aria-describedby={subtitle ? descriptionId : undefined}
      onCancel={(event) => { event.preventDefault(); if (!busy) onClose() }}>
      <div className="dialog-heading">
        <div>
          <h2 id={titleId}>{title}</h2>
          {subtitle && <p id={descriptionId}>{subtitle}</p>}
        </div>
        <button className="icon-button" type="button" aria-label="Close dialog" onClick={onClose} disabled={busy}><X size={20} /></button>
      </div>
      {children}
    </dialog>
  )
}

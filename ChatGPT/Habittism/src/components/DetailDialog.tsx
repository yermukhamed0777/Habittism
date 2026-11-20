import { useEffect, useRef, type ReactNode } from 'react'

export function DetailDialog({ label, onClose, children }: {
  label: string
  onClose: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])
  return (
    <dialog ref={ref} aria-label={label} onCancel={(event) => {
      event.preventDefault()
      onClose()
    }} className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none bg-transparent text-inherit">
      {children}
    </dialog>
  )
}

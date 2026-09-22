import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react'

interface ConfirmationDialogProps {
  open: boolean
  title: string
  children: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

const focusableSelector = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function ConfirmationDialog({
  open,
  title,
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return

    returnFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
    cancelButtonRef.current?.focus()

    return () => {
      returnFocusRef.current?.focus()
    }
  }, [open])

  if (!open) return null

  const handleKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      onCancel()
      return
    }

    if (event.key !== 'Tab' || !dialogRef.current) return

    const focusableElements = Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector),
    )
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    if (!firstElement || !lastElement) {
      event.preventDefault()
      return
    }

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault()
      lastElement.focus()
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault()
      firstElement.focus()
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
      <dialog
        open
        ref={dialogRef}
        aria-modal="true"
        aria-labelledby="confirmation-dialog-title"
        onKeyDown={handleKeyDown}
        className="relative m-0 w-full max-w-md rounded-lg bg-white p-6 text-gray-900 shadow-xl"
      >
        <h2 id="confirmation-dialog-title" className="text-xl font-bold">{title}</h2>
        <div className="mt-3 text-gray-700">{children}</div>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            className="min-h-11 rounded border border-gray-400 px-4 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-11 rounded bg-red-700 px-4 py-2 font-medium text-white focus:outline-none focus:ring-2 focus:ring-red-700 focus:ring-offset-2"
          >
            {confirmLabel}
          </button>
        </div>
      </dialog>
    </div>
  )
}

export default ConfirmationDialog

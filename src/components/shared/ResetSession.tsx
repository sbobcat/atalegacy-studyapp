import { useState } from 'react'
import { useSession } from '@store/SessionStore'
import ConfirmationDialog from './ConfirmationDialog'

function ResetSession() {
  const { state, dispatch } = useSession()
  const [confirmOpen, setConfirmOpen] = useState(false)

  if (!state) return null

  const reset = () => {
    setConfirmOpen(false)
    dispatch({ type: 'RESET_SESSION' })
    window.location.hash = '#/'
  }

  return (
    <>
      <div className="mb-6 flex justify-end">
        <button
          type="button"
          onClick={() => {
            if (Object.keys(state.answers).length > 0) setConfirmOpen(true)
            else reset()
          }}
          className="min-h-11 rounded border border-gray-400 bg-white px-4 py-2 font-medium hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2"
        >
          Reset session
        </button>
      </div>
      <ConfirmationDialog
        open={confirmOpen}
        title="Reset this session?"
        confirmLabel="Reset session"
        onConfirm={reset}
        onCancel={() => setConfirmOpen(false)}
      >
        <p>Your answers and progress will be cleared. You will return to the home screen.</p>
      </ConfirmationDialog>
    </>
  )
}

export default ResetSession

import { useEffect, useState } from 'react'
import { useQuestions } from './data/QuestionsContext'
import { useSession } from '@store/SessionStore'

// Hash-based router — routes mapped in Task 7
// Placeholder: renders a simple welcome screen until full routing is implemented

function App() {
  const [hash, setHash] = useState(window.location.hash || '#/')
  const questions = useQuestions()
  const { notice, dispatch } = useSession()

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash || '#/')
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:border focus:border-gray-400 focus:rounded"
      >
        Skip to main content
      </a>
      <main id="main-content" className="flex items-center justify-center min-h-screen">
        <div className="text-center p-8">
          <h1 className="text-3xl font-bold mb-4">ATA Legacy Study App</h1>
          {notice && (
            <div role="status" className="mx-auto mb-4 max-w-xl rounded border border-amber-400 bg-amber-50 p-4 text-left text-amber-950">
              <p>{notice}</p>
              <button
                type="button"
                onClick={() => dispatch({ type: 'DISMISS_NOTICE' })}
                className="mt-2 rounded border border-amber-700 px-3 py-1 font-medium focus:outline-none focus:ring-2 focus:ring-amber-700 focus:ring-offset-2"
              >
                Dismiss
              </button>
            </div>
          )}
          <p className="text-gray-600 mb-2">Current route: <code className="bg-gray-100 px-1 rounded">{hash}</code></p>
          <p className="text-gray-600 mb-2">{questions.length} study questions loaded.</p>
          <p className="text-gray-500 text-sm">Full routing will be implemented in Task 7.</p>
        </div>
      </main>
    </div>
  )
}

export default App

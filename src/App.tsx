import { useEffect, useState, type ComponentType } from 'react'
import ErrorBoundary from '@components/shared/ErrorBoundary'
import SkipNavLink from '@components/shared/SkipNavLink'
import ResetSession from '@components/shared/ResetSession'
import Configure from '@pages/Configure'
import Home from '@pages/Home'
import ReviewSession from '@pages/ReviewSession'
import ReviewSummary from '@pages/ReviewSummary'
import TestResults from '@pages/TestResults'
import TestSession from '@pages/TestSession'
import { useSession } from '@store/SessionStore'

const routes = {
  '#/': Home,
  '#/configure': Configure,
  '#/review': ReviewSession,
  '#/review/summary': ReviewSummary,
  '#/test': TestSession,
  '#/test/results': TestResults,
} satisfies Record<string, ComponentType>

type Route = keyof typeof routes

function isRoute(hash: string): hash is Route {
  return hash in routes
}

function getHash(): string {
  return window.location.hash || '#/'
}

function App() {
  const [hash, setHash] = useState(getHash)
  const { notice, dispatch } = useSession()
  const route = isRoute(hash) ? hash : '#/'
  const Page = routes[route]

  useEffect(() => {
    const onHashChange = () => setHash(getHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    if (!isRoute(hash)) {
      window.location.hash = '#/'
    }
  }, [hash])

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <SkipNavLink />
      {notice && (
        <div
          role="status"
          className="mx-auto max-w-4xl border-b border-amber-300 bg-amber-50 p-4 text-amber-950"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p>{notice}</p>
            <button
              type="button"
              onClick={() => dispatch({ type: 'DISMISS_NOTICE' })}
              className="rounded border border-amber-700 px-3 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-amber-700 focus:ring-offset-2"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
      <main id="main-content" tabIndex={-1} className="mx-auto min-h-screen max-w-5xl p-6 sm:p-8">
        <ResetSession key={route} />
        <ErrorBoundary key={route}>
          <Page />
        </ErrorBoundary>
      </main>
    </div>
  )
}

export default App

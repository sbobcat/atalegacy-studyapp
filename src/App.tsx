import { useEffect, useState } from 'react'

// Hash-based router — routes mapped in Task 7
// Placeholder: renders a simple welcome screen until full routing is implemented

function App() {
  const [hash, setHash] = useState(window.location.hash || '#/')

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
          <p className="text-gray-600 mb-2">Current route: <code className="bg-gray-100 px-1 rounded">{hash}</code></p>
          <p className="text-gray-500 text-sm">Full routing will be implemented in Task 7.</p>
        </div>
      </main>
    </div>
  )
}

export default App

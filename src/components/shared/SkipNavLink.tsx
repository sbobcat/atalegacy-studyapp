import type { MouseEvent } from 'react'

function SkipNavLink() {
  const moveFocusToMain = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    document.getElementById('main-content')?.focus()
  }

  return (
    <a
      href="#main-content"
      onClick={moveFocusToMain}
      className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:border focus:border-gray-400 focus:bg-white focus:px-4 focus:py-2 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2"
    >
      Skip to main content
    </a>
  )
}

export default SkipNavLink

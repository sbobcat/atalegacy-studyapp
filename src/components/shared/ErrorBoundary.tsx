import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('A page could not be displayed.', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <section className="mx-auto max-w-xl rounded-lg bg-white p-6 shadow" aria-labelledby="page-error-title">
          <h1 id="page-error-title" className="text-2xl font-bold">This page could not be displayed</h1>
          <p className="mt-3 text-gray-700">
            Something unexpected happened. Your saved session has not been changed.
          </p>
          <a
            href="#/"
            className="mt-6 inline-block rounded bg-blue-700 px-4 py-2 font-medium text-white focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2"
          >
            Return home
          </a>
        </section>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary

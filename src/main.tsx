import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { QuestionsProvider, useQuestions } from './data/QuestionsContext'
import { SessionProvider } from '@store/SessionStore'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element not found')
}

function AppProviders() {
  const questions = useQuestions()

  return (
    <SessionProvider questions={questions}>
      <App />
    </SessionProvider>
  )
}

createRoot(rootElement).render(
  <StrictMode>
    <QuestionsProvider>
      <AppProviders />
    </QuestionsProvider>
  </StrictMode>,
)

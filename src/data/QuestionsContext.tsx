import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import type { ZodIssue } from 'zod'
import { QuestionsJsonSchema, type Question } from '@lib/schema'

interface QuestionsContextValue {
  questions: Question[]
}

type LoadState =
  | { status: 'loading' }
  | { status: 'loaded'; questions: Question[] }
  | { status: 'load-error' }
  | { status: 'schema-error'; records: string[] }

const QuestionsContext = createContext<QuestionsContextValue | null>(null)

async function loadQuestionBank(): Promise<LoadState> {
  let rawQuestions: unknown

  try {
    const questionModule = await import('./questions.json')
    rawQuestions = questionModule.default
  } catch (error) {
    console.error('Unable to load the question bank.', error)
    return { status: 'load-error' }
  }

  const result = QuestionsJsonSchema.safeParse(rawQuestions)
  if (!result.success) {
    console.error('Question bank schema validation failed.', result.error)
    return {
      status: 'schema-error',
      records: describeInvalidRecords(rawQuestions, result.error.issues),
    }
  }

  return { status: 'loaded', questions: result.data }
}

function describeInvalidRecords(rawQuestions: unknown, issues: ZodIssue[]): string[] {
  const records = new Set<string>()

  for (const issue of issues) {
    const recordIndex = typeof issue.path[0] === 'number' ? issue.path[0] : null
    if (recordIndex === null) {
      records.add('Question bank file')
      continue
    }

    const rawRecord = Array.isArray(rawQuestions) ? rawQuestions[recordIndex] : null
    const questionId =
      rawRecord && typeof rawRecord === 'object' && 'questionId' in rawRecord
        ? (rawRecord as { questionId?: unknown }).questionId
        : null

    records.add(
      typeof questionId === 'string' && questionId.trim()
        ? `Question ${questionId}`
        : `Record ${recordIndex + 1}`,
    )
  }

  return [...records]
}

function LoadingPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6 text-gray-900">
      <p role="status" className="text-lg">Loading the question bank…</p>
    </main>
  )
}

interface ErrorPageProps {
  kind: 'load' | 'schema'
  records?: string[]
  onRetry?: () => void
}

function QuestionBankErrorPage({ kind, records = [], onRetry }: ErrorPageProps) {
  const returnHome = () => {
    window.location.hash = '#/'
    window.location.reload()
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6 text-gray-900">
      <section className="w-full max-w-xl rounded-lg bg-white p-6 shadow" aria-labelledby="data-error-title">
        <h1 id="data-error-title" className="text-2xl font-bold">
          The study questions are unavailable
        </h1>
        <p className="mt-3 text-gray-700">
          {kind === 'load'
            ? 'The question bank could not be loaded. Check your connection and try again.'
            : 'The question bank contains information the application could not understand.'}
        </p>
        {records.length > 0 && (
          <div className="mt-4">
            <h2 className="font-semibold">Records that need attention</h2>
            <ul className="mt-2 list-disc pl-6">
              {records.map((record) => <li key={record}>{record}</li>)}
            </ul>
          </div>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="rounded bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2"
            >
              Retry
            </button>
          )}
          <button
            type="button"
            onClick={returnHome}
            className="rounded border border-gray-400 bg-white px-4 py-2 font-medium hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2"
          >
            Home
          </button>
        </div>
      </section>
    </main>
  )
}

export function QuestionsProvider({ children }: { children: ReactNode }) {
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' })

  const load = useCallback(() => {
    setLoadState({ status: 'loading' })
    void loadQuestionBank().then(setLoadState)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loadState.status === 'loading') {
    return <LoadingPage />
  }

  if (loadState.status === 'load-error') {
    return <QuestionBankErrorPage kind="load" onRetry={load} />
  }

  if (loadState.status === 'schema-error') {
    return <QuestionBankErrorPage kind="schema" records={loadState.records} />
  }

  return (
    <QuestionsContext.Provider value={{ questions: loadState.questions }}>
      {children}
    </QuestionsContext.Provider>
  )
}

export function useQuestions(): Question[] {
  const context = useContext(QuestionsContext)
  if (!context) {
    throw new Error('useQuestions must be used within a QuestionsProvider')
  }

  return context.questions
}

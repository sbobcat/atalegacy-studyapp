import {
  createContext,
  type Dispatch,
  type ReactNode,
  useContext,
  useEffect,
  useReducer,
} from 'react'
import { z } from 'zod'
import {
  QuestionSchema,
  type AnswerState,
  type PresentedQuestion,
  type Question,
  type SessionConfig,
} from '@lib/schema'

const SESSION_STORAGE_KEY = 'ata-legacy-study-app:session'

export interface SessionState {
  config: SessionConfig
  questions: PresentedQuestion[]
  currentIndex: number
  answers: Record<string, AnswerState>
  mode: 'review' | 'test'
  phase: 'active' | 'summary' | 'results'
  startedAt: number
}

export type SessionAction =
  | { type: 'START_SESSION'; session: SessionState }
  | { type: 'NAVIGATE'; index: number }
  | { type: 'RECORD_ANSWER'; questionId: string; answer: AnswerState }
  | { type: 'SET_PHASE'; phase: SessionState['phase'] }
  | { type: 'RESET_SESSION' }
  | { type: 'DISMISS_NOTICE' }

export interface SessionStore {
  state: SessionState | null
  notice: string | null
  dispatch: Dispatch<SessionAction>
}

interface StoreState {
  session: SessionState | null
  notice: string | null
}

const AnswerStateSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('objective'),
    selected: z.array(z.string()),
  }),
  z.object({
    type: z.literal('flashcard'),
    revealed: z.boolean(),
    selfAssessment: z.enum(['got-it', 'needs-review']).nullable(),
  }),
])

const SessionConfigSchema = z.object({
  mode: z.enum(['review', 'test']),
  categories: z.array(z.string()),
  subcategories: z.array(z.string()),
  topics: z.array(z.string()),
  difficulties: z.array(z.string()),
  questionTypes: z.array(z.string()),
  count: z.union([z.number().int().positive(), z.literal('all')]),
  passingScore: z.number().int().min(1).max(100),
  seed: z.number().int().positive().max(2_147_483_647).nullable(),
})

const SessionStateSchema = z.object({
  config: SessionConfigSchema,
  questions: z.array(z.object({
    question: QuestionSchema,
    presentedChoices: z.array(z.object({
      label: z.string(),
      text: z.string(),
      isCorrect: z.boolean(),
    })),
  })).min(1),
  currentIndex: z.number().int().nonnegative(),
  answers: z.record(AnswerStateSchema),
  mode: z.enum(['review', 'test']),
  phase: z.enum(['active', 'summary', 'results']),
  startedAt: z.number().int().nonnegative(),
}).refine(
  (session) => session.currentIndex < session.questions.length,
  { message: 'Current question index is outside the session question list.' },
)

const SessionContext = createContext<SessionStore | null>(null)

function clearPersistedSession() {
  try {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY)
  } catch (error) {
    console.error('Unable to clear the saved session.', error)
  }
}

function restoreSession(questionBank: Question[]): StoreState {
  let serializedSession: string | null

  try {
    serializedSession = window.sessionStorage.getItem(SESSION_STORAGE_KEY)
  } catch (error) {
    console.error('Unable to read the saved session.', error)
    return { session: null, notice: null }
  }

  if (!serializedSession) {
    return { session: null, notice: null }
  }

  let parsedSession: unknown
  try {
    parsedSession = JSON.parse(serializedSession)
  } catch (error) {
    console.error('Saved session is not valid JSON.', error)
    clearPersistedSession()
    return {
      session: null,
      notice: 'Your previous session could not be restored and was cleared.',
    }
  }

  const result = SessionStateSchema.safeParse(parsedSession)
  if (!result.success) {
    console.error('Saved session failed validation.', result.error)
    clearPersistedSession()
    return {
      session: null,
      notice: 'Your previous session could not be restored and was cleared.',
    }
  }

  const currentQuestionIds = new Set(questionBank.map((question) => question.questionId))
  const referencedQuestionIds = new Set([
    ...result.data.questions.map(({ question }) => question.questionId),
    ...Object.keys(result.data.answers),
  ])
  const containsStaleQuestion = [...referencedQuestionIds].some(
    (questionId) => !currentQuestionIds.has(questionId),
  )

  if (containsStaleQuestion) {
    clearPersistedSession()
    return {
      session: null,
      notice: 'Your previous session is no longer valid because the question bank changed. Please configure a new session.',
    }
  }

  return { session: result.data, notice: null }
}

function sessionReducer(store: StoreState, action: SessionAction): StoreState {
  switch (action.type) {
    case 'START_SESSION':
      return { session: action.session, notice: null }
    case 'NAVIGATE': {
      if (!store.session) return store
      const lastIndex = store.session.questions.length - 1
      const currentIndex = Math.max(0, Math.min(action.index, lastIndex))
      return { ...store, session: { ...store.session, currentIndex } }
    }
    case 'RECORD_ANSWER':
      if (!store.session) return store
      return {
        ...store,
        session: {
          ...store.session,
          answers: {
            ...store.session.answers,
            [action.questionId]: action.answer,
          },
        },
      }
    case 'SET_PHASE':
      if (!store.session) return store
      return { ...store, session: { ...store.session, phase: action.phase } }
    case 'RESET_SESSION':
      return { session: null, notice: null }
    case 'DISMISS_NOTICE':
      return { ...store, notice: null }
  }
}

interface SessionProviderProps {
  children: ReactNode
  questions: Question[]
}

export function SessionProvider({ children, questions }: SessionProviderProps) {
  const [store, dispatch] = useReducer(
    sessionReducer,
    questions,
    restoreSession,
  )

  useEffect(() => {
    if (!store.session && store.notice) {
      window.location.hash = '#/configure'
    }
  }, [store.notice, store.session])

  useEffect(() => {
    try {
      if (store.session) {
        window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(store.session))
      } else {
        window.sessionStorage.removeItem(SESSION_STORAGE_KEY)
      }
    } catch (error) {
      console.error('Unable to save the current session.', error)
    }
  }, [store.session])

  return (
    <SessionContext.Provider value={{
      state: store.session,
      notice: store.notice,
      dispatch,
    }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession(): SessionStore {
  const context = useContext(SessionContext)
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider')
  }

  return context
}

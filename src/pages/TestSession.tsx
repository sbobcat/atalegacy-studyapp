import { useEffect, useRef, useState } from 'react'
import QuestionRenderer from '@components/renderers/QuestionRenderer'
import ConfirmationDialog from '@components/shared/ConfirmationDialog'
import ProgressBar from '@components/shared/ProgressBar'
import QuestionCard from '@components/shared/QuestionCard'
import type { AnswerState } from '@lib/schema'
import { useSession } from '@store/SessionStore'

const buttonClass = 'min-h-11 rounded px-4 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'

function TestSession() {
  const { state, dispatch } = useSession()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const content = useRef<HTMLDivElement>(null)
  const presented = state?.mode === 'test' ? state.questions[state.currentIndex] : undefined
  const question = presented?.question

  useEffect(() => {
    content.current?.focus()
  }, [question?.questionId])

  useEffect(() => {
    if (state?.mode === 'test' && state.phase === 'results') {
      window.location.hash = '#/test/results'
    }
  }, [state?.mode, state?.phase])

  if (!state || !presented || !question) {
    return (
      <section className="space-y-4 py-12">
        <h1 className="text-3xl font-bold">Test session</h1>
        <p>Start a Test session to check your knowledge.</p>
        <a href="#/configure" className="inline-block rounded text-blue-800 underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">Configure session</a>
      </section>
    )
  }

  const active = state.phase === 'active'
  const answer = state.answers[question.questionId] ?? null
  const unansweredCount = state.questions.filter(({ question: item }) => {
    const response = state.answers[item.questionId]
    return item.questionType === 'Direct-recall flash card'
      ? !(response?.type === 'flashcard' && response.revealed && response.selfAssessment !== null)
      : !(response?.type === 'objective' && response.selected.length > 0)
  }).length

  function recordAnswer(nextAnswer: AnswerState) {
    if (!active || confirmOpen || !question) return
    dispatch({ type: 'RECORD_ANSWER', questionId: question.questionId, answer: nextAnswer })
  }

  return (
    <section className="space-y-6 py-6" aria-label="Test session">
      <ProgressBar current={state.currentIndex + 1} total={state.questions.length}
        mode="test" unansweredCount={unansweredCount} />
      <div ref={content} tabIndex={-1} aria-labelledby={`question-${question.questionId}`}
        className="rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2">
        <QuestionCard key={question.questionId} question={question} mode="test">
          <QuestionRenderer question={question} presentedChoices={presented.presentedChoices}
            answer={answer} onChange={recordAnswer} disabled={!active || confirmOpen} mode="test" />
        </QuestionCard>
      </div>
      <nav aria-label="Question navigation" className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" className={`${buttonClass} border border-gray-400 bg-white`}
          disabled={!active || confirmOpen || state.currentIndex === 0}
          onClick={() => dispatch({ type: 'NAVIGATE', index: state.currentIndex - 1 })}>Previous</button>
        <button type="button" className={`${buttonClass} border border-gray-400 bg-white`}
          disabled={!active || confirmOpen || state.currentIndex === state.questions.length - 1}
          onClick={() => dispatch({ type: 'NAVIGATE', index: state.currentIndex + 1 })}>Next</button>
      </nav>
      <button type="button" className={`${buttonClass} bg-blue-700 text-white`}
        disabled={!active} onClick={() => setConfirmOpen(true)}>Submit test</button>
      <ConfirmationDialog open={active && confirmOpen} title="Submit test?" confirmLabel="Confirm submission"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          if (!active || !confirmOpen) return
          setConfirmOpen(false)
          dispatch({ type: 'SET_PHASE', phase: 'results' })
          window.location.hash = '#/test/results'
        }}>
        <p>You have {unansweredCount} unanswered {unansweredCount === 1 ? 'question' : 'questions'}. Submit your test now?</p>
      </ConfirmationDialog>
    </section>
  )
}

export default TestSession

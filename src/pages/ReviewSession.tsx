import { useEffect, useRef } from 'react'
import QuestionRenderer from '@components/renderers/QuestionRenderer'
import LiveRegion from '@components/shared/LiveRegion'
import NavigationControls from '@components/shared/NavigationControls'
import ProgressBar from '@components/shared/ProgressBar'
import QuestionCard from '@components/shared/QuestionCard'
import type { AnswerState } from '@lib/schema'
import { scoreSession } from '@lib/scorer'
import { useSession } from '@store/SessionStore'

function ReviewSession() {
  const { state, dispatch } = useSession()
  const content = useRef<HTMLDivElement>(null)
  const presented = state?.mode === 'review' ? state.questions[state.currentIndex] : undefined
  const question = presented?.question

  useEffect(() => {
    content.current?.focus()
  }, [question?.questionId])

  useEffect(() => {
    if (state?.mode === 'review' && state.phase === 'summary') {
      window.location.hash = '#/review/summary'
    }
  }, [state?.mode, state?.phase])

  if (!state || !presented || !question) {
    return (
      <section className="space-y-4 py-12">
        <h1 className="text-3xl font-bold">Review session</h1>
        <p>Start a Review session to study questions with immediate feedback.</p>
        <a href="#/configure" className="inline-block rounded text-blue-800 underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">Configure session</a>
      </section>
    )
  }

  const answer = state.answers[question.questionId] ?? null
  const isFlashCard = question.questionType === 'Direct-recall flash card'
  const canAdvance = isFlashCard
    ? answer?.type === 'flashcard' && answer.revealed
    : answer?.type === 'objective' && answer.selected.length > 0
  const result = !isFlashCard && canAdvance
    ? scoreSession({ questions: [question], answers: state.answers, passingScore: state.config.passingScore })
    : null
  const selection = answer?.type === 'objective'
    ? presented.presentedChoices.filter((choice) => answer.selected.includes(choice.label)).map((choice) => choice.text).join('; ')
    : ''

  function recordAnswer(nextAnswer: AnswerState) {
    if (state?.phase !== 'active' || !question) return
    dispatch({ type: 'RECORD_ANSWER', questionId: question.questionId, answer: nextAnswer })
  }

  return (
    <section className="space-y-6 py-6" aria-label="Review session">
      <ProgressBar current={state.currentIndex + 1} total={state.questions.length} />
      <div ref={content} tabIndex={-1} aria-labelledby={`question-${question.questionId}`}
        className="rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2">
        <QuestionCard key={question.questionId} question={question} mode="review" showFeedback={canAdvance}>
          <QuestionRenderer question={question} presentedChoices={presented.presentedChoices}
            answer={answer} onChange={recordAnswer} disabled={state.phase !== 'active'} mode="review" />
          <LiveRegion className="mt-4 font-semibold">
            {result && <p>{result.totalCorrect === 1 ? 'Correct.' : 'Incorrect.'} Your answer: {selection}</p>}
          </LiveRegion>
        </QuestionCard>
      </div>
      <NavigationControls
        canGoPrevious={state.currentIndex > 0}
        canAdvance={canAdvance}
        isLastQuestion={state.currentIndex === state.questions.length - 1}
        onPrevious={() => dispatch({ type: 'NAVIGATE', index: state.currentIndex - 1 })}
        onNext={() => {
          if (canAdvance) dispatch({ type: 'NAVIGATE', index: state.currentIndex + 1 })
        }}
        onEndSession={() => {
          if (!canAdvance) return
          dispatch({ type: 'SET_PHASE', phase: 'summary' })
          window.location.hash = '#/review/summary'
        }}
      />
    </section>
  )
}

export default ReviewSession

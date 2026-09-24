import { useEffect, useRef } from 'react'
import SourceDetail from '@components/shared/SourceDetail'
import type { CategoryBreakdown, Question } from '@lib/schema'
import { scoreSession } from '@lib/scorer'
import { createSession, defaultSessionConfig } from '@store/createSession'
import { useSession } from '@store/SessionStore'

const buttonClass = 'rounded border border-blue-800 px-4 py-2 font-semibold text-blue-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
type Counts = Pick<CategoryBreakdown, 'correct' | 'incorrect' | 'unanswered'>

function Breakdown({ title, rows }: { title: string; rows: (Counts & { label: string })[] }) {
  return (
    <section aria-label={title} className="space-y-3">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {rows.map((row) => (
          <article key={row.label} className="min-w-0 rounded-lg border border-gray-300 bg-white p-4">
            <h3 className="break-words text-lg font-semibold">{row.label}</h3>
            <dl className="mt-3 space-y-2">
              <div><dt className="inline">Correct: </dt><dd className="inline font-semibold">{row.correct}</dd></div>
              <div><dt className="inline">Incorrect: </dt><dd className="inline font-semibold">{row.incorrect}</dd></div>
              <div><dt className="inline">Unanswered: </dt><dd className="inline font-semibold">{row.unanswered}</dd></div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  )
}

function answerText(question: Question, labels: string[]): string {
  return labels.map((label) => {
    const text = question.choices?.[label as keyof NonNullable<Question['choices']>]
    return text ? `${label}: ${text}` : label
  }).join('; ')
}

function TestResults() {
  const { state, dispatch } = useSession()
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => { heading.current?.focus() }, [])

  if (!state || state.mode !== 'test' || state.phase !== 'results') {
    return (
      <section className="space-y-4 py-12">
        <h1 ref={heading} tabIndex={-1} className="text-3xl font-bold">Test results</h1>
        <p>Submit a test to see your results.</p>
        {state?.mode === 'test' && state.phase === 'active' && (
          <a href="#/test" className="inline-block rounded text-blue-800 underline">Continue test</a>
        )}
        <button type="button" className={buttonClass} onClick={() => { window.location.hash = '#/configure' }}>New randomized test</button>
      </section>
    )
  }

  const questions = state.questions.map(({ question }) => question)
  const score = (items: Question[]) => scoreSession({ questions: items, answers: state.answers, passingScore: state.config.passingScore })
  const result = score(questions)
  const entries = questions.map((question) => ({ question, outcome: score([question]) }))
  const missed = entries.filter(({ outcome }) => outcome.totalIncorrect > 0 || outcome.flashCardSummary.needsReview > 0).map(({ question }) => question)

  function retake() {
    if (!state || state.config.seed === null) return
    // Preserve the exact seeded question/choice order, including restored sessions.
    dispatch({ type: 'START_SESSION', session: { ...state, answers: {}, currentIndex: 0, phase: 'active', startedAt: Date.now() } })
    window.location.hash = '#/test'
  }

  function reviewMissed() {
    if (!missed.length) return
    dispatch({ type: 'START_SESSION', session: createSession(missed, { ...defaultSessionConfig(), count: 'all' }) })
    window.location.hash = '#/review'
  }

  return (
    <section className="space-y-8 py-6">
      <header className="space-y-3">
        <h1 ref={heading} tabIndex={-1} className="text-3xl font-bold">Test results</h1>
        {state.config.seed !== null && <p>Seed: <strong>{state.config.seed}</strong></p>}
      </header>
      <section aria-label="Objective score" className="space-y-3 rounded-lg bg-white p-5 shadow">
        <h2 className="text-2xl font-semibold">Objective score</h2>
        <p>Correct: <strong>{result.totalCorrect}</strong></p>
        <p>Incorrect: <strong>{result.totalIncorrect}</strong></p>
        <p>Unanswered: <strong>{result.totalUnanswered}</strong></p>
        {result.percentage === null ? <p>No scorable questions were included.</p> : (
          <>
            <p>Score: <strong>{result.percentage}%</strong></p>
            <p className="text-xl font-semibold">{result.passed ? 'Pass' : 'Needs more review'}</p>
          </>
        )}
        <p>Passing score: <strong>{state.config.passingScore}%</strong></p>
        <p className="text-sm text-gray-700">Score and breakdown counts include objective questions only. Flash cards are self-assessed.</p>
      </section>
      {questions.some((question) => question.questionType === 'Direct-recall flash card') && (
        <section aria-label="Flash-card self-assessment" className="space-y-3 rounded-lg bg-white p-5 shadow">
          <h2 className="text-2xl font-semibold">Flash-card self-assessment</h2>
          <p>Got it: <strong>{result.flashCardSummary.gotIt}</strong></p>
          <p>Needs review: <strong>{result.flashCardSummary.needsReview}</strong></p>
        </section>
      )}
      <Breakdown title="By category" rows={result.byCategory.map((row) => ({ ...row, label: row.category }))} />
      <Breakdown title="By difficulty" rows={result.byDifficulty.map((row) => ({ ...row, label: row.difficulty }))} />
      <Breakdown title="By question type" rows={result.byQuestionType.map((row) => ({ ...row, label: row.questionType }))} />
      <section aria-label="Answer review" className="space-y-4">
        <h2 className="text-2xl font-semibold">Answer review</h2>
        <ol className="space-y-4">
          {entries.map(({ question, outcome }, index) => {
            const answer = state.answers[question.questionId]
            const flashCard = question.questionType === 'Direct-recall flash card'
            const revealed = answer?.type === 'flashcard' && answer.revealed
            return (
              <li key={question.questionId} className="break-words rounded-lg border border-gray-300 bg-white p-5">
                <article className="space-y-3">
                  <h3 className="text-lg font-semibold">{index + 1}. {question.question}</h3>
                  <p><strong>Category:</strong> {question.category} · <strong>Topic:</strong> {question.topic} · <strong>Difficulty:</strong> {question.difficulty}</p>
                  {flashCard ? (
                    <>
                      <p><strong>Revealed answer:</strong> {revealed ? question.correctAnswer : 'Not revealed'}</p>
                      <p><strong>Self-assessment:</strong> {!revealed ? 'Not revealed' : answer.selfAssessment === 'got-it' ? 'Got it' : answer.selfAssessment === 'needs-review' ? 'Needs review' : 'Not assessed'}</p>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold">{outcome.totalUnanswered ? 'Unanswered' : outcome.totalCorrect ? 'Correct' : 'Incorrect'}</p>
                      <p><strong>Your answer:</strong> {answer?.type === 'objective' && answer.selected.length ? answerText(question, answer.selected) : 'Unanswered'}</p>
                      <p><strong>Correct answer:</strong> {answerText(question, question.correctAnswer.split(',').map((label) => label.trim()))}</p>
                    </>
                  )}
                  <p><strong>Explanation:</strong> {question.explanation}</p>
                  <SourceDetail sourcePage={question.sourcePage} sourceRecord={question.sourceRecord} />
                </article>
              </li>
            )
          })}
        </ol>
      </section>
      <nav aria-label="Results actions" className="flex flex-wrap gap-3">
        <button type="button" className={buttonClass} disabled={state.config.seed === null} onClick={retake}>Retake same test</button>
        <button type="button" className={buttonClass} onClick={() => { window.location.hash = '#/configure' }}>New randomized test</button>
        <button type="button" className={buttonClass} disabled={!missed.length} onClick={reviewMissed}>Review missed</button>
        <button type="button" className={buttonClass} onClick={() => { window.location.hash = '#/' }}>Home</button>
      </nav>
    </section>
  )
}

export default TestResults

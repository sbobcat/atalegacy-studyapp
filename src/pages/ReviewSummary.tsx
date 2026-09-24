import { useEffect, useRef } from 'react'
import type { CategoryBreakdown, Question } from '@lib/schema'
import { scoreSession } from '@lib/scorer'
import { createSession, defaultSessionConfig } from '@store/createSession'
import { useSession } from '@store/SessionStore'

const buttonClass = 'rounded border border-blue-800 px-4 py-2 font-semibold text-blue-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50'

type Counts = Pick<CategoryBreakdown, 'correct' | 'incorrect' | 'gotIt' | 'needsReview'>

function Breakdown({ title, rows }: { title: string; rows: (Counts & { label: string })[] }) {
  return (
    <section aria-label={title} className="space-y-3">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {rows.map((row) => (
          <article key={row.label} className="min-w-0 rounded-lg border border-gray-300 bg-white p-4">
            <h3 className="break-words text-lg font-semibold">{row.label}</h3>
            <dl className="mt-3 space-y-2">
              <div><dt className="inline">Objective correct: </dt><dd className="inline font-semibold">{row.correct}</dd></div>
              <div><dt className="inline">Objective incorrect: </dt><dd className="inline font-semibold">{row.incorrect}</dd></div>
              <div><dt className="inline">Flash cards — Got it: </dt><dd className="inline font-semibold">{row.gotIt}</dd></div>
              <div><dt className="inline">Flash cards — Needs review: </dt><dd className="inline font-semibold">{row.needsReview}</dd></div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  )
}

function correctAnswerText(question: Question): string {
  if (!question.choices) return question.correctAnswer
  return question.correctAnswer.split(',').map((value) => {
    const label = value.trim()
    const text = question.choices?.[label as keyof NonNullable<Question['choices']>]
    return text ? `${label}: ${text}` : label
  }).join('; ')
}

function ReviewSummary() {
  const { state, dispatch } = useSession()
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => { heading.current?.focus() }, [])

  if (!state || state.mode !== 'review' || state.phase !== 'summary') {
    return (
      <section className="space-y-4 py-12">
        <h1 ref={heading} tabIndex={-1} className="text-3xl font-bold">Review summary</h1>
        <p>Finish a Review session to see your summary.</p>
        {state?.mode === 'review' && state.phase === 'active' && (
          <a href="#/review" className="inline-block rounded text-blue-800 underline">Continue review</a>
        )}
        <button type="button" className={buttonClass} onClick={() => { window.location.hash = '#/configure' }}>New session</button>
      </section>
    )
  }

  const questions = state.questions.map(({ question }) => question)
  const result = scoreSession({ questions, answers: state.answers, passingScore: state.config.passingScore })
  const missed = questions.filter((question) => {
    const outcome = scoreSession({ questions: [question], answers: state.answers, passingScore: state.config.passingScore })
    return outcome.totalIncorrect > 0 || outcome.flashCardSummary.needsReview > 0
  })
  const reviewed = questions.filter((question) => {
    const answer = state.answers[question.questionId]
    return question.questionType === 'Direct-recall flash card'
      ? answer?.type === 'flashcard' && answer.revealed
      : answer?.type === 'objective' && answer.selected.length > 0
  }).length
  const suggestions = [...new Set(missed.map((question) => question.category))]

  function reviewMissed() {
    if (!missed.length) return
    const session = createSession(missed, { ...defaultSessionConfig(), count: 'all' })
    dispatch({ type: 'START_SESSION', session })
    window.location.hash = '#/review'
  }

  return (
    <section className="space-y-8 py-6">
      <header className="space-y-3">
        <h1 ref={heading} tabIndex={-1} className="text-3xl font-bold">Review summary</h1>
        <p className="text-lg">Questions reviewed: <strong>{reviewed}</strong></p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        <section aria-label="Objective questions" className="rounded-lg bg-white p-5 shadow">
          <h2 className="text-xl font-semibold">Objective questions</h2>
          <p className="mt-3">Correct: <strong>{result.totalCorrect}</strong></p>
          <p>Incorrect: <strong>{result.totalIncorrect}</strong></p>
        </section>
        <section aria-label="Flash-card self-assessment" className="rounded-lg bg-white p-5 shadow">
          <h2 className="text-xl font-semibold">Flash-card self-assessment</h2>
          <p className="mt-3">Got it: <strong>{result.flashCardSummary.gotIt}</strong></p>
          <p>Needs review: <strong>{result.flashCardSummary.needsReview}</strong></p>
          <p className="mt-3 text-sm text-gray-700">These counts reflect your own assessment of recall.</p>
        </section>
      </div>
      <Breakdown title="By category" rows={result.byCategory.map((row) => ({ ...row, label: row.category }))} />
      <Breakdown title="By difficulty" rows={result.byDifficulty.map((row) => ({ ...row, label: row.difficulty }))} />
      <section aria-label="Suggested further study" className="space-y-3">
        <h2 className="text-2xl font-semibold">Suggested further study</h2>
        {suggestions.length ? (
          <ul className="list-disc space-y-1 pl-6">{suggestions.map((category) => <li key={category}>{category}</li>)}</ul>
        ) : <p>No missed questions or flash cards marked Needs review.</p>}
      </section>
      <section aria-label="Missed and needs-review questions" className="space-y-4">
        <h2 className="text-2xl font-semibold">Missed and needs-review questions</h2>
        {missed.length ? (
          <ul className="space-y-4">
            {missed.map((question) => (
              <li key={question.questionId} className="break-words rounded-lg border border-gray-300 bg-white p-5">
                <article className="space-y-3">
                  <h3 className="text-lg font-semibold">{question.question}</h3>
                  <p>{question.questionType === 'Direct-recall flash card' ? 'Needs review' : 'Incorrect'} · {question.category} · {question.topic}</p>
                  <p><strong>Correct answer:</strong> {correctAnswerText(question)}</p>
                  <p><strong>Explanation:</strong> {question.explanation}</p>
                  <p><strong>Source page:</strong> {question.sourcePage}</p>
                  <p><strong>Source record:</strong> {question.sourceRecord}</p>
                </article>
              </li>
            ))}
          </ul>
        ) : <p>No questions to review again.</p>}
      </section>
      <nav aria-label="Summary actions" className="flex flex-wrap gap-3">
        <button type="button" className={buttonClass} disabled={!missed.length} onClick={reviewMissed}>Review missed</button>
        <button type="button" className={buttonClass} onClick={() => { window.location.hash = '#/configure' }}>New session</button>
      </nav>
    </section>
  )
}

export default ReviewSummary

import type { Question } from '@lib/schema'
import SourceDetail from './SourceDetail'

interface FeedbackPanelProps {
  question: Question
  mode: 'review' | 'test'
  visible: boolean
}

function FeedbackPanel({ question, mode, visible }: FeedbackPanelProps) {
  if (mode !== 'review' || !visible) return null

  return (
    <section className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4" aria-labelledby={`feedback-${question.questionId}`}>
      <h2 id={`feedback-${question.questionId}`} className="text-lg font-semibold">Answer feedback</h2>
      <p className="mt-3"><span className="font-semibold">Correct answer:</span> {question.correctAnswer}</p>
      <p className="mt-2"><span className="font-semibold">Explanation:</span> {question.explanation}</p>
      <SourceDetail sourcePage={question.sourcePage} sourceRecord={question.sourceRecord} />
    </section>
  )
}

export default FeedbackPanel

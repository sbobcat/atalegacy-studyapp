import type { ReactNode } from 'react'
import type { Question } from '@lib/schema'
import FeedbackPanel from './FeedbackPanel'

interface QuestionCardProps {
  question: Question
  mode: 'review' | 'test'
  showFeedback?: boolean
  children: ReactNode
}

function QuestionCard({ question, mode, showFeedback = false, children }: QuestionCardProps) {
  return (
    <article className="rounded-lg bg-white p-5 shadow sm:p-6" aria-labelledby={`question-${question.questionId}`}>
      <header>
        <p className="text-sm font-medium text-gray-600">
          {question.category} · {question.difficulty}
        </p>
        <h1 id={`question-${question.questionId}`} className="mt-2 text-2xl font-bold">
          {question.question}
        </h1>
      </header>
      <div className="mt-6">{children}</div>
      <FeedbackPanel question={question} mode={mode} visible={showFeedback} />
    </article>
  )
}

export default QuestionCard

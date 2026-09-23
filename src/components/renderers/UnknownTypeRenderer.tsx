import type { QuestionRendererProps } from './types'

export default function UnknownTypeRenderer({ question }: QuestionRendererProps) {
  return (
    <div className="space-y-3">
      <p className="break-words">{question.question}</p>
      <p role="status">This question type is not yet supported.</p>
    </div>
  )
}

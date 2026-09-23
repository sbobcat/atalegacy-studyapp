import { useId } from 'react'
import { controlFocus, type QuestionRendererProps } from './types'

// The bank defines one classification prompt per question, with A–D as the
// complete answer-side set. Preserve original labels for session scoring.
export default function MatchingRenderer({ question, presentedChoices, answer, onChange, disabled }: QuestionRendererProps) {
  const id = useId()
  const selected = answer?.type === 'objective' ? answer.selected[0] ?? '' : ''

  return (
    <div className="space-y-3">
      <label htmlFor={id} className="block font-semibold">{question.question}</label>
      <select id={id} value={selected} disabled={disabled}
        className={`min-h-11 w-full min-w-0 rounded-md border border-gray-500 bg-white p-3 ${controlFocus}`}
        onChange={(event) => {
          if (!disabled) onChange({ type: 'objective', selected: event.target.value ? [event.target.value] : [] })
        }}>
        <option value="">Choose a match</option>
        {presentedChoices.map((choice) => <option key={choice.label} value={choice.label}>{choice.text}</option>)}
      </select>
    </div>
  )
}

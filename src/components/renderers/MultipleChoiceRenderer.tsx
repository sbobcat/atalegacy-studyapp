import { useId } from 'react'
import { controlFocus, type QuestionRendererProps } from './types'

export default function MultipleChoiceRenderer({ presentedChoices, answer, onChange, disabled }: QuestionRendererProps) {
  const id = useId()
  const selected = answer?.type === 'objective' ? answer.selected : []

  return (
    <div role="radiogroup" aria-labelledby={`${id}-label`} className="space-y-3">
      <p id={`${id}-label`} className="font-semibold">Choose one answer.</p>
      {presentedChoices.map((choice) => (
        <label key={choice.label} className="flex min-h-11 items-start gap-3 rounded-md border border-gray-400 p-3">
          <input
            type="radio"
            name={id}
            value={choice.label}
            checked={selected.includes(choice.label)}
            disabled={disabled}
            onChange={() => { if (!disabled) onChange({ type: 'objective', selected: [choice.label] }) }}
            className={`mt-1 h-5 w-5 shrink-0 ${controlFocus}`}
          />
          <span className="min-w-0 break-words">{choice.text}</span>
        </label>
      ))}
    </div>
  )
}

import { useId } from 'react'
import { controlFocus, type QuestionRendererProps } from './types'

export default function SelectAllRenderer({ presentedChoices, answer, onChange, disabled }: QuestionRendererProps) {
  const id = useId()
  const selected = answer?.type === 'objective' ? answer.selected : []

  return (
    <div role="group" aria-labelledby={id} className="space-y-3">
      <p id={id} className="font-semibold">Select all that apply. Multiple answers may be correct.</p>
      {presentedChoices.map((choice) => (
        <label key={choice.label} className="flex min-h-11 items-start gap-3 rounded-md border border-gray-400 p-3">
          <input
            type="checkbox"
            value={choice.label}
            checked={selected.includes(choice.label)}
            disabled={disabled}
            onChange={(event) => {
              if (disabled) return
              onChange({ type: 'objective', selected: event.target.checked
                ? [...selected.filter((label) => label !== choice.label), choice.label]
                : selected.filter((label) => label !== choice.label) })
            }}
            className={`mt-1 h-6 w-6 shrink-0 ${controlFocus}`}
          />
          <span className="min-w-0 break-words">{choice.text}</span>
        </label>
      ))}
    </div>
  )
}

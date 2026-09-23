import { useEffect, useId, useRef } from 'react'
import { buttonStyle, controlFocus, type QuestionRendererProps } from './types'

export default function FlashCardRenderer({ question, answer, onChange, disabled, mode }: QuestionRendererProps) {
  const id = useId()
  const content = useRef<HTMLDivElement>(null)
  const revealRequested = useRef(false)
  const revealed = answer?.type === 'flashcard' && answer.revealed
  const assessment = answer?.type === 'flashcard' ? answer.selfAssessment : null

  useEffect(() => {
    if (revealed && revealRequested.current) {
      content.current?.focus()
      revealRequested.current = false
    }
  }, [revealed])

  return (
    <div className="space-y-4">
      {mode === 'test' && <p className="text-sm text-gray-600">Flash cards are not included in your percentage score.</p>}
      <button type="button" className={buttonStyle} disabled={disabled || revealed}
        aria-expanded={revealed} aria-controls={id}
        onClick={() => {
          if (disabled || revealed) return
          revealRequested.current = true
          onChange({ type: 'flashcard', revealed: true, selfAssessment: null })
        }}>Reveal</button>
      <div id={id} hidden={!revealed} ref={content} tabIndex={-1}
        role="region" aria-label="Revealed answer" className={`rounded-md bg-gray-100 p-4 ${controlFocus}`}>
        {revealed && <p className="whitespace-pre-wrap break-words">{question.correctAnswer}</p>}
      </div>
      <div role="group" aria-label="Self-assessment" className="flex flex-wrap gap-3">
        {(['got-it', 'needs-review'] as const).map((value) => (
          <button key={value} type="button" className={buttonStyle}
            disabled={disabled || !revealed} aria-pressed={revealed && assessment === value}
            onClick={() => {
              if (!disabled && revealed) onChange({ type: 'flashcard', revealed: true, selfAssessment: value })
            }}>{value === 'got-it' ? 'Got it' : 'Needs review'}</button>
        ))}
      </div>
    </div>
  )
}

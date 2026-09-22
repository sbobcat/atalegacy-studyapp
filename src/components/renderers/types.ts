import type { AnswerState, Choice, Question } from '@lib/schema'

export interface QuestionRendererProps {
  question: Question
  presentedChoices: Choice[]
  answer: AnswerState | null
  onChange: (answer: AnswerState) => void
  disabled: boolean
  mode: 'review' | 'test'
}

export const controlFocus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800'
export const buttonStyle = `min-h-11 rounded-md border border-gray-500 px-4 py-2 text-gray-900 disabled:cursor-not-allowed disabled:opacity-50 ${controlFocus}`

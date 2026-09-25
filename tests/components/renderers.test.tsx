import { useState } from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import QuestionRenderer, { type QuestionRendererProps } from '@components/renderers/QuestionRenderer'
import type { AnswerState, Question, QuestionType } from '@lib/schema'

const question: Question = {
  questionId: 'test-1', category: 'Kicks', subcategory: 'Beginner', topic: 'White Belt',
  difficulty: 'Foundational', questionType: 'Four-choice multiple choice',
  question: 'Choose the matching kick.', choices: { A: 'Front', B: 'Side', C: 'Round', D: 'Reverse' },
  correctAnswer: 'B', explanation: 'Explanation kept outside the renderer.', sourcePage: '1', sourceRecord: 'source-1',
}
const choices = ['D', 'B', 'A', 'C'].map((label) => ({
  label, text: question.choices![label as keyof NonNullable<Question['choices']>], isCorrect: label === 'B',
}))

function Harness({ type = question.questionType, disabled = false, mode = 'review', initial = null, onChange = vi.fn() }: {
  type?: QuestionType; disabled?: boolean; mode?: 'review' | 'test'; initial?: AnswerState | null
  onChange?: QuestionRendererProps['onChange']
}) {
  const [answer, setAnswer] = useState(initial)
  return <QuestionRenderer question={{ ...question, questionType: type,
    correctAnswer: type === 'Direct-recall flash card' ? 'The revealed answer' : 'B' }}
    presentedChoices={choices} answer={answer} disabled={disabled} mode={mode}
    onChange={(next) => { setAnswer(next); onChange(next) }} />
}

describe('question renderers', () => {
  it.each(['Four-choice multiple choice', 'Reverse recognition', 'Scenario/application'] as const)(
    '%s preserves presentation order and records original labels', async (type) => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      render(<Harness type={type} onChange={onChange} mode="test" />)
      const group = screen.getByRole('radiogroup', { name: 'Choose one answer.' })
      const radios = within(group).getAllByRole('radio')
      expect(radios.map((radio) => (radio as HTMLInputElement).value)).toEqual(['D', 'B', 'A', 'C'])
      radios.forEach((radio) => expect(radio).not.toBeChecked())
      await user.click(screen.getByRole('radio', { name: 'Side' }))
      expect(onChange).toHaveBeenLastCalledWith({ type: 'objective', selected: ['B'] })
      await user.click(screen.getByRole('radio', { name: 'Front' }))
      expect(screen.getByRole('radio', { name: 'Side' })).not.toBeChecked()
      expect(screen.getByRole('radio', { name: 'Front' })).toBeChecked()
      expect(screen.queryByText(question.explanation)).not.toBeInTheDocument()
    },
  )

  it('allows checkbox selection and removal without losing other selections', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness type="Select-all-that-apply" onChange={onChange} />)
    expect(screen.getByRole('group', { name: /Multiple answers may be correct/ })).toBeInTheDocument()
    await user.click(screen.getByRole('checkbox', { name: 'Side' }))
    await user.click(screen.getByRole('checkbox', { name: 'Front' }))
    expect(onChange).toHaveBeenLastCalledWith({ type: 'objective', selected: ['B', 'A'] })
    await user.click(screen.getByRole('checkbox', { name: 'Side' }))
    expect(onChange).toHaveBeenLastCalledWith({ type: 'objective', selected: ['A'] })
  })

  it.each(['review', 'test'] as const)('gates flash card assessment and moves keyboard focus in %s mode', async (mode) => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness type="Direct-recall flash card" mode={mode} onChange={onChange} />)
    expect(screen.queryByText('The revealed answer')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Got it' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Needs review' })).toBeDisabled()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Reveal' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(onChange).toHaveBeenLastCalledWith({ type: 'flashcard', revealed: true, selfAssessment: null })
    expect(screen.getByRole('region', { name: 'Revealed answer' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Got it' })).toHaveFocus()
    await user.keyboard(' ')
    expect(onChange).toHaveBeenLastCalledWith({ type: 'flashcard', revealed: true, selfAssessment: 'got-it' })
    await user.click(screen.getByRole('button', { name: 'Needs review' }))
    expect(onChange).toHaveBeenLastCalledWith({ type: 'flashcard', revealed: true, selfAssessment: 'needs-review' })
  })

  it('offers every matching option and records and clears original labels', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness type="Matching / classification" onChange={onChange} />)
    const select = screen.getByRole('combobox', { name: question.question })
    expect(within(select).getAllByRole('option').map((option) => option.textContent))
      .toEqual(['Choose a match', 'D', 'B', 'A', 'C'])
    expect(within(screen.getByRole('list', { name: 'Matching choices' })).getAllByRole('listitem')
      .map((item) => item.textContent)).toEqual(['D: Reverse', 'B: Side', 'A: Front', 'C: Round'])
    await user.tab()
    expect(select).toHaveFocus()
    await user.selectOptions(select, 'B')
    expect(onChange).toHaveBeenLastCalledWith({ type: 'objective', selected: ['B'] })
    await user.selectOptions(select, '')
    expect(onChange).toHaveBeenLastCalledWith({ type: 'objective', selected: [] })
  })

  it.each(['Four-choice multiple choice', 'Select-all-that-apply', 'Matching / classification', 'Direct-recall flash card'] as const)(
    '%s blocks changes when disabled', async (type) => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      const { container } = render(<Harness type={type} disabled onChange={onChange} />)
      const controls = container.querySelectorAll('input, select, button')
      for (const control of controls) {
        expect(control).toBeDisabled()
        await user.click(control)
      }
      expect(onChange).not.toHaveBeenCalled()
    },
  )

  it('restores recorded objective and revealed flash card answers', () => {
    const view = render(<Harness initial={{ type: 'objective', selected: ['B'] }} />)
    expect(screen.getByRole('radio', { name: 'Side' })).toBeChecked()
    view.unmount()
    render(<Harness type="Direct-recall flash card" initial={{ type: 'flashcard', revealed: true, selfAssessment: 'needs-review' }} disabled />)
    expect(screen.getByText('The revealed answer')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Needs review' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Got it' })).toBeDisabled()
  })

  it('falls back safely for an unsupported type', () => {
    render(<Harness type={'Future question type' as QuestionType} />)
    expect(screen.getByText(question.question)).toBeVisible()
    expect(screen.getByRole('status')).toHaveTextContent('This question type is not yet supported.')
  })
})

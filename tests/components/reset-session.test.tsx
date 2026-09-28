import { StrictMode } from 'react'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/App'
import { useQuestions } from '../../src/data/QuestionsContext'
import { SessionProvider } from '@store/SessionStore'
import type { Question } from '@lib/schema'

vi.mock('../../src/data/QuestionsContext', () => ({ useQuestions: vi.fn() }))

const bank: Question[] = [{
  questionId: 'reset-q1', category: 'Forms', subcategory: 'Color belts', topic: 'Songahm 1',
  difficulty: 'Foundational', questionType: 'Four-choice multiple choice',
  question: 'Which answer is correct?', choices: { A: 'One', B: 'Two', C: 'Three', D: 'Four' },
  correctAnswer: 'B', explanation: 'Two is correct.', sourcePage: '1', sourceRecord: 'row-1',
}]
const storageKey = 'ata-legacy-study-app:session'
const resetButtons = () => screen.queryAllByRole('button', { name: /^Reset session$/i })

beforeEach(() => {
  sessionStorage.clear()
  window.history.replaceState(null, '', '#/')
  vi.mocked(useQuestions).mockReturnValue(bank)
})

afterEach(cleanup)

function mount() {
  render(<StrictMode><SessionProvider questions={bank}><App /></SessionProvider></StrictMode>)
}

describe('reset session navigation regression (#22)', () => {
  it.each(['quick', 'review', 'test'] as const)('keeps one reset control through repeated %s sessions and removes it on reset', async (mode) => {
    const user = userEvent.setup()
    mount()
    expect(resetButtons()).toHaveLength(0)

    for (let cycle = 0; cycle < 3; cycle += 1) {
      if (mode === 'quick') {
        await user.click(screen.getByRole('button', { name: 'Quick Start' }))
      } else {
        await user.click(within(screen.getByRole('navigation', { name: 'Main navigation' })).getByRole('link', { name: 'Configure session' }))
        await screen.findByRole('button', { name: 'Start session' })
        await user.selectOptions(screen.getByLabelText('Mode'), mode)
        await user.click(screen.getByRole('button', { name: 'Start session' }))
      }
      await screen.findByText('Which answer is correct?')
      expect(resetButtons()).toHaveLength(1)
      await user.click(screen.getByRole('link', { name: 'Home' }))
      await screen.findByRole('button', { name: 'Quick Start' })
      expect(resetButtons()).toHaveLength(1)
    }

    await user.click(resetButtons()[0])
    expect(resetButtons()).toHaveLength(0)
    expect(sessionStorage.getItem(storageKey)).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Quick Start' }))
    await screen.findByText('Which answer is correct?')
    expect(resetButtons()).toHaveLength(1)
    await user.click(resetButtons()[0])
    await screen.findByRole('button', { name: 'Quick Start' })
    expect(resetButtons()).toHaveLength(0)
  })

  it('preserves answers on cancel and clears the session on confirmation after navigating home', async () => {
    const user = userEvent.setup()
    mount()
    await user.click(screen.getByRole('button', { name: 'Quick Start' }))
    await screen.findByText('Which answer is correct?')
    await user.click(screen.getByRole('radio', { name: /Two/ }))
    await user.click(screen.getByRole('link', { name: 'Home' }))
    await screen.findByRole('button', { name: 'Quick Start' })
    const saved = sessionStorage.getItem(storageKey)
    await user.click(screen.getByRole('button', { name: /^Reset session$/i }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }))
    expect(sessionStorage.getItem(storageKey)).toBe(saved)
    expect(resetButtons()).toHaveLength(1)
    await user.click(resetButtons()[0])
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Reset session' }))
    await waitFor(() => expect(resetButtons()).toHaveLength(0))
    expect(sessionStorage.getItem(storageKey)).toBeNull()
    expect(window.location.hash).toBe('#/')
  })
})

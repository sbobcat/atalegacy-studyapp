import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Configure from '@pages/Configure'
import Home from '@pages/Home'
import { useQuestions } from '../../src/data/QuestionsContext'
import { SessionProvider, useSession, type SessionState } from '@store/SessionStore'
import type { Question } from '@lib/schema'

vi.mock('../../src/data/QuestionsContext', () => ({ useQuestions: vi.fn() }))

const bank: Question[] = Array.from({ length: 30 }, (_, index) => ({
  questionId: `q-${index}`, category: index < 20 ? 'Kicks' : 'Forms',
  subcategory: index < 20 ? 'Basic kicks' : 'Color belts', topic: index < 20 ? 'Front kick' : 'Songahm 1',
  difficulty: index < 20 ? 'Foundational' : 'Advanced', questionType: 'Four-choice multiple choice',
  question: `Question ${index}`, choices: { A: 'One', B: 'Two', C: 'Three', D: 'Four' },
  correctAnswer: 'B', explanation: 'Two is correct.', sourcePage: '1', sourceRecord: `row-${index}`,
}))

function StateProbe() {
  const { state } = useSession()
  return <div data-testid="session">{JSON.stringify(state)}</div>
}
function mount(home = false) {
  return render(<SessionProvider questions={bank}>{home ? <Home /> : <Configure />}<StateProbe /></SessionProvider>)
}
const session = () => JSON.parse(screen.getByTestId('session').textContent!) as SessionState
const start = () => screen.getByRole('button', { name: 'Start session' })

beforeEach(() => {
  sessionStorage.clear()
  window.location.hash = '#/'
  vi.mocked(useQuestions).mockReturnValue(bank)
})

describe('session configuration', () => {
  it('updates the pool synchronously and disables oversized counts', () => {
    mount()
    expect(screen.getByRole('status')).toHaveTextContent('30 eligible questions')
    expect(screen.getByRole('option', { name: '50' })).toBeDisabled()
    fireEvent.click(screen.getByLabelText('Forms'))
    // No timers or deferred work: the update is visible in the same event turn.
    expect(screen.getByRole('status')).toHaveTextContent('10 eligible questions')
    expect(screen.getByRole('option', { name: '20' })).toBeDisabled()
    expect(screen.getByLabelText('Question count')).toHaveValue('all')
    fireEvent.click(start())
    expect(session().questions).toHaveLength(10)
    expect(session().config.count).toBe('all')
  })

  it('cascades categories and removes stale subcategory and topic selections', async () => {
    const user = userEvent.setup()
    mount()
    await user.click(screen.getByLabelText('Basic kicks'))
    await user.click(screen.getByLabelText('Front kick'))
    await user.click(screen.getByLabelText('Forms'))
    expect(screen.queryByLabelText('Basic kicks')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Front kick')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Songahm 1')).not.toBeChecked()
    await user.click(start())
    expect(session().config).toMatchObject({ categories: ['Forms'], subcategories: [], topics: [] })
  })

  it('supports multiple categories and cascades subcategories into topics', async () => {
    const user = userEvent.setup()
    mount()
    await user.click(screen.getByLabelText('Kicks'))
    await user.click(screen.getByLabelText('Forms'))
    await user.click(screen.getByLabelText('Songahm 1'))
    await user.click(screen.getByLabelText('Basic kicks'))
    expect(screen.queryByLabelText('Songahm 1')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('20 eligible questions')
  })

  it.each(['0', '-1', '2147483648', '1.5', 'abc', '1e2', ' '])('rejects invalid seed %s', (seed) => {
    mount()
    fireEvent.change(screen.getByLabelText('Seed (optional)'), { target: { value: seed } })
    expect(screen.getByRole('alert')).toHaveTextContent('positive integer')
    expect(start()).toBeDisabled()
    fireEvent.submit(start().closest('form')!)
    expect(session()).toBeNull()
  })

  it.each(['', '0', '101', '80.5', 'abc'])('rejects invalid passing score %s', (score) => {
    mount()
    fireEvent.change(screen.getByLabelText('Passing score (%)'), { target: { value: score } })
    expect(start()).toBeDisabled()
    expect(screen.getByRole('alert')).toHaveTextContent('whole-number percentage')
  })

  it.each(['1', '2147483647'])('starts a reproducible test with seed %s', async (seed) => {
    const user = userEvent.setup()
    mount()
    await user.selectOptions(screen.getByLabelText('Mode'), 'test')
    await user.selectOptions(screen.getByLabelText('Question count'), '10')
    fireEvent.change(screen.getByLabelText('Seed (optional)'), { target: { value: seed } })
    fireEvent.change(screen.getByLabelText('Passing score (%)'), { target: { value: '90' } })
    await user.click(start())
    const first = session()
    expect(first.config).toMatchObject({ mode: 'test', count: 10, seed: Number(seed), passingScore: 90 })
    expect(first.questions).toHaveLength(10)
    expect(new Set(first.questions.map(({ question }) => question.questionId)).size).toBe(10)
    expect(first.questions.every(({ presentedChoices }) => presentedChoices.filter((choice) => choice.isCorrect).length === 1)).toBe(true)
    expect(window.location.hash).toBe('#/test')
    await user.click(start())
    expect(session().questions).toEqual(first.questions)
  })

  it('blocks an empty pool and recovers after filters are cleared', async () => {
    const user = userEvent.setup()
    mount()
    await user.click(screen.getByLabelText('Forms'))
    await user.click(screen.getByLabelText('Foundational'))
    expect(start()).toBeDisabled()
    expect(screen.getByText(/No eligible questions are available/)).toBeInTheDocument()
    await user.click(screen.getByLabelText('Foundational'))
    expect(start()).toBeEnabled()
    const types = within(screen.getByRole('group', { name: 'Question type' }))
    await user.click(types.getByLabelText('Four-choice multiple choice'))
    await user.click(start())
    expect(session().config.questionTypes).toEqual(['Four-choice multiple choice'])
  })

  it('Quick Start creates and persists a default review session', async () => {
    mount(true)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Quick Start' }))
    expect(session().config).toEqual({ mode: 'review', categories: [], subcategories: [], topics: [],
      difficulties: [], questionTypes: [], count: 20, passingScore: 80, seed: null })
    expect(session().questions).toHaveLength(20)
    expect(session()).toMatchObject({ currentIndex: 0, answers: {}, phase: 'active', mode: 'review' })
    expect(JSON.parse(sessionStorage.getItem('ata-legacy-study-app:session')!).questions).toHaveLength(20)
    expect(window.location.hash).toBe('#/review')
  })
})

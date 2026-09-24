import { buildEligiblePool } from '@lib/filter'
import type { Question, SessionConfig } from '@lib/schema'
import { selectQuestions } from '@lib/selector'
import { shuffleChoices } from '@lib/shuffler'
import type { SessionState } from './SessionStore'

export function defaultSessionConfig(): SessionConfig {
  return { mode: 'review', categories: [], subcategories: [], topics: [], difficulties: [],
    questionTypes: [], count: 20, passingScore: 80, seed: null }
}

export function createSession(bank: Question[], config: SessionConfig): SessionState {
  const selected = selectQuestions(buildEligiblePool(bank, config), config.count, config.seed)
  return {
    config, questions: selected.map((question, index) => ({
      question, presentedChoices: shuffleChoices(question, config.seed, index),
    })), currentIndex: 0, answers: {}, mode: config.mode, phase: 'active', startedAt: Date.now(),
  }
}

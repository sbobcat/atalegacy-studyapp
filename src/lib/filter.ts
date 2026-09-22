/**
 * Eligible pool construction.
 *
 * Filters the full question bank down to the set of questions that satisfy
 * every dimension specified in the SessionConfig. An empty array for any
 * dimension means "no filter applied for that dimension" (i.e. all values
 * are accepted).
 *
 * Requirements: 3.3, 3.6, 3.10
 */
import type { Question, SessionConfig } from './schema.js';

/**
 * Returns only the questions that match every active filter dimension in
 * `config`. Filters are independent — a question must pass all of them.
 */
export function buildEligiblePool(
  questions: Question[],
  config: SessionConfig
): Question[] {
  return questions.filter((q) => {
    if (config.categories.length > 0 && !config.categories.includes(q.category)) {
      return false;
    }
    if (config.subcategories.length > 0 && !config.subcategories.includes(q.subcategory)) {
      return false;
    }
    if (config.topics.length > 0 && !config.topics.includes(q.topic)) {
      return false;
    }
    if (config.difficulties.length > 0 && !config.difficulties.includes(q.difficulty)) {
      return false;
    }
    if (config.questionTypes.length > 0 && !config.questionTypes.includes(q.questionType)) {
      return false;
    }
    return true;
  });
}

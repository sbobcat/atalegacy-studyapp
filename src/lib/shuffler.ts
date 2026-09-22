/**
 * Choice shuffling for objective question types.
 *
 * Requirements: 4.2, 4.3
 */
import type { Question, Choice } from './schema.js';
import { createPrng } from './prng.js';

// The flash card type whose choices are always returned as an empty array.
const FLASH_CARD_TYPE = 'Direct-recall flash card' as const;

/**
 * Derive the set of correct answer labels from `correctAnswer`.
 *
 * For single-correct types the value is a single letter (e.g. "A").
 * For Select-all-that-apply it may be a comma-separated list (e.g. "A,C").
 */
function parseCorrectLabels(correctAnswer: string): Set<string> {
  return new Set(correctAnswer.split(',').map((s) => s.trim()));
}

/**
 * Fisher-Yates in-place shuffle using the provided PRNG.
 */
function shuffleArray<T>(arr: T[], rng: () => number): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/**
 * Return a shuffled `Choice[]` for the given question.
 *
 * - NEVER mutates `question` or its nested objects.
 * - Flash cards (`Direct-recall flash card`) always return `[]`.
 * - Single-correct types: exactly one `Choice` has `isCorrect === true`.
 * - Select-all-that-apply: all labels in the correct set get `isCorrect === true`.
 * - When `seed` is `null` the order is left as A → B → C → D (no shuffle).
 * - When `seed` is provided the per-question seed is mixed with `index` so
 *   each question in a session gets a distinct shuffle.
 *
 * @param question  The immutable source question.
 * @param seed      Session seed, or null for no shuffling.
 * @param index     Zero-based position of this question in the session.
 */
export function shuffleChoices(
  question: Question,
  seed: number | null,
  index: number
): Choice[] {
  // Flash cards have no choices
  if (question.questionType === FLASH_CARD_TYPE) {
    return [];
  }

  // Questions without a choices object (should not happen for objective types,
  // but guard defensively) return empty.
  if (question.choices === null) {
    return [];
  }

  const correctLabels = parseCorrectLabels(question.correctAnswer);

  // Build an immutable snapshot of the choices in canonical order (A, B, C, D)
  const choices: Choice[] = [
    { label: 'A', text: question.choices.A, isCorrect: correctLabels.has('A') },
    { label: 'B', text: question.choices.B, isCorrect: correctLabels.has('B') },
    { label: 'C', text: question.choices.C, isCorrect: correctLabels.has('C') },
    { label: 'D', text: question.choices.D, isCorrect: correctLabels.has('D') },
  ];

  if (seed !== null) {
    // Mix the session seed with the question index using XOR so each question
    // in the same session gets a distinct PRNG sequence.
    // Use unsigned 32-bit arithmetic to keep the seed well-distributed.
    const mixed = (seed ^ (index * 2654435761)) >>> 0;
    const rng = createPrng(mixed);
    shuffleArray(choices, rng);
  }

  return choices;
}

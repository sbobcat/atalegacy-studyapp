/**
 * Centralised scoring logic.
 *
 * Requirements: 8.1–8.9, 9.3, 15.2
 *
 * Pure function — no React, no browser APIs.
 */
import type {
  ScoreInput,
  ScoreResult,
  Question,
  AnswerState,
  CategoryBreakdown,
  DifficultyBreakdown,
  QuestionTypeBreakdown,
  FlashCardSummary,
  Difficulty,
  QuestionType,
} from './schema.js';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const FLASH_CARD_TYPE = 'Direct-recall flash card' as const;
const SATA_TYPE = 'Select-all-that-apply' as const;

function isFlashCard(q: Question): boolean {
  return q.questionType === FLASH_CARD_TYPE;
}

/**
 * Parse "A,C" → ["A","C"] (trimmed, sorted for set comparison).
 */
function parseCorrectSet(correctAnswer: string): string[] {
  return correctAnswer
    .split(',')
    .map((s) => s.trim())
    .sort();
}

/**
 * Determine whether an objective answer is correct for the given question.
 *
 * - Select-all-that-apply: exact set match required (Req 8.4).
 * - All other objective types: single label match.
 */
function isObjectiveCorrect(q: Question, answer: AnswerState): boolean {
  if (answer.type !== 'objective') return false;

  const correctSet = parseCorrectSet(q.correctAnswer);
  const selectedSet = [...answer.selected].sort();

  if (q.questionType === SATA_TYPE) {
    // Exact match — same length and same elements
    if (correctSet.length !== selectedSet.length) return false;
    return correctSet.every((label, i) => label === selectedSet[i]);
  }

  // Single-correct: selected must contain exactly the one correct label
  if (selectedSet.length !== 1) return false;
  return correctSet.length === 1 && correctSet[0] === selectedSet[0];
}

// ---------------------------------------------------------------------------
// Breakdown accumulators
// ---------------------------------------------------------------------------

type ObjectiveOutcome = 'correct' | 'incorrect' | 'unanswered';
type FlashCardOutcome = 'got-it' | 'needs-review' | 'unanswered';

function objectiveOutcome(q: Question, answer: AnswerState | undefined): ObjectiveOutcome {
  if (!answer || answer.type !== 'objective') return 'unanswered';
  if (answer.selected.length === 0) return 'unanswered';
  return isObjectiveCorrect(q, answer) ? 'correct' : 'incorrect';
}

function flashCardOutcome(answer: AnswerState | undefined): FlashCardOutcome {
  if (!answer || answer.type !== 'flashcard') return 'unanswered';
  if (answer.selfAssessment === 'got-it') return 'got-it';
  if (answer.selfAssessment === 'needs-review') return 'needs-review';
  return 'unanswered';
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Score a completed (or partial) session.
 *
 * Flash cards are excluded from all numeric objective totals and percentage
 * calculations (Req 8.5). Only objective questions contribute to `totalScored`,
 * `totalCorrect`, `totalIncorrect`, `totalUnanswered`, `percentage`, and
 * `passed` (Req 8.1–8.9).
 */
export function scoreSession(input: ScoreInput): ScoreResult {
  const { questions, answers, passingScore } = input;

  // ── Totals ─────────────────────────────────────────────────────────────
  let totalCorrect = 0;
  let totalIncorrect = 0;
  let totalUnanswered = 0;

  // Flash card running totals
  let fcGotIt = 0;
  let fcNeedsReview = 0;

  // ── Breakdown maps ──────────────────────────────────────────────────────
  const categoryMap = new Map<string, CategoryBreakdown>();
  const difficultyMap = new Map<Difficulty, DifficultyBreakdown>();
  const typeMap = new Map<QuestionType, QuestionTypeBreakdown>();

  function getCategoryBucket(cat: string): CategoryBreakdown {
    if (!categoryMap.has(cat)) {
      categoryMap.set(cat, {
        category: cat,
        correct: 0,
        incorrect: 0,
        unanswered: 0,
        gotIt: 0,
        needsReview: 0,
      });
    }
    return categoryMap.get(cat)!;
  }

  function getDifficultyBucket(diff: Difficulty): DifficultyBreakdown {
    if (!difficultyMap.has(diff)) {
      difficultyMap.set(diff, {
        difficulty: diff,
        correct: 0,
        incorrect: 0,
        unanswered: 0,
        gotIt: 0,
        needsReview: 0,
      });
    }
    return difficultyMap.get(diff)!;
  }

  function getTypeBucket(qt: QuestionType): QuestionTypeBreakdown {
    if (!typeMap.has(qt)) {
      typeMap.set(qt, {
        questionType: qt,
        correct: 0,
        incorrect: 0,
        unanswered: 0,
        gotIt: 0,
        needsReview: 0,
      });
    }
    return typeMap.get(qt)!;
  }

  // ── Main loop ────────────────────────────────────────────────────────────
  for (const q of questions) {
    const answer = answers[q.questionId];
    const catBucket = getCategoryBucket(q.category);
    const diffBucket = getDifficultyBucket(q.difficulty);
    const typeBucket = getTypeBucket(q.questionType);

    if (isFlashCard(q)) {
      // Flash cards contribute only to flash card summaries and breakdowns
      const outcome = flashCardOutcome(answer);
      if (outcome === 'got-it') {
        fcGotIt++;
        catBucket.gotIt++;
        diffBucket.gotIt++;
        typeBucket.gotIt++;
      } else if (outcome === 'needs-review') {
        fcNeedsReview++;
        catBucket.needsReview++;
        diffBucket.needsReview++;
        typeBucket.needsReview++;
      }
      // unanswered flash cards do not increment any counter (excluded per Req 8.5)
    } else {
      // Objective question
      const outcome = objectiveOutcome(q, answer);
      if (outcome === 'correct') {
        totalCorrect++;
        catBucket.correct++;
        diffBucket.correct++;
        typeBucket.correct++;
      } else if (outcome === 'incorrect') {
        totalIncorrect++;
        catBucket.incorrect++;
        diffBucket.incorrect++;
        typeBucket.incorrect++;
      } else {
        totalUnanswered++;
        catBucket.unanswered++;
        diffBucket.unanswered++;
        typeBucket.unanswered++;
      }
    }
  }

  // ── Derived totals ───────────────────────────────────────────────────────
  const totalScored = totalCorrect + totalIncorrect + totalUnanswered;

  const percentage: number | null =
    totalScored > 0 ? Math.round((totalCorrect / totalScored) * 100) : null;

  const passed: boolean | null =
    percentage !== null ? percentage >= passingScore : null;

  const flashCardSummary: FlashCardSummary = {
    gotIt: fcGotIt,
    needsReview: fcNeedsReview,
  };

  return {
    totalScored,
    totalCorrect,
    totalIncorrect,
    totalUnanswered,
    percentage,
    passed,
    byCategory: Array.from(categoryMap.values()),
    byDifficulty: Array.from(difficultyMap.values()),
    byQuestionType: Array.from(typeMap.values()),
    flashCardSummary,
  };
}

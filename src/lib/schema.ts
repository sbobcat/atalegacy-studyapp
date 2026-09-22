import { z } from 'zod';

// ---------------------------------------------------------------------------
// Enumerations / Union Types
// ---------------------------------------------------------------------------

export type QuestionType =
  | 'Four-choice multiple choice'
  | 'Select-all-that-apply'
  | 'Direct-recall flash card'
  | 'Matching / classification'
  | 'Reverse recognition'
  | 'Scenario/application';

export type Difficulty = 'Foundational' | 'Intermediate' | 'Advanced';

// ---------------------------------------------------------------------------
// Core Domain Types
// ---------------------------------------------------------------------------

export interface Question {
  questionId: string;
  category: string;
  subcategory: string;
  topic: string;
  questionType: QuestionType;
  difficulty: Difficulty;
  question: string;
  choices: {
    A: string;
    B: string;
    C: string;
    D: string;
  } | null; // null for flash cards
  correctAnswer: string; // e.g. "A", "B", "A,C" for SATA, or answer text
  explanation: string;
  sourcePage: string;
  sourceRecord: string;
}

/** A single answer choice after shuffling — never mutates the source Question. */
export interface Choice {
  label: string;     // original label from Question_Bank (A/B/C/D)
  text: string;      // choice text
  isCorrect: boolean; // derived at shuffle time
}

/** A question as it is presented during a session (shuffled choices baked in). */
export interface PresentedQuestion {
  question: Question;          // reference to original, immutable
  presentedChoices: Choice[];  // shuffled; empty array for flash cards
}

// ---------------------------------------------------------------------------
// Answer State
// ---------------------------------------------------------------------------

export type ObjectiveAnswer = {
  type: 'objective';
  selected: string[]; // label(s) selected, e.g. ["B"] or ["A","C"]
};

export type FlashCardAnswer = {
  type: 'flashcard';
  revealed: boolean;
  selfAssessment: 'got-it' | 'needs-review' | null;
};

export type AnswerState = ObjectiveAnswer | FlashCardAnswer;

// ---------------------------------------------------------------------------
// Session Configuration
// ---------------------------------------------------------------------------

export interface SessionConfig {
  mode: 'review' | 'test';
  categories: string[];
  subcategories: string[];
  topics: string[];
  difficulties: string[];
  questionTypes: string[];
  count: number | 'all';
  passingScore: number;    // 1–100, default 80
  seed: number | null;     // null = random
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

export interface CategoryBreakdown {
  category: string;
  correct: number;
  incorrect: number;
  unanswered: number;
  gotIt: number;
  needsReview: number;
}

export interface DifficultyBreakdown {
  difficulty: Difficulty;
  correct: number;
  incorrect: number;
  unanswered: number;
  gotIt: number;
  needsReview: number;
}

export interface QuestionTypeBreakdown {
  questionType: QuestionType;
  correct: number;
  incorrect: number;
  unanswered: number;
  gotIt: number;
  needsReview: number;
}

export interface FlashCardSummary {
  gotIt: number;
  needsReview: number;
}

export interface ScoreResult {
  totalScored: number;       // objective questions only
  totalCorrect: number;
  totalIncorrect: number;
  totalUnanswered: number;
  percentage: number | null; // null when totalScored === 0
  passed: boolean | null;    // null when percentage is null
  byCategory: CategoryBreakdown[];
  byDifficulty: DifficultyBreakdown[];
  byQuestionType: QuestionTypeBreakdown[];
  flashCardSummary: FlashCardSummary;
}

/** Input consumed by scorer.ts */
export interface ScoreInput {
  questions: Question[];
  answers: Record<string, AnswerState>;
  passingScore: number; // percentage, e.g. 80
}

// ---------------------------------------------------------------------------
// Zod Schemas (runtime validation)
// ---------------------------------------------------------------------------

const QuestionTypeSchema = z.enum([
  'Four-choice multiple choice',
  'Select-all-that-apply',
  'Direct-recall flash card',
  'Matching / classification',
  'Reverse recognition',
  'Scenario/application',
]);

const DifficultySchema = z.enum(['Foundational', 'Intermediate', 'Advanced']);

export const QuestionSchema = z.object({
  questionId: z.string().min(1),
  category: z.string().min(1),
  subcategory: z.string().min(1),
  topic: z.string().min(1),
  questionType: QuestionTypeSchema,
  difficulty: DifficultySchema,
  question: z.string().min(1),
  choices: z
    .object({
      A: z.string().min(1),
      B: z.string().min(1),
      C: z.string().min(1),
      D: z.string().min(1),
    })
    .nullable(),
  correctAnswer: z.string().min(1),
  explanation: z.string().min(1),
  sourcePage: z.string().min(1),
  sourceRecord: z.string().min(1),
});

/** Runtime validation schema for the full questions.json array. */
export const QuestionsJsonSchema = z.array(QuestionSchema);

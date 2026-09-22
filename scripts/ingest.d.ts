/**
 * scripts/ingest.ts
 *
 * Build-time ingestion pipeline for ATA Legacy Study App.
 * Reads ATA_Legacy_Master_Question_Bank.xlsx, validates records,
 * enforces content scope, and writes src/data/questions.json.
 *
 * Run with:  tsx scripts/ingest.ts
 *
 * Exit codes:
 *   0  — success (warnings may have been emitted)
 *   1  — one or more build errors (see stderr output)
 */
export interface Question {
    questionId: string;
    category: string;
    subcategory: string;
    topic: string;
    questionType: string;
    difficulty: string;
    question: string;
    choices: {
        A: string;
        B: string;
        C: string;
        D: string;
    } | null;
    correctAnswer: string;
    explanation: string;
    sourcePage: string;
    sourceRecord: string;
}

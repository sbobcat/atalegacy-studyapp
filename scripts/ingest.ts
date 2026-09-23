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

// xlsx (SheetJS) v0.18.x is a CommonJS module; use createRequire for ESM compatibility
import { createRequire } from 'module';
import type { WorkBook } from 'xlsx';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx') as typeof import('xlsx');
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ---------------------------------------------------------------------------
// Resolve project root relative to this script file
// ---------------------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

const XLSX_PATH = path.join(PROJECT_ROOT, 'assets', 'questionbank', 'ATA_Legacy_Master_Question_Bank.xlsx');
const OUTPUT_PATH = path.join(PROJECT_ROOT, 'src', 'data', 'questions.json');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RawRecord {
  /** 1-based row index in the worksheet */
  rowIndex: number;
  Question_ID: string;
  Category: string;
  Subcategory: string;
  Topic: string;
  Question_Type: string;
  Difficulty: string;
  Question: string;
  Choice_A: string;
  Choice_B: string;
  Choice_C: string;
  Choice_D: string;
  Correct_Answer: string;
  Explanation: string;
  Source_Page: string;
  Source_Record: string;
  Validation_Status: string;
  Active: string;
  Notes: string;
}

export interface Question {
  questionId: string;
  category: string;
  subcategory: string;
  topic: string;
  questionType: string;
  difficulty: string;
  question: string;
  choices: { A: string; B: string; C: string; D: string } | null;
  correctAnswer: string;
  explanation: string;
  sourcePage: string;
  sourceRecord: string;
}

// ---------------------------------------------------------------------------
// Constants — content scope
// ---------------------------------------------------------------------------

const APPROVED_CATEGORIES = new Set([
  'Kicks',
  'Belt Meanings',
  'Forms',
  'Teaching Quadrants',
  'Workbook Content',
]);

const APPROVED_FORMS = new Set([
  // Nine color-belt forms (ATA-specific Korean/hybrid names from the question bank)
  'Songahm Il-Jahng # 1',     // White belt form
  'Songahm Ee-Jahng # 2',     // Orange belt form
  'Songahm Sahm-Jahng # 3',   // Yellow belt form
  'Songahm Sah-Jahng # 4',    // Camo belt form
  'Songahm Oh-Jahng # 5',     // Green belt form
  'In Wha Il-Jahng # 1',      // Purple belt form
  'In Wha Ee-Jahng # 2',      // Blue belt form
  'Choong Jung Il-Jahng # 1', // Brown belt form
  'Choong Jung Ee-Jahng # 2', // Red belt form
  // 1st–3rd degree forms
  'Shim Jun Poome-Sae',       // Shim Jun (1st degree)
  'Jung Yul Poome-Sae',       // Jung Yul (2nd degree)
  'Chung San Poom-Sae',       // Chung San (3rd degree)
]);

const EXPECTED_TOTAL = 300;

const OBJECTIVE_TYPES = new Set([
  'Four-choice multiple choice',
  'Select-all-that-apply',
  'Matching/classification',
  'Matching / classification',  // variant spelling used in the question bank
  'Reverse recognition',
  'Scenario/application',
]);

const FLASH_CARD_TYPE = 'Direct-recall flash card';

// ---------------------------------------------------------------------------
// Logging helpers
// ---------------------------------------------------------------------------

const buildErrors: string[] = [];
const buildWarnings: string[] = [];

function emitError(msg: string): void {
  buildErrors.push(`[ERROR] ${msg}`);
}

function emitWarning(msg: string): void {
  buildWarnings.push(`[WARN]  ${msg}`);
}

// ---------------------------------------------------------------------------
// Task 2.1 — XLSX parsing and record extraction
// ---------------------------------------------------------------------------

function parseXlsx(filePath: string): RawRecord[] {
  if (!fs.existsSync(filePath)) {
    emitError(`Source file not found: ${filePath}`);
    return [];
  }

  let workbook: WorkBook;
  try {
    workbook = XLSX.readFile(filePath, { type: 'file', cellText: true, cellDates: true });
  } catch (err) {
    emitError(`Failed to parse XLSX: ${(err as Error).message}`);
    return [];
  }

  const sheetName = workbook.SheetNames.find(
    (name) => name.toLowerCase().includes('question bank') || name.toLowerCase().includes('question_bank')
  ) ?? workbook.SheetNames[0];
  if (!sheetName) {
    emitError('XLSX file contains no sheets.');
    return [];
  }

  const sheet = workbook.Sheets[sheetName];

  // The spreadsheet has title/notes rows before the actual column header row.
  // Find the first row that contains "Question_ID" to locate the true header.
  const rawArrayRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
  });

  let headerRowIndex = -1;
  for (let i = 0; i < rawArrayRows.length; i++) {
    const row = rawArrayRows[i] as string[];
    if (row.some((cell) => String(cell).trim() === 'Question_ID')) {
      headerRowIndex = i;
      break;
    }
  }

  if (headerRowIndex === -1) {
    emitError('Could not find a row with "Question_ID" column header in the spreadsheet.');
    return [];
  }

  // Re-parse using the detected header row
  const headerRow = (rawArrayRows[headerRowIndex] as string[]).map((h) => String(h).trim());
  const dataRows = rawArrayRows.slice(headerRowIndex + 1) as string[][];

  const records: RawRecord[] = [];

  dataRows.forEach((row, idx) => {
    // idx is 0-based relative to data rows; absolute sheet row = headerRowIndex + 2 + idx (1-based)
    const rowIndex = headerRowIndex + 2 + idx;

    const str = (field: string): string => {
      const colIdx = headerRow.indexOf(field);
      if (colIdx === -1) return '';
      const val = row[colIdx];
      if (val === null || val === undefined) return '';
      return String(val).trim();
    };

    // Skip completely empty rows
    if (row.every((cell) => !String(cell).trim())) return;

    records.push({
      rowIndex,
      Question_ID: str('Question_ID'),
      Category: str('Category'),
      Subcategory: str('Subcategory'),
      Topic: str('Topic'),
      Question_Type: str('Question_Type'),
      Difficulty: str('Difficulty'),
      Question: str('Question'),
      Choice_A: str('Choice_A'),
      Choice_B: str('Choice_B'),
      Choice_C: str('Choice_C'),
      Choice_D: str('Choice_D'),
      Correct_Answer: str('Correct_Answer'),
      Explanation: str('Explanation'),
      Source_Page: str('Source_Page'),
      Source_Record: str('Source_Record'),
      Validation_Status: str('Validation_Status'),
      Active: str('Active'),
      Notes: str('Notes'),
    });
  });

  return records;
}

// ---------------------------------------------------------------------------
// Task 2.2 — Validation rules
// ---------------------------------------------------------------------------

/**
 * Returns true if the record passes the Active filter (does not emit errors).
 * Emits a warning and returns false when Active ≠ "Yes".
 */
function checkActive(rec: RawRecord): boolean {
  if (rec.Active.toLowerCase() !== 'yes') {
    emitWarning(
      `Question_ID "${rec.Question_ID}" (row ${rec.rowIndex}): excluded — Active="${rec.Active}" (must be "Yes").`
    );
    return false;
  }
  return true;
}

/**
 * Returns true if the record passes the Validation_Status filter.
 * Emits a warning and returns false when Validation_Status is not approved.
 *
 * Note: The requirement specifies exact match for "Approved" or "Validated".
 * The actual question bank uses "Validated from reference matrix" — a variant
 * that begins with the approved token. We use startsWith to accommodate this
 * real-world value while still rejecting truly unapproved statuses (e.g. "Draft").
 */
function checkValidationStatus(rec: RawRecord): boolean {
  const vs = rec.Validation_Status.toLowerCase();
  if (vs !== 'approved' && !vs.startsWith('validated')) {
    emitWarning(
      `Question_ID "${rec.Question_ID}" (row ${rec.rowIndex}): excluded — Validation_Status="${rec.Validation_Status}" (must be "Approved" or "Validated").`
    );
    return false;
  }
  return true;
}

/**
 * Detects duplicate Question_ID values across the full record set.
 * Returns the set of IDs that appear more than once (all copies are rejected).
 * Emits a build error for each duplicate group.
 */
function detectDuplicates(records: RawRecord[]): Set<string> {
  const seen = new Map<string, number[]>(); // id → row numbers

  for (const rec of records) {
    const id = rec.Question_ID;
    if (!seen.has(id)) {
      seen.set(id, []);
    }
    seen.get(id)!.push(rec.rowIndex);
  }

  const duplicateIds = new Set<string>();
  for (const [id, rows] of seen) {
    if (rows.length > 1) {
      duplicateIds.add(id);
      emitError(
        `Duplicate Question_ID "${id}" found at rows: ${rows.join(', ')}.`
      );
    }
  }
  return duplicateIds;
}

const REQUIRED_FIELDS: (keyof RawRecord)[] = [
  'Question_ID',
  'Question',
  'Correct_Answer',
  'Explanation',
  'Source_Page',
  'Source_Record',
];

/**
 * Checks required fields are non-empty.
 * Emits a build error for each missing field and returns false if any are missing.
 */
function checkRequiredFields(rec: RawRecord): boolean {
  let valid = true;
  for (const field of REQUIRED_FIELDS) {
    if (!rec[field]) {
      emitError(
        `Row ${rec.rowIndex}: required field "${field}" is absent or empty (Question_ID="${rec.Question_ID}").`
      );
      valid = false;
    }
  }
  return valid;
}

/**
 * For Objective_Questions, validates that all four choices are populated and
 * that Correct_Answer refers to a populated choice label.
 * Returns false (and emits build errors) on any failure.
 */
function checkObjectiveChoices(rec: RawRecord): boolean {
  if (!OBJECTIVE_TYPES.has(rec.Question_Type)) {
    return true; // Flash cards and unknowns — not validated here
  }

  let valid = true;
  const choiceMap: Record<string, string> = {
    A: rec.Choice_A,
    B: rec.Choice_B,
    C: rec.Choice_C,
    D: rec.Choice_D,
  };

  // Every choice must be non-empty
  for (const label of ['A', 'B', 'C', 'D'] as const) {
    if (!choiceMap[label]) {
      emitError(
        `Row ${rec.rowIndex} (Question_ID="${rec.Question_ID}"): Choice_${label} is empty for Objective_Question.`
      );
      valid = false;
    }
  }

  // Correct_Answer must reference a populated choice label.
  // For SATA it may be a comma or semicolon separated list like "A,C" or "A; B".
  const answerLabels = rec.Correct_Answer
    .split(/[,;]/)
    .map((s) => s.trim().toUpperCase())
    .filter((s) => s.length > 0);
  for (const label of answerLabels) {
    if (!['A', 'B', 'C', 'D'].includes(label)) {
      emitError(
        `Row ${rec.rowIndex} (Question_ID="${rec.Question_ID}"): Correct_Answer "${rec.Correct_Answer}" contains invalid label "${label}".`
      );
      valid = false;
    } else if (!choiceMap[label]) {
      emitError(
        `Row ${rec.rowIndex} (Question_ID="${rec.Question_ID}"): Correct_Answer references Choice_${label} which is empty.`
      );
      valid = false;
    }
  }

  return valid;
}

// ---------------------------------------------------------------------------
// Task 2.3 — Content scope enforcement
// ---------------------------------------------------------------------------

/**
 * Returns true if the record's Category is in the approved list.
 * Emits a build error (not a warning) for unknown categories.
 */
function checkCategory(rec: RawRecord): boolean {
  if (!APPROVED_CATEGORIES.has(rec.Category)) {
    emitError(
      `Row ${rec.rowIndex} (Question_ID="${rec.Question_ID}"): Category "${rec.Category}" is not in the approved list.`
    );
    return false;
  }
  return true;
}

/**
 * For Forms category, checks whether the Topic is an approved form or a
 * combination of approved forms (e.g. "Songahm Il-Jahng # 1 / Chung San Poom-Sae").
 * Emits a warning (not an error) and returns false for excluded Topics.
 */
function checkApprovedForm(rec: RawRecord): boolean {
  if (rec.Category !== 'Forms') return true;

  // Topics may reference multiple forms separated by " / "
  const referencedForms = rec.Topic.split(' / ').map((s) => s.trim());
  const allApproved = referencedForms.every((form) => APPROVED_FORMS.has(form));

  if (!allApproved) {
    emitWarning(
      `Question_ID "${rec.Question_ID}" (row ${rec.rowIndex}): excluded — Forms topic "${rec.Topic}" references a form not in the approved forms list.`
    );
    return false;
  }
  return true;
}

/**
 * Checks for Sok Bong or Fourth Degree/higher form references in Topic.
 * Emits a warning and returns false if matched.
 */
function checkExcludedTopics(rec: RawRecord): boolean {
  const topic = rec.Topic.toLowerCase();

  if (topic.includes('sok bong')) {
    emitWarning(
      `Question_ID "${rec.Question_ID}" (row ${rec.rowIndex}): excluded — Topic "${rec.Topic}" references Sok Bong.`
    );
    return false;
  }

  // Exclude "Fourth Degree" and higher ordinal/numeric degree references
  const fourthDegreePatterns = [
    'fourth degree',
    '4th degree',
    'fifth degree',
    '5th degree',
    'sixth degree',
    '6th degree',
    'seventh degree',
    '7th degree',
    'eighth degree',
    '8th degree',
    'ninth degree',
    '9th degree',
  ];
  for (const pattern of fourthDegreePatterns) {
    if (topic.includes(pattern)) {
      emitWarning(
        `Question_ID "${rec.Question_ID}" (row ${rec.rowIndex}): excluded — Topic "${rec.Topic}" references Fourth Degree or higher form.`
      );
      return false;
    }
  }

  return true;
}

// ---------------------------------------------------------------------------
// Task 2.4 — Output and summary
// ---------------------------------------------------------------------------

function mapToQuestion(rec: RawRecord): Question {
  const isFlashCard = rec.Question_Type === FLASH_CARD_TYPE;

  return {
    questionId: rec.Question_ID,
    category: rec.Category,
    subcategory: rec.Subcategory,
    topic: rec.Topic,
    questionType: rec.Question_Type,
    difficulty: rec.Difficulty,
    question: rec.Question,
    choices: isFlashCard
      ? null
      : {
          A: rec.Choice_A,
          B: rec.Choice_B,
          C: rec.Choice_C,
          D: rec.Choice_D,
        },
    correctAnswer: rec.Correct_Answer,
    explanation: rec.Explanation,
    sourcePage: rec.Source_Page,
    sourceRecord: rec.Source_Record,
  };
}

function emitSummary(questions: Question[]): void {
  const total = questions.length;
  console.log('\n=== Ingestion Summary ===');
  console.log(`Total included questions: ${total}`);

  // By Category
  const byCategory = new Map<string, number>();
  for (const q of questions) {
    byCategory.set(q.category, (byCategory.get(q.category) ?? 0) + 1);
  }
  console.log('\nBy Category:');
  for (const [cat, count] of [...byCategory.entries()].sort()) {
    console.log(`  ${cat}: ${count}`);
  }

  // By Question_Type
  const byType = new Map<string, number>();
  for (const q of questions) {
    byType.set(q.questionType, (byType.get(q.questionType) ?? 0) + 1);
  }
  console.log('\nBy Question Type:');
  for (const [qt, count] of [...byType.entries()].sort()) {
    console.log(`  ${qt}: ${count}`);
  }

  // By Difficulty
  const byDiff = new Map<string, number>();
  for (const q of questions) {
    byDiff.set(q.difficulty, (byDiff.get(q.difficulty) ?? 0) + 1);
  }
  console.log('\nBy Difficulty:');
  for (const [diff, count] of [...byDiff.entries()].sort()) {
    console.log(`  ${diff}: ${count}`);
  }

  // Expected total check
  if (total !== EXPECTED_TOTAL) {
    console.warn(
      `\n[WARN]  Expected ${EXPECTED_TOTAL} questions across approved categories but found ${total}.`
    );
  }

  console.log('=========================\n');
}

// ---------------------------------------------------------------------------
// Main pipeline
// ---------------------------------------------------------------------------

function run(): void {
  console.log(`Reading: ${XLSX_PATH}`);

  // Task 2.1 — parse
  const rawRecords = parseXlsx(XLSX_PATH);

  if (rawRecords.length === 0 && buildErrors.length > 0) {
    // Fatal parse failure — report and exit immediately
    flushAndExit();
    return;
  }

  console.log(`Parsed ${rawRecords.length} rows from spreadsheet.`);

  // Task 2.2 — detect duplicates first (needs full record set)
  const duplicateIds = detectDuplicates(rawRecords);

  const validatedRecords: RawRecord[] = [];

  for (const rec of rawRecords) {
    // --- Filters that emit warnings (excluded silently from build) ---
    if (!checkActive(rec)) continue;
    if (!checkValidationStatus(rec)) continue;

    // --- Content scope enforcement (Task 2.3) ---
    if (!checkCategory(rec)) continue;       // build error on unknown category
    if (!checkExcludedTopics(rec)) continue; // warning — Sok Bong / 4th degree+
    if (!checkApprovedForm(rec)) continue;   // warning — unapproved Forms topic

    // --- Duplicate IDs (build error, already collected above) ---
    if (duplicateIds.has(rec.Question_ID)) continue;

    // --- Required fields (build errors) ---
    if (!checkRequiredFields(rec)) continue;

    // --- Objective choice validation (build errors) ---
    if (!checkObjectiveChoices(rec)) continue;

    validatedRecords.push(rec);
  }

  // Task 2.4 — zero-questions check
  if (validatedRecords.length === 0) {
    emitError('Output contains no questions after all filters and validations.');
  }

  // Report all collected warnings first
  for (const w of buildWarnings) {
    console.warn(w);
  }

  // If there were any build errors, report them all and exit non-zero
  if (buildErrors.length > 0) {
    console.error('\n=== Build Errors ===');
    for (const e of buildErrors) {
      console.error(e);
    }
    console.error(`\n${buildErrors.length} build error(s) found. Output NOT written.`);
    process.exit(1);
  }

  // Task 2.4 — map to output model
  const questions: Question[] = validatedRecords.map(mapToQuestion);

  // Task 2.4 — emit summary log
  emitSummary(questions);

  // Task 2.4 — write output JSON
  const outputDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(questions, null, 2), 'utf-8');
  console.log(`✓ Wrote ${questions.length} questions to: ${OUTPUT_PATH}`);
}

function flushAndExit(): void {
  for (const w of buildWarnings) {
    console.warn(w);
  }
  if (buildErrors.length > 0) {
    console.error('\n=== Build Errors ===');
    for (const e of buildErrors) {
      console.error(e);
    }
    console.error(`\n${buildErrors.length} build error(s) found. Output NOT written.`);
    process.exit(1);
  }
}

run();

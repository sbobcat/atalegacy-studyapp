# Implementation Plan: ATA Legacy Study App

## Overview

Incremental implementation in TypeScript (React 18 + Vite). Each task builds on the previous, starting with project scaffolding and the build-time ingestion pipeline, then domain logic, session state, UI renderers, mode screens, and finally CI/deployment wiring. The design uses fast-check for property-based tests and Playwright for E2E.

## Tasks

- [x] 1. Scaffold project and configure tooling
  - Initialise Vite + React 18 + TypeScript project (`npm create vite@latest`)
  - Install and configure Tailwind CSS v3 with `tailwind.config.ts`
  - Install Vitest, React Testing Library, fast-check, Playwright, eslint-plugin-jsx-a11y, Zod, xlsx (SheetJS), and tsx
  - Add `tsconfig.json` with strict mode, path aliases for `src/lib`, `src/store`, `src/components`, `src/pages`
  - Create the directory skeleton: `src/data/`, `src/lib/`, `src/store/`, `src/components/renderers/`, `src/components/shared/`, `src/components/review/`, `src/components/test/`, `src/pages/`, `scripts/`, `tests/unit/`, `tests/property/`, `tests/components/`, `tests/e2e/`, `docs/`, `.github/workflows/`
  - Add `vitest.config.ts`, `playwright.config.ts`, `eslint.config.js`
  - Add `index.html` with descriptive `<title>`, favicon reference, and Open Graph meta tags (`og:title`, `og:description`, `og:url`)
  - Configure `vite.config.ts` with `base` option for subdirectory hosting and hash router support
  - _Requirements: 13.1, 13.2, 13.3, 13.6, 15.6_

- [x] 2. Build-time ingestion pipeline
  - [x] 2.1 Implement `scripts/ingest.ts` — XLSX parsing and record extraction
    - Use SheetJS to read `assets/questionbank/ATA_Legacy_Master_Question_Bank.xlsx`
    - Map each row to a raw record object preserving original field names
    - Collect all parse errors before exiting (fail-all mode)
    - _Requirements: 1.1, 1.12_

  - [x] 2.2 Implement ingestion validation rules
    - Filter records where `Active` ≠ "Yes" (case-insensitive); emit warning with `Question_ID`, field name, value (Req 2.7)
    - Filter records where `Validation_Status` ∉ {"Approved", "Validated"} (case-insensitive); emit warning (Req 1.3, 2.7)
    - Detect duplicate `Question_ID` values; collect all, emit build errors with conflicting IDs and row numbers (Req 1.4)
    - Reject records missing required fields (`Question_ID`, `Question`, `Correct_Answer`, `Explanation`, `Source_Page`, `Source_Record`); emit build error with row and field (Req 1.5)
    - For Objective_Questions, reject records with any empty `Choice_A`–`D` or a `Correct_Answer` not matching a populated choice label; emit build error with row and specific failure (Req 1.6)
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 2.7_

  - [x] 2.3 Implement content scope enforcement in `ingest.ts`
    - Allow only the five approved Categories (Kicks, Belt Meanings, Forms, Teaching Quadrants, Workbook Content); emit build error for any other category (Req 2.1)
    - Within Forms, allow only the twelve approved forms (nine color-belt forms, Shim Jun, Jung Yul, Chung San Poom-Sae); emit warning for excluded Topics (Req 2.2)
    - Exclude any record whose Topic references Sok Bong or Fourth Degree or higher forms; emit warning with `Question_ID` and reason (Req 2.3)
    - Preserve ATA-specific terminology exactly — no normalization (Req 2.4)
    - Assert expected total of 300 questions across approved categories after exclusions; log warning if count differs (Req 2.1)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6_

  - [x] 2.4 Implement ingestion output and summary
    - Emit zero-questions build error when no records pass all filters (Req 1.8)
    - Write validated records to `src/data/questions.json` as a `Question[]` array with camelCase field names; preserve original `Question_ID` values (Req 1.1, 1.10)
    - Emit build log summary: total included questions; counts by Category, Question_Type, Difficulty (Req 1.7)
    - Ensure the source xlsx file path is never referenced in the Vite bundle (add to `.gitignore` exclusion pattern or Vite `assetsInclude` negation) (Req 1.11)
    - _Requirements: 1.7, 1.8, 1.9, 1.10, 1.11_

  - [ ]* 2.5 Write unit tests for ingestion pipeline
    - Test valid spreadsheet input produces correct `questions.json` shape
    - Test each rejection rule (missing field, bad Validation_Status, duplicate ID, invalid objective choices) triggers the correct build error
    - Test all-errors-collected mode: multiple bad records produce multiple errors before exit
    - Test out-of-scope category and Topic records are excluded and logged
    - Test summary counts match the filtered output
    - _Requirements: 1.2–1.12, 2.1–2.7_

- [x] 3. Core data types and Zod schema
  - [x] 3.1 Define TypeScript interfaces and types in `src/lib/schema.ts`
    - Define `Question`, `QuestionType`, `Difficulty`, `Choice`, `PresentedQuestion`, `AnswerState` (ObjectiveAnswer | FlashCardAnswer), `SessionConfig`, `ScoreResult`, `CategoryBreakdown`, `DifficultyBreakdown`, `QuestionTypeBreakdown`, `FlashCardSummary`
    - Define Zod schema mirroring the `Question` interface; export `QuestionsJsonSchema` for runtime validation
    - _Requirements: 15.2, 15.3_

  - [ ]* 3.2 Write unit tests for Zod schema validation
    - Test valid question objects pass validation
    - Test each required field missing triggers a descriptive Zod error
    - Test invalid `QuestionType` and `Difficulty` enum values are rejected
    - _Requirements: 14.2_

- [x] 4. Domain library — PRNG, filter, selector, shuffler, scorer
  - [x] 4.1 Implement `src/lib/prng.ts` — Mulberry32 seedable PRNG
    - Export `createPrng(seed: number): () => number` returning a function that yields `[0, 1)` floats deterministically
    - _Requirements: 4.4, 4.5_

  - [ ]* 4.2 Write unit tests for `prng.ts`
    - Test same seed produces same sequence across calls
    - Test different seeds produce different sequences
    - _Requirements: 4.4_

  - [x] 4.3 Implement `src/lib/filter.ts` — `buildEligiblePool`
    - Implement `buildEligiblePool(questions: Question[], config: SessionConfig): Question[]`
    - Apply category, subcategory, topic, difficulty, and question-type filters independently; empty filter array means "all"
    - Return only Active_Questions matching all selected dimensions
    - _Requirements: 3.3, 3.6, 3.10_

  - [ ]* 4.4 Write property test for `buildEligiblePool` (Property 1)
    - **Property 1: Filter produces a subset of the input**
    - **Validates: Requirements 3.3, 3.6, 3.10**
    - _Tag: `// Feature: ata-legacy-study-app, Property 1`_

  - [x] 4.5 Implement `src/lib/selector.ts` — question selection with round-robin and seeded shuffle
    - Implement `selectQuestions(pool: Question[], count: number | 'all', seed: number | null): Question[]`
    - No duplicate `Question_ID` values in the result
    - When seed provided, use `createPrng(seed)` for deterministic selection and ordering
    - Implement round-robin across categories so no category exhausts before others draw proportionally (Req 4.7)
    - Cap selection at `min(count, pool.length)` and return all available when pool is smaller than requested (Req 4.6)
    - _Requirements: 4.1, 4.4, 4.5, 4.6, 4.7_

  - [ ]* 4.6 Write property test for `selectQuestions` — no duplicates (Property 2)
    - **Property 2: Selection never duplicates within a session**
    - **Validates: Requirements 4.1**
    - _Tag: `// Feature: ata-legacy-study-app, Property 2`_

  - [ ]* 4.7 Write property test for `selectQuestions` — seeded determinism (Property 3)
    - **Property 3: Seeded selection is deterministic**
    - **Validates: Requirements 4.4, 9.5**
    - _Tag: `// Feature: ata-legacy-study-app, Property 3`_

  - [ ]* 4.8 Write property test for `selectQuestions` — count cap (Property 13)
    - **Property 13: Eligible pool count respects the session config count cap**
    - **Validates: Requirements 3.4, 3.5, 4.6**
    - _Tag: `// Feature: ata-legacy-study-app, Property 13`_

  - [ ]* 4.9 Write property test for `selectQuestions` — interleaved round-robin (Property 12)
    - **Property 12: Interleaved selection maintains proportional draw**
    - **Validates: Requirements 4.7**
    - _Tag: `// Feature: ata-legacy-study-app, Property 12`_

  - [x] 4.10 Implement `src/lib/shuffler.ts` — `shuffleChoices`
    - Implement `shuffleChoices(question: Question, seed: number | null, index: number): Choice[]`
    - Return a `Choice[]` derived from an immutable copy; never mutate the source `Question`
    - Each `Choice` has `{ label, text, isCorrect }` where exactly one `isCorrect === true` for single-correct types
    - Flash cards return an empty array
    - _Requirements: 4.2, 4.3_

  - [ ]* 4.11 Write property test for `shuffleChoices` — correct-answer mapping preserved (Property 4)
    - **Property 4: Shuffled choices preserve correct-answer mapping**
    - **Validates: Requirements 4.2, 4.3**
    - _Tag: `// Feature: ata-legacy-study-app, Property 4`_

  - [ ]* 4.12 Write property test for `shuffleChoices` — no source mutation (Property 5)
    - **Property 5: Shuffling does not mutate the source question**
    - **Validates: Requirements 4.3**
    - _Tag: `// Feature: ata-legacy-study-app, Property 5`_

  - [x] 4.13 Implement `src/lib/scorer.ts` — `scoreSession`
    - Implement `scoreSession(input: ScoreInput): ScoreResult`
    - Award 1 point per correct Objective_Question; 0 for unanswered; never below 0 for incorrect (Req 8.1–8.3)
    - For Select-all-that-apply: award 1 point only on exact set match (Req 8.4)
    - Exclude flash cards from `totalScored`, `totalCorrect`, `totalIncorrect`, and percentage (Req 8.5)
    - Calculate `percentage = Math.round((totalCorrect / totalScored) * 100)` when `totalScored > 0`; null otherwise (Req 8.6–8.7)
    - Set `passed = percentage >= passingScore`; null when percentage is null (Req 8.8–8.9)
    - Populate `byCategory`, `byDifficulty`, `byQuestionType`, and `flashCardSummary` breakdowns (Req 9.3)
    - No dependency on any React component or browser API (Req 15.2)
    - _Requirements: 8.1–8.10, 9.3, 15.2_

  - [ ]* 4.14 Write property test for scorer — all correct → totalCorrect === totalScored (Property 6)
    - **Property 6: Scorer awards one point per correct objective answer**
    - **Validates: Requirements 8.1, 8.6**
    - _Tag: `// Feature: ata-legacy-study-app, Property 6`_

  - [ ]* 4.15 Write property test for scorer — flash cards excluded from scored count (Property 7)
    - **Property 7: Flash cards never contribute to scored count**
    - **Validates: Requirements 8.5, 8.6**
    - _Tag: `// Feature: ata-legacy-study-app, Property 7`_

  - [ ]* 4.16 Write property test for scorer — percentage calculation (Property 8)
    - **Property 8: Scoring percentage calculation is correct**
    - **Validates: Requirements 8.6**
    - _Tag: `// Feature: ata-legacy-study-app, Property 8`_

  - [ ]* 4.17 Write property test for scorer — pass/fail threshold (Property 9)
    - **Property 9: Pass/fail threshold is applied consistently**
    - **Validates: Requirements 8.8, 8.9**
    - _Tag: `// Feature: ata-legacy-study-app, Property 9`_

  - [ ]* 4.18 Write property test for scorer — SATA exact match (Property 10)
    - **Property 10: Select-all-that-apply scoring requires exact match**
    - **Validates: Requirements 8.4**
    - _Tag: `// Feature: ata-legacy-study-app, Property 10`_

  - [ ]* 4.19 Write property test for scorer — category breakdown totals consistent (Property 11)
    - **Property 11: Category breakdown totals are consistent**
    - **Validates: Requirements 9.3**
    - _Tag: `// Feature: ata-legacy-study-app, Property 11`_

- [x] 5. Checkpoint — domain library complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Session store and data loading
  - [ ] 6.1 Implement `src/store/SessionStore.tsx` — React context + sessionStorage persistence
    - Define `SessionState`, `SessionAction`, and `SessionStore` interfaces
    - Implement `SessionProvider` component with `useReducer`; serialize/deserialize state to `sessionStorage` on every dispatch
    - On mount, attempt to restore from `sessionStorage`; validate all `Question_ID`s against current question bank; discard stale state and surface a dismissible notice if any ID is missing (Req 10.2)
    - Expose `useSession()` hook returning `{ state, dispatch }`
    - Session state clears when tab closes (sessionStorage semantics satisfy Req 10.6); never use localStorage
    - _Requirements: 10.1, 10.2, 10.5, 10.6, 10.7_

  - [ ] 6.2 Implement data loading in `src/main.tsx` / `src/App.tsx`
    - Load `src/data/questions.json` via dynamic `import()` or `fetch`; run Zod schema validation on load
    - On load failure, render an error page with plain-language message, retry button, and home button (Req 14.1)
    - On schema validation failure, render an error page listing each failed record's `Question_ID` or row position (Req 14.2)
    - Provide loaded questions via React context to the full component tree
    - _Requirements: 14.1, 14.2_

  - [ ]* 6.3 Write unit tests for `SessionStore`
    - Test state serialization round-trips through sessionStorage correctly
    - Test stale `Question_ID` detection discards state and surfaces notice
    - Test dispatch actions update state correctly (navigate, record answer, reset)
    - _Requirements: 10.1, 10.2, 10.4_

- [ ] 7. Hash router and shared components
  - [ ] 7.1 Implement hash-based router in `src/App.tsx`
    - Parse `window.location.hash` to render the appropriate page component
    - Define routes: `#/`, `#/configure`, `#/review`, `#/review/summary`, `#/test`, `#/test/results`
    - On unknown hash, redirect to `#/`
    - _Requirements: 13.4_

  - [ ] 7.2 Implement shared accessibility primitives
    - `src/components/shared/SkipNavLink.tsx` — renders as the first focusable element on every screen; links to `#main-content` (Req 11.2)
    - `src/components/shared/LiveRegion.tsx` — wraps an `aria-live="polite"` div for screen-reader announcements (Req 11.4)
    - `src/components/shared/ErrorBoundary.tsx` — catches render errors; shows plain-language message without raw stack trace (Req 14, design error handling)
    - _Requirements: 11.2, 11.4_

  - [ ] 7.3 Implement reusable UI components
    - `ProgressBar.tsx` — displays current question number, total, and (in test mode) unanswered count; updates on navigation (Req 7.3)
    - `NavigationControls.tsx` — Previous / Next / End Session buttons; disables Next when answer not yet recorded (Req 5.11)
    - `ConfirmationDialog.tsx` — accessible modal with confirm/cancel; focus trapped inside while open; focus returns to trigger on close (Req 11.13, 14.5, 14.6)
    - `FeedbackPanel.tsx` — displays correct answer + explanation; visible in review mode only; hidden in test mode (Req 5.3)
    - `SourceDetail.tsx` — collapsible section showing source page and source record; collapsed by default (Req 5.3)
    - `QuestionCard.tsx` — wraps renderer + FeedbackPanel; accepts `mode` prop to control feedback visibility (Req 15.4)
    - _Requirements: 5.3, 5.6, 5.9, 7.3, 7.4, 11.13, 14.5, 15.4_

  - [ ]* 7.4 Write component tests for shared components
    - Test `ProgressBar` renders correct / total / unanswered counts and updates
    - Test `NavigationControls` disables Next when `canAdvance=false`
    - Test `ConfirmationDialog` focus trap and cancel restores caller state
    - Test `FeedbackPanel` is visible in review mode and hidden in test mode
    - Test `SourceDetail` collapses/expands on interaction
    - _Requirements: 5.3, 5.9, 7.3, 11.13_

- [ ] 8. Question type renderers
  - [ ] 8.1 Implement `MultipleChoiceRenderer.tsx`
    - Radio-button group presenting exactly four choices in shuffled order; initially unselected
    - Satisfies `QuestionRendererProps` interface; disabled when `disabled=true`
    - Handles `Four-choice multiple choice`, `Reverse recognition`, `Scenario/application` types
    - Proper ARIA: `role="radiogroup"`, `aria-labelledby`, each radio associated with its label
    - Focus indicator meets WCAG 2.2 SC 2.4.11 (2px offset, 3:1 contrast)
    - _Requirements: 12.1, 12.5, 11.1, 11.6, 15.3_

  - [ ] 8.2 Implement `SelectAllRenderer.tsx`
    - Checkbox group with visible label explicitly stating multiple answers may be correct
    - Satisfies `QuestionRendererProps` interface; disabled when `disabled=true`
    - Proper ARIA: `role="group"`, `aria-labelledby`
    - _Requirements: 12.2, 11.6, 15.3_

  - [ ] 8.3 Implement `FlashCardRenderer.tsx`
    - Reveal button shows answer on demand; `Got it` / `Needs review` controls not interactive before Reveal (Req 5.4, 5.5, 12.3)
    - After reveal, presents self-assessment controls
    - In test mode, behaves per Req 7.6 (Reveal available, self-assessment after reveal, not scored)
    - Keyboard accessible; focus moves to revealed content after Reveal press (Req 11.13)
    - _Requirements: 5.4, 5.5, 7.6, 12.3, 11.13, 15.3_

  - [ ] 8.4 Implement `MatchingRenderer.tsx`
    - Dropdown or button-based interface pairing each prompt item with a selectable control
    - Options drawn from the complete answer-side item set defined in the question
    - Keyboard accessible as primary interaction; drag-and-drop optional enhancement (Req 11.10)
    - Satisfies `QuestionRendererProps` interface
    - _Requirements: 12.4, 11.10, 15.3_

  - [ ] 8.5 Implement `UnknownTypeRenderer.tsx`
    - Renders question text with a notice that the question type is not yet supported
    - Never throws an unhandled error (Req 12.6)
    - _Requirements: 12.6_

  - [ ]* 8.6 Write component tests for all renderers
    - `MultipleChoiceRenderer`: renders four choices, selects one, disabled state blocks interaction
    - `SelectAllRenderer`: multiple selections, disabled state, label text
    - `FlashCardRenderer`: Reveal gate (controls inactive before reveal), post-reveal self-assessment, keyboard flow
    - `MatchingRenderer`: dropdown renders all options, selection recorded, keyboard accessible
    - `UnknownTypeRenderer`: renders notice without error
    - _Requirements: 12.1–12.6, 11.6_

- [ ] 9. Session configuration screen (`src/pages/Configure.tsx`)
  - [ ] 9.1 Implement session configuration form
    - Mode selector (Review / Test)
    - Filter controls: Category multi-select; Subcategory and Topic cascade — when Category changes, update available Subcategory/Topic options and deselect now-invalid prior selections (Req 3.11)
    - Difficulty and Question_Type filter controls
    - Live eligible-pool count badge updating within 200 ms on any filter change (Req 3.6)
    - Question count picker (10, 20, 30, 50, All); disable counts exceeding pool size (Req 3.5)
    - Passing score input (1–100, default 80) (Req 3.7)
    - Seed input with validation (positive integer 1–2,147,483,647; show error and block start on invalid) (Req 3.8, 4.8)
    - Start button disabled when pool is empty, with explanatory message (Req 3.10)
    - All form controls associated with labels via `<label htmlFor>` (Req 11.6)
    - _Requirements: 3.1–3.11, 4.8, 11.6_

  - [ ] 9.2 Implement Quick Start button on `src/pages/Home.tsx`
    - Bypass configuration; start Review Mode with defaults: all categories, all types, 20 questions, 80% passing score, no seed (Req 3.9)
    - _Requirements: 3.9_

  - [ ]* 9.3 Write component tests for Configure screen
    - Test filter cascade: changing Category updates Subcategory/Topic and deselects stale values
    - Test live pool count updates within 200 ms
    - Test count picker disables options exceeding pool size
    - Test seed validation rejects out-of-range and non-integer values
    - Test Start disabled with empty pool + message
    - Test Quick Start dispatches correct default config
    - _Requirements: 3.5, 3.6, 3.8, 3.10, 3.11_

- [ ] 10. Home screen (`src/pages/Home.tsx`)
  - Implement `Home.tsx` with application title, mode description, Quick Start button, and "Configure session" navigation
  - Include `SkipNavLink` as first focusable element
  - Semantic HTML: one `<h1>`, landmark regions (`<header>`, `<main>`, `<nav>`)
  - Stale-session notice rendered here when `SessionStore` detects discarded state
  - _Requirements: 3.9, 10.2, 11.2, 11.5_

- [ ] 11. Review Mode session screen (`src/pages/ReviewSession.tsx`)
  - [ ] 11.1 Implement ReviewSession page
    - Render one question at a time using `QuestionCard` with `mode="review"`
    - Dispatch `RECORD_ANSWER` to `SessionStore` on every answer change
    - On Objective_Question answer submission, announce result via `LiveRegion` (Req 11.4)
    - For Flash_Card: Reveal button → answer displayed; then "Got it" / "Needs review" (Req 5.4, 5.5)
    - Next button disabled until answer recorded or flash card revealed (Req 5.11)
    - Restore prior answer and feedback when navigating backward (Req 5.7, 5.8)
    - Show persistent `ProgressBar` (Req 5.9)
    - End session control on final question navigates to `#/review/summary` (Req 5.10)
    - `SkipNavLink` as first focusable element; focus moves to question content on navigation (Req 11.2, 11.13)
    - _Requirements: 5.1–5.11, 11.2, 11.4, 11.13_

  - [ ]* 11.2 Write component tests for ReviewSession
    - Test immediate feedback shown after Objective_Question answer
    - Test Flash_Card: "Got it"/"Needs review" blocked before Reveal; available after
    - Test backward navigation restores answer and feedback
    - Test Next disabled before answer; enabled after
    - Test progress indicator updates correctly
    - _Requirements: 5.2–5.11_

- [ ] 12. Review Summary screen (`src/pages/ReviewSummary.tsx`)
  - [ ] 12.1 Implement ReviewSummary page
    - Display totals: questions reviewed, Objective_Questions correct/incorrect, Flash_Cards "Got it"/"Needs review" (Req 6.2)
    - Display per-Category and per-Difficulty breakdowns with the four counts each (Req 6.3)
    - Display missed/needs-review question list with question text, correct answer, explanation, source page, source record (Req 6.4)
    - Display suggested categories/topics for further study (at least one incorrect/needs-review in that category/topic) (Req 6.5)
    - Do not label result as a formal score when flash cards were included; use separate labeled sections (Req 6.6)
    - "Review missed" button: enabled when ≥1 missed/needs-review exists; starts new Review session with only those questions (Req 6.7)
    - "New session" button returns to `#/configure` (Req 6.8)
    - _Requirements: 6.1–6.8_

  - [ ]* 12.2 Write component tests for ReviewSummary
    - Test correct/incorrect/flashcard counts rendered accurately
    - Test per-Category and per-Difficulty breakdowns
    - Test missed question list entries contain all required fields
    - Test "Review missed" button disabled when no misses; enabled otherwise
    - Test "Review missed" starts session with correct question subset
    - _Requirements: 6.2–6.8_

- [ ] 13. Test Mode session screen (`src/pages/TestSession.tsx`)
  - [ ] 13.1 Implement TestSession page
    - Render one question at a time using `QuestionCard` with `mode="test"`; no feedback displayed (Req 7.1)
    - Answer choices randomized (Req 7.2)
    - Allow free forward/backward navigation and answer replacement before submission (Req 7.4)
    - `ProgressBar` showing current question, total, and unanswered count; updates on each navigation/answer (Req 7.3)
    - Retain all answers in `SessionStore` on navigation; no answer discarded (Req 7.7)
    - Flash cards: Reveal + self-assessment available; not included in percentage score (Req 7.6)
    - Submit button triggers `ConfirmationDialog` stating unanswered count; only proceeds after explicit confirm; cancel returns with answers intact (Req 7.5, 14.6)
    - On confirmed submit, navigate to `#/test/results`
    - `SkipNavLink` as first focusable element; focus moves to question on navigation (Req 11.2, 11.13)
    - _Requirements: 7.1–7.7, 11.2, 11.13, 14.6_

  - [ ]* 13.2 Write component tests for TestSession
    - Test no correctness indicator, correct answer, or explanation visible during session
    - Test answer replacement before submission
    - Test unanswered count updates in progress bar
    - Test submit dialog shows correct unanswered count; cancel returns with answers intact
    - Test Flash_Card self-assessment available after Reveal
    - _Requirements: 7.1–7.7_

- [ ] 14. Test Results screen (`src/pages/TestResults.tsx`)
  - [ ] 14.1 Implement TestResults page
    - Display: correct, incorrect, unanswered counts; percentage score; pass/"Needs more review" result; passing score used (Req 9.2)
    - Display breakdowns by Category, Difficulty, Question_Type (correct/incorrect/unanswered) (Req 9.3)
    - Answer review section for every question: Objective_Questions show learner's answer, correct answer, indicator, explanation, Category, Topic, Difficulty, collapsible source section; Flash_Cards show revealed answer or "Not revealed", self-assessment, and explanation without indicator (Req 9.4)
    - Display seed value when one was used (Req 9.5)
    - "Retake same test" button (enabled only when seed was used) (Req 9.6)
    - "New randomized test" button → `#/configure` (Req 9.6)
    - "Review missed" button → new Review session for missed/needs-review questions; enabled only when ≥1 exists (Req 9.6)
    - "Home" button → `#/` (Req 9.6)
    - No scored percentage displayed when zero Objective_Questions were in the session; show notice (Req 8.7)
    - _Requirements: 9.1–9.6, 8.7_

  - [ ]* 14.2 Write component tests for TestResults
    - Test all counts and percentage displayed correctly
    - Test pass/fail label based on percentage vs passing score
    - Test breakdown tables by Category, Difficulty, Question_Type
    - Test answer review section content for Objective and Flash_Card types
    - Test seed displayed when used; "Retake" disabled when no seed
    - Test "Review missed" enabled/disabled based on missed count
    - _Requirements: 9.2–9.6_

- [ ] 15. Checkpoint — all screens complete
  - Ensure all unit, property, and component tests pass, ask the user if questions arise.

- [ ] 16. Session persistence and reset
  - [ ] 16.1 Implement "Reset session" control visible from every active session screen
    - Render a persistent `Reset session` button accessible from `ReviewSession`, `TestSession`, and summary/results screens (Req 10.3)
    - When activated with ≥1 recorded answer, show `ConfirmationDialog`; on confirm, dispatch `RESET_SESSION` to clear state and navigate to `#/`; on cancel, return with all answers intact (Req 10.4, 14.5)
    - _Requirements: 10.3, 10.4, 14.5_

  - [ ]* 16.2 Write component tests for Reset session flow
    - Test reset button present on ReviewSession, TestSession, and result screens
    - Test confirmation dialog appears when answers exist; dismiss returns with answers intact
    - Test confirm clears state and navigates to home
    - _Requirements: 10.3, 10.4_

- [ ] 17. Accessibility pass
  - [ ] 17.1 Audit and fix color contrast across all screens
    - Verify minimum 4.5:1 contrast ratio for normal text and 3:1 for large text (Req 11.7)
    - Verify focus indicators have ≥3:1 contrast and ≥2px offset area (Req 11.3)
    - Ensure correct/incorrect/pass/fail states are communicated via text or labeled icon, not color alone (Req 11.8)
    - _Requirements: 11.3, 11.7, 11.8_

  - [ ] 17.2 Implement responsive layout and motion preferences
    - Verify all layouts work at 320 CSS pixel viewport width with 200% browser zoom; no horizontal scrolling; no text truncation; all controls operable (Req 11.9)
    - Add `prefers-reduced-motion` CSS media query limiting all animation/transition durations to ≤0.01 s (Req 11.11)
    - Verify all touch targets are at least 24×24 CSS pixels (Req 11.12)
    - _Requirements: 11.9, 11.11, 11.12_

  - [ ] 17.3 Audit semantic HTML, headings, and landmarks across all pages
    - Each page has a single `<h1>`, correct heading hierarchy, `<main>`, `<header>`, `<nav>` landmarks (Req 11.5)
    - All form controls have associated `<label>` elements (Req 11.6)
    - Tab order follows visual reading order on every screen (Req 11.2)
    - _Requirements: 11.2, 11.5, 11.6_

  - [ ]* 17.4 Write automated accessibility tests
    - Run `@axe-core/playwright` on each routed page in the E2E suite; assert zero critical violations
    - Test `prefers-reduced-motion` emulation via Playwright `emulateMedia`
    - _Requirements: 11.1_

- [ ] 18. CI workflow and static deployment configuration
  - [ ] 18.1 Create `.github/workflows/ci.yml`
    - Steps in order: ESLint lint → `tsc --noEmit` type check → `vitest run` (unit + property + component) → `tsx scripts/ingest.ts --dry-run` data validation → `vite build` → Playwright E2E against `vite preview`
    - Exit non-zero on any step failure (Req 13.5)
    - _Requirements: 13.5_

  - [ ] 18.2 Configure static deployment for GitHub Pages
    - Set `base` in `vite.config.ts` to the repository subdirectory path
    - Verify all asset references, internal links, and hash routes resolve correctly at the subdirectory URL (Req 13.3)
    - Add a `deploy` job to `ci.yml` (or a separate `deploy.yml`) that runs on pushes to `main` after CI passes, using `actions/deploy-pages` to publish the `dist/` output
    - _Requirements: 13.1, 13.2, 13.3_

  - [ ] 18.3 Write maintainer and developer documentation
    - `docs/MAINTAINER.md`: steps to update the Question_Bank spreadsheet, run `ingest.ts`, validate JSON output, and deploy (Req 15.5)
    - `docs/DEVELOPER.md`: local dev setup, test commands, production build, CI workflow description (Req 15.6)
    - _Requirements: 15.5, 15.6_

  - [ ]* 18.4 Write E2E tests for complete user journeys (Playwright)
    - Complete Review Mode session: configure → answer all → view summary; verify counts and missed list
    - Complete Test Mode session: configure → answer all → submit → verify results screen
    - Verify no feedback exposed during Test Mode session
    - Verify scoring accuracy and pass/fail threshold at boundary (e.g., exactly 80%)
    - Mobile viewport 375×667: all controls reachable and operable
    - Keyboard-only navigation: Tab through full Review Mode session without mouse
    - Seed reproducibility: same seed produces identical question order across two sessions
    - _Requirements: 5.1–5.11, 7.1–7.7, 8.1–8.9, 9.1–9.6, 11.1, 11.2, 13.4_

- [ ] 19. Final checkpoint — production build verified
  - Run `vite build` and confirm output is static HTML/CSS/JS/JSON with no server-side component
  - Run full Playwright suite against `vite preview`
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- All property tests use `fast-check` with at least 100 runs (`numRuns: 100`) and the tag comment `// Feature: ata-legacy-study-app, Property N`
- The design uses TypeScript throughout — all implementation tasks target TypeScript
- `src/data/questions.json` is generated by `scripts/ingest.ts` and must be run before the first `vite dev` or `vite build`
- Hash-based routing (`#/`) requires no server rewrite rules and works on all static hosts
- `sessionStorage` is the persistence mechanism; it satisfies both refresh-survival (Req 10.1) and tab-close clearing (Req 10.6)
- The xlsx source file must never appear in the Vite production bundle (verify via bundle analysis)
- Checkpoints ensure incremental validation; tasks 5, 15, and 19 are natural integration gates

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1", "3.1"] },
    { "id": 1, "tasks": ["2.2", "2.3", "3.2"] },
    { "id": 2, "tasks": ["2.4", "4.1", "4.3"] },
    { "id": 3, "tasks": ["2.5", "4.2", "4.4", "4.5"] },
    { "id": 4, "tasks": ["4.6", "4.7", "4.8", "4.9", "4.10", "4.13"] },
    { "id": 5, "tasks": ["4.11", "4.12", "4.14", "4.15", "4.16", "4.17", "4.18", "4.19", "6.1"] },
    { "id": 6, "tasks": ["6.2", "6.3", "7.1", "7.2"] },
    { "id": 7, "tasks": ["7.3", "9.2"] },
    { "id": 8, "tasks": ["7.4", "8.1", "8.2", "8.3", "8.4", "8.5", "9.1"] },
    { "id": 9, "tasks": ["8.6", "9.3", "10", "11.1", "13.1"] },
    { "id": 10, "tasks": ["11.2", "12.1", "13.2", "14.1"] },
    { "id": 11, "tasks": ["12.2", "14.2", "16.1"] },
    { "id": 12, "tasks": ["16.2", "17.1", "17.2", "17.3"] },
    { "id": 13, "tasks": ["17.4", "18.1", "18.2", "18.3"] },
    { "id": 14, "tasks": ["18.4"] }
  ]
}
```

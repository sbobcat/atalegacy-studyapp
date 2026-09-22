# Design Document: ATA Legacy Study App

## Overview

The ATA Legacy Study App is a fully static, single-page application (SPA) built with React, TypeScript, and Vite. It delivers two learning modes — Review Mode and Test Mode — drawing exclusively from a typed JSON question bank derived at build time from `ATA_Legacy_Master_Question_Bank.xlsx`. There is no backend, no database, no user accounts, and no server-side state. The production output is a bundle of HTML, CSS, JavaScript, and JSON assets deployable to GitHub Pages or any equivalent static host.

The design centers on five concerns kept deliberately separate:

1. **Data pipeline** — a Node.js build script that reads, validates, and emits the question JSON.
2. **Domain logic** — pure functions for filtering, selecting, shuffling, and scoring questions.
3. **Session state** — a React context + `sessionStorage`-backed store that survives page refreshes.
4. **Rendering** — a thin component layer that maps question types to accessible renderers.
5. **Routing** — hash-based client-side routing compatible with static hosts.

### Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | React 18 + TypeScript + Vite | Specified in prompt; widely maintained; fast HMR; excellent TypeScript support |
| Styling | Tailwind CSS v3 | Utility-first; consistent design tokens; built-in responsive and accessibility utilities |
| Routing | Hash router (`#/`) | Works on every static host without server rewrite rules; satisfies Req 13.4 |
| Persistence | `sessionStorage` | Satisfies Req 10.1 (survives refresh) and Req 10.6 (clears when tab is closed) |
| Randomization | Seedable PRNG (mulberry32) | Pure JS, zero deps, deterministic, suitable for reproducible tests |
| Validation | Zod | Runtime schema enforcement for the loaded JSON; catches data drift early |
| Testing | Vitest + React Testing Library + fast-check + Playwright | Unit/property/component/E2E as required |
| Spreadsheet parsing | `xlsx` (SheetJS) in Node.js build script | Well-maintained; handles `.xlsx` natively |

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                   Build Time                          │
│                                                       │
│  ATA_Legacy_Master_Question_Bank.xlsx                 │
│           │                                           │
│           ▼                                           │
│  scripts/ingest.ts  (Node.js / tsx)                   │
│    - parse XLSX via SheetJS                           │
│    - validate every record                            │
│    - enforce content scope (Req 2)                    │
│    - emit src/data/questions.json                     │
│    - emit summary to stdout                           │
└───────────────────┬──────────────────────────────────┘
                    │ (bundled by Vite as a static asset)
┌───────────────────▼──────────────────────────────────┐
│                 Runtime (Browser)                     │
│                                                       │
│  src/                                                 │
│  ├── data/questions.json  (immutable, read-only)      │
│  ├── lib/                                             │
│  │   ├── schema.ts          Zod schemas               │
│  │   ├── filter.ts          Eligible pool logic       │
│  │   ├── selector.ts        Random / seeded selection │
│  │   ├── shuffler.ts        Choice shuffling          │
│  │   ├── scorer.ts          Centralized scoring       │
│  │   └── prng.ts            Mulberry32 PRNG           │
│  ├── store/                                           │
│  │   └── SessionStore.tsx   Context + sessionStorage  │
│  ├── components/            UI layer                  │
│  │   ├── renderers/         One file per Q type       │
│  │   ├── shared/            Reused across modes       │
│  │   ├── review/            Review-specific screens   │
│  │   └── test/              Test-specific screens     │
│  ├── pages/                 Routed views              │
│  │   ├── Home.tsx                                     │
│  │   ├── Configure.tsx                                │
│  │   ├── ReviewSession.tsx                            │
│  │   ├── ReviewSummary.tsx                            │
│  │   ├── TestSession.tsx                              │
│  │   └── TestResults.tsx                              │
│  └── App.tsx                Hash router               │
└──────────────────────────────────────────────────────┘
```

### Data Flow

```
questions.json (immutable)
        │
        ▼
filter(questions, sessionConfig)  →  eligiblePool
        │
        ▼
select(eligiblePool, count, seed)  →  sessionQuestions[]
        │
        ▼
shuffleChoices(question, seed, index)  →  presentedQuestion[]
        │
        ▼
SessionStore  (holds answers[], currentIndex, config)
        │
        ├──▶  ReviewSession / TestSession  (reads state, dispatches actions)
        │
        └──▶  scorer(answers[], sessionQuestions[])  →  ScoreResult
```

### Routing (Hash-Based)

| Hash | Screen |
|---|---|
| `#/` | Home |
| `#/configure` | Session Configuration |
| `#/review` | Review Mode session |
| `#/review/summary` | Review Summary |
| `#/test` | Test Mode session |
| `#/test/results` | Test Results |

All routing is client-side. The server only ever serves `index.html`. No 404 handling required beyond configuring the static host to fall back to `index.html`.

---

## Components and Interfaces

### Question Renderer Interface

Every question type renderer satisfies this TypeScript interface:

```typescript
interface QuestionRendererProps {
  question: Question;           // The immutable question object
  presentedChoices: Choice[];   // Shuffled choices (empty for flash cards)
  answer: AnswerState | null;   // Current recorded answer (null = unanswered)
  onChange: (answer: AnswerState) => void;
  disabled: boolean;            // true when feedback is displayed or test submitted
  mode: 'review' | 'test';
}
```

Renderers:
- `MultipleChoiceRenderer` — handles `Four-choice multiple choice`, `Reverse recognition`, `Scenario/application`
- `SelectAllRenderer` — handles `Select-all-that-apply`
- `FlashCardRenderer` — handles `Direct-recall flash card`
- `MatchingRenderer` — handles `Matching/classification`
- `UnknownTypeRenderer` — fallback for unrecognized types (Req 12.6)

### Session Store Interface

```typescript
interface SessionState {
  config: SessionConfig;
  questions: PresentedQuestion[];   // shuffled choices baked in
  currentIndex: number;
  answers: Record<string, AnswerState>; // keyed by Question_ID
  mode: 'review' | 'test';
  phase: 'active' | 'summary' | 'results';
  startedAt: number; // Unix ms
}

interface SessionStore {
  state: SessionState | null;
  dispatch: (action: SessionAction) => void;
}
```

### Scorer Interface

```typescript
interface ScoreInput {
  questions: Question[];
  answers: Record<string, AnswerState>;
  passingScore: number; // percentage, e.g. 80
}

interface ScoreResult {
  totalScored: number;         // objective questions only
  totalCorrect: number;
  totalIncorrect: number;
  totalUnanswered: number;
  percentage: number | null;   // null when totalScored === 0
  passed: boolean | null;      // null when percentage is null
  byCategory: CategoryBreakdown[];
  byDifficulty: DifficultyBreakdown[];
  byQuestionType: QuestionTypeBreakdown[];
  flashCardSummary: FlashCardSummary;
}
```

### Filter Interface

```typescript
interface SessionConfig {
  mode: 'review' | 'test';
  categories: string[];      // [] = all
  subcategories: string[];
  topics: string[];
  difficulties: string[];
  questionTypes: string[];
  count: 10 | 20 | 30 | 50 | 'all';
  passingScore: number;
  seed: number | null;
}

function buildEligiblePool(
  questions: Question[],
  config: SessionConfig
): Question[]
```

### Shared Components

| Component | Purpose |
|---|---|
| `ProgressBar` | Current question / total, unanswered count (test only) |
| `NavigationControls` | Previous / Next / End Session buttons |
| `FeedbackPanel` | Shows correct answer + explanation (Review only, hidden in Test) |
| `SourceDetail` | Collapsible source page + record (Req 5.3) |
| `ConfirmationDialog` | Modal confirmation for destructive actions |
| `LiveRegion` | `aria-live="polite"` wrapper for screen-reader announcements |
| `SkipNavLink` | First focusable element on every screen (Req 11.2) |
| `ErrorBoundary` | Catches render errors without crashing the app |
| `QuestionCard` | Wraps renderer + feedback; controlled by mode prop |

---

## Data Models

### Question (canonical, immutable)

```typescript
interface Question {
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
  } | null;                    // null for flash cards
  correctAnswer: string;       // e.g. "A", "B", "A,C" for SATA, or answer text
  explanation: string;
  sourcePage: string;
  sourceRecord: string;
}

type QuestionType =
  | 'Four-choice multiple choice'
  | 'Select-all-that-apply'
  | 'Direct-recall flash card'
  | 'Matching/classification'
  | 'Reverse recognition'
  | 'Scenario/application';

type Difficulty = 'Easy' | 'Medium' | 'Hard';
```

### Choice (shuffled presentation only)

```typescript
interface Choice {
  label: string;        // original label from Question_Bank (A/B/C/D)
  text: string;         // choice text
  isCorrect: boolean;   // derived at shuffle time, never mutates Question
}
```

### PresentedQuestion (session view — immutable once created)

```typescript
interface PresentedQuestion {
  question: Question;           // reference to original
  presentedChoices: Choice[];   // shuffled; empty for flash cards
}
```

### AnswerState

```typescript
type ObjectiveAnswer = {
  type: 'objective';
  selected: string[];   // label(s) of selected choice(s), e.g. ["B"] or ["A","C"]
};

type FlashCardAnswer = {
  type: 'flashcard';
  revealed: boolean;
  selfAssessment: 'got-it' | 'needs-review' | null;
};

type AnswerState = ObjectiveAnswer | FlashCardAnswer;
```

### SessionConfig

```typescript
interface SessionConfig {
  mode: 'review' | 'test';
  categories: string[];
  subcategories: string[];
  topics: string[];
  difficulties: string[];
  questionTypes: string[];
  count: number | 'all';
  passingScore: number;       // 1–100, default 80
  seed: number | null;        // null = random
}
```

### ScoreResult (described above in Components and Interfaces)

### Ingestion Output (questions.json schema)

```typescript
// Root of questions.json
type QuestionsJson = Question[];
```

The Zod schema mirrors the `Question` interface exactly. Runtime validation runs once on initial data load; errors are surfaced as human-readable messages (Req 14.2).

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Property-based testing is applicable to this feature. The core domain functions — filtering, selection, shuffling, and scoring — are pure functions operating on typed data. They have large input spaces, universal invariants, and deterministic behavior given the same seed. We use **fast-check** as the PBT library for all property tests.

---

### Property 1: Filter produces a subset of the input

*For any* question bank and any session configuration, the result of `buildEligiblePool` SHALL be a subset of the input questions array; every returned question SHALL match all filter dimensions (category, subcategory, topic, difficulty, question type) specified in the configuration; no question outside those dimensions SHALL appear in the result.

**Validates: Requirements 3.3, 3.6, 3.10**

---

### Property 2: Selection never duplicates within a session

*For any* eligible pool of size N and any requested count ≤ N, the selected questions array SHALL contain no duplicate `Question_ID` values.

**Validates: Requirements 4.1**

---

### Property 3: Seeded selection is deterministic

*For any* question pool, session config, and seed value, calling `selectQuestions` twice with the same seed SHALL produce the same ordered array of questions with the same shuffled choice order.

**Validates: Requirements 4.4, 9.5**

---

### Property 4: Shuffled choices preserve correct-answer mapping

*For any* objective question, after `shuffleChoices` is applied, exactly one choice in the returned `Choice[]` array SHALL have `isCorrect === true`, and its `text` SHALL equal the text of the choice labeled as `correctAnswer` in the original immutable `Question` object.

**Validates: Requirements 4.2, 4.3**

---

### Property 5: Shuffling does not mutate the source question

*For any* question object and any seed, the `Question` object passed into `shuffleChoices` SHALL have identical field values before and after the call; no property of the original object SHALL be modified.

**Validates: Requirements 4.3**

---

### Property 6: Scorer awards one point per correct objective answer

*For any* set of questions and a corresponding answer map where every objective question has been answered correctly, the scorer SHALL return `totalCorrect === totalScored` and `totalIncorrect === 0` and `totalUnanswered === 0`.

**Validates: Requirements 8.1, 8.6**

---

### Property 7: Flash cards never contribute to scored count

*For any* session that contains both objective questions and flash cards, the `totalScored` value in `ScoreResult` SHALL equal the count of objective questions only; flash card answers SHALL NOT appear in `totalScored`, `totalCorrect`, `totalIncorrect`, or the percentage calculation.

**Validates: Requirements 8.5, 8.6**

---

### Property 8: Scoring percentage calculation is correct

*For any* combination of correct and total scored objective questions where `totalScored > 0`, the `percentage` in `ScoreResult` SHALL equal `Math.round((totalCorrect / totalScored) * 100)`.

**Validates: Requirements 8.6**

---

### Property 9: Pass/fail threshold is applied consistently

*For any* score result where `percentage >= passingScore`, `passed` SHALL be `true`; *for any* score result where `percentage < passingScore`, `passed` SHALL be `false`.

**Validates: Requirements 8.8, 8.9**

---

### Property 10: Select-all-that-apply scoring requires exact match

*For any* select-all-that-apply question, the scorer SHALL award exactly one point when the learner's selected set exactly equals the correct set, and zero points for any other selection (superset, subset, or disjoint set).

**Validates: Requirements 8.4**

---

### Property 11: Category breakdown totals are consistent

*For any* score result, the sum of all per-category `correct + incorrect + unanswered` counts SHALL equal `totalScored`; no objective question SHALL be counted in more than one category breakdown row.

**Validates: Requirements 9.3**

---

### Property 12: Interleaved selection maintains proportional draw

*For any* eligible pool with questions from two or more categories and any requested count ≤ pool size, the round-robin interleaved selection SHALL draw from each category before exhausting any category, proportional to each category's share of the pool, until the requested count is reached.

**Validates: Requirements 4.7**

---

### Property 13: Eligible pool count respects the session config count cap

*For any* eligible pool of size N and a requested count K, `selectQuestions` SHALL return exactly `min(K, N)` questions.

**Validates: Requirements 3.4, 3.5, 4.6**

---

## Error Handling

### Ingestion Pipeline Errors (Build Time)

| Condition | Behavior |
|---|---|
| Duplicate `Question_ID` | Collect all duplicates, emit all as build errors, exit non-zero (Req 1.4) |
| Missing required field | Emit build error with row number and field name (Req 1.5) |
| Invalid objective choices | Emit build error with row number and specific failure (Req 1.6) |
| Zero included records | Emit build error "output contains no questions" (Req 1.8) |
| Out-of-scope category or form | Exclude + emit warning with Question_ID and reason (Req 2.3, 2.6) |
| Multiple errors across records | Collect all, report all before exit (Req 1.12) |

### Runtime Errors (Browser)

| Condition | Behavior |
|---|---|
| Data file fails to load | Human-readable error page with retry and home controls (Req 14.1) |
| Schema validation fails | Human-readable message listing each failed record; home control (Req 14.2) |
| No questions match filters | Informative message; allow filter modification; start blocked (Req 14.3) |
| Requested count > pool | Cap at available, notify learner before session starts (Req 14.4) |
| Reset/End with answers | Confirmation prompt; cancel restores state unchanged (Req 14.5) |
| Submit with unanswered | Confirmation dialog stating count; cancel returns to test unchanged (Req 14.6, 7.5) |
| Stale session references deleted question | Discard session, show dismissible notice, return to config (Req 10.2) |
| Unknown question type | Render `UnknownTypeRenderer`; display notice; do not crash (Req 12.6) |
| Render error | `ErrorBoundary` catches; shows friendly message without raw stack trace |

All error messages use plain language. Stack traces are logged to `console.error` for developer diagnostics but never shown to users.

### Answer Loss Prevention

- Navigating between questions in `TestSession` uses the `SessionStore` dispatcher — answers are committed immediately, not on navigation.
- `beforeunload` is NOT used (stateless hosting intent). `sessionStorage` is the persistence mechanism for refresh recovery (Req 10.1).
- Any destructive navigation (reset, end session) requires confirmation (Req 14.5).

---

## Testing Strategy

### Dual Approach

Unit and property tests validate individual modules in isolation. Component tests verify rendering behavior. End-to-end tests verify full user journeys.

### Unit Tests (Vitest)

Focus areas:
- `filter.ts` — all filter combinations, empty pool, exact match
- `selector.ts` — count caps, no duplicates, seeded reproducibility
- `shuffler.ts` — choices present, correct answer preserved, no mutation
- `scorer.ts` — all question types, boundary scores, zero-question case
- `prng.ts` — seed produces same sequence, sequences differ across seeds
- `ingest.ts` — validation rules, rejection cases, summary output

### Property-Based Tests (Vitest + fast-check)

Each property from the Correctness Properties section maps to one property test using `fc.property` from `fast-check`, configured with at least 100 runs (`numRuns: 100`).

Each test is tagged with a comment:

```typescript
// Feature: ata-legacy-study-app, Property 4: Shuffled choices preserve correct-answer mapping
```

Generators needed:
- `fc.record(...)` for `Question` arbitraries (use a subset of realistic values)
- `fc.array(...)` for question pools
- `fc.record(...)` for `SessionConfig` arbitraries
- `fc.integer(...)` for seed values
- `fc.dictionary(...)` for answer maps

### Component Tests (React Testing Library + Vitest)

Focus areas:
- Mode selection and Quick Start on Home screen
- Session configuration form (filter cascades, count picker, seed validation)
- All five question type renderers (render, interaction, disabled state)
- `FlashCardRenderer` — Reveal gate before `Got it`/`Needs review`
- `FeedbackPanel` — visible only in review mode
- Test submission confirmation dialog
- Review Summary — counts, missed list, "review missed" button enable/disable
- Test Results — breakdown tables, seed display, action buttons
- Reset session confirmation flow
- Error states: no-data, schema-failure, no-eligible-questions

### End-to-End Tests (Playwright)

Focus areas:
- Complete Review Mode session: configure → answer → feedback → summary
- Complete Test Mode session: configure → answer → submit → results
- Verify Test Mode shows no feedback during the session
- Verify scoring accuracy and pass/fail threshold
- Mobile viewport: 375×667 — all controls operable
- Keyboard-only navigation: Tab through full Review Mode session
- Production build: `playwright` runs against `vite preview` output
- Accessibility smoke: `@axe-core/playwright` on each page

### Ingestion Pipeline Tests (Vitest, Node environment)

- Valid spreadsheet produces correct JSON
- Each rejection rule triggers the correct error
- All-errors-collected mode (multiple bad records)
- Summary counts are accurate
- Out-of-scope records excluded and logged

### CI Workflow (GitHub Actions)

```yaml
# Runs on every push and pull request
steps:
  - Lint (ESLint)
  - Type check (tsc --noEmit)
  - Unit + property tests (vitest run)
  - Component tests (vitest run)
  - Ingestion validation (tsx scripts/ingest.ts -- --dry-run)
  - Production build (vite build)
  - E2E tests (playwright test)
```

Exit code is non-zero on any failure (Req 13.5).

### Accessibility Testing

- `eslint-plugin-jsx-a11y` — static checks in CI
- `@axe-core/playwright` — automated WCAG checks on each routed page
- Manual keyboard navigation check on each PR (documented in CONTRIBUTING.md)
- `prefers-reduced-motion` tested via Playwright `emulateMedia`

### Performance

- `vite build` bundle analysis via `rollup-plugin-visualizer` (dev dependency, not in production)
- `questions.json` is the largest asset; expected ~150 KB uncompressed, ~30 KB gzipped
- No runtime API calls; all data is bundled
- Lazy-load `ReviewSummary` and `TestResults` pages via React `lazy()` + `Suspense`

---

## Directory Structure

```
atalegacy-studyapp/
├── assets/
│   └── questionbank/
│       └── ATA_Legacy_Master_Question_Bank.xlsx  (never bundled)
├── scripts/
│   └── ingest.ts          Build-time ingestion pipeline
├── src/
│   ├── data/
│   │   └── questions.json  Generated by ingest.ts
│   ├── lib/
│   │   ├── schema.ts
│   │   ├── filter.ts
│   │   ├── selector.ts
│   │   ├── shuffler.ts
│   │   ├── scorer.ts
│   │   └── prng.ts
│   ├── store/
│   │   └── SessionStore.tsx
│   ├── components/
│   │   ├── renderers/
│   │   │   ├── MultipleChoiceRenderer.tsx
│   │   │   ├── SelectAllRenderer.tsx
│   │   │   ├── FlashCardRenderer.tsx
│   │   │   ├── MatchingRenderer.tsx
│   │   │   └── UnknownTypeRenderer.tsx
│   │   ├── shared/
│   │   │   ├── QuestionCard.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   ├── NavigationControls.tsx
│   │   │   ├── FeedbackPanel.tsx
│   │   │   ├── SourceDetail.tsx
│   │   │   ├── ConfirmationDialog.tsx
│   │   │   ├── LiveRegion.tsx
│   │   │   ├── SkipNavLink.tsx
│   │   │   └── ErrorBoundary.tsx
│   │   ├── review/
│   │   │   └── MissedQuestionList.tsx
│   │   └── test/
│   │       └── AnswerReviewList.tsx
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── Configure.tsx
│   │   ├── ReviewSession.tsx
│   │   ├── ReviewSummary.tsx
│   │   ├── TestSession.tsx
│   │   └── TestResults.tsx
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── tests/
│   ├── unit/
│   ├── property/
│   ├── components/
│   └── e2e/
├── public/
│   └── favicon.ico
├── docs/
│   ├── MAINTAINER.md      Question bank update and deploy instructions
│   └── DEVELOPER.md       Local dev, test, build, CI setup
├── .github/
│   └── workflows/
│       └── ci.yml
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── eslint.config.js
├── playwright.config.ts
└── package.json
```

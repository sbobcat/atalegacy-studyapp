# ATA Legacy Study Application Build Prompt

You are a senior full-stack web application architect, UX designer, and learning-platform developer. Design and build a modern web application using the attached `ATA_Legacy_Master_Question_Bank.xlsx` as its authoritative content source.

The application will help ATA Legacy instructor candidates learn and test their knowledge through two modes:

1. Review Mode
2. Test Mode

Before implementing anything, review this entire prompt and inspect the question-bank structure. Ask concise, relevant clarification questions about any decision that would materially affect the application. Do not ask questions already answered here.

## Primary objective

Build an attractive, accessible, responsive learning application that:

- Requires no login or user account.
- Requires no database.
- Does not store personal information.
- Does not require a continuously running application server.
- Can be deployed as a static website.
- Uses the supplied question bank as the authoritative source.
- Supports Review and Test modes.
- Provides meaningful end-of-session results.
- Works well on desktop computers, tablets, and mobile phones.
- Can be maintained and expanded without rewriting the application.
- Does not invent ATA facts or supplement the question bank with outside martial-arts knowledge.

## Required clarification questions

Before implementation, ask about the following decisions if they have not been specified:

1. Where will the application be hosted: GitHub Pages, Cloudflare Pages, Netlify, Vercel, or another static host?
2. Should users be able to choose the number of questions in a session, such as 10, 20, 30, 50, or all available questions?
3. Should users be able to filter by category, subcategory, topic, difficulty, and question type?
4. Should Review Mode provide feedback immediately after each response, only at the end, or both?
5. Should Test Mode display explanations only after the test has been submitted?
6. Should unanswered questions be permitted when submitting a test?
7. Should users be able to move backward and change prior answers?
8. Should the application optionally remember an unfinished session in the browser, or should refreshing the page always clear the session?
9. How should direct-recall flash cards be handled in Test Mode: exclude them, convert them into objective questions when appropriate, or allow users to reveal the answer and score themselves?
10. Should matching questions use drag-and-drop, dropdown selection, or a more accessible button-based interface?
11. Is downloadable or printable test output needed?
12. Is an ATA logo or other approved branding available, and are there restrictions on its use?
13. Should the application display source-page and source-record references to learners or reserve them for an optional details view?
14. Should there be a configurable passing score, with 80% as the initial default?
15. Should each generated test use an optional seed so the same test can be reproduced?

If the user does not have a preference, recommend sensible defaults and explain them briefly.

## Preferred technology

Prioritize widely understood, actively maintained web technologies.

Use this default stack unless the deployment target or another requirement provides a strong reason to change it:

- React
- TypeScript
- Vite
- Modern semantic HTML
- Modern CSS
- Tailwind CSS or a similarly maintainable styling approach
- Vitest for unit testing
- React Testing Library for component testing
- Playwright for essential end-to-end testing
- ESLint and Prettier
- Zod or a comparable runtime schema-validation library

Prefer a simple static single-page application over a framework requiring server-side rendering.

Do not add a backend, database, authentication provider, API server, container platform, or cloud function unless a confirmed requirement makes one necessary.

The completed application should build into static HTML, CSS, JavaScript, and data assets that can be hosted on common static-hosting platforms.

## Stateless architecture

The application must be stateless from the hosting perspective:

- No user accounts.
- No login.
- No server-side sessions.
- No database.
- No server-side storage of scores, answers, or activity.
- No collection of names, email addresses, or other personal information.
- Session state should normally exist only in browser memory.
- If optional browser persistence is approved, use `sessionStorage` or `localStorage` only for the current user's unfinished session and preferences.
- Provide a clear reset control that removes any browser-stored application state.
- Do not imply that progress will synchronize between devices.

A browser refresh may reset the application unless local session recovery is explicitly approved.

## Question-bank ingestion

Treat `ATA_Legacy_Master_Question_Bank.xlsx` as the authoritative content source.

The spreadsheet contains these fields:

- `Question_ID`
- `Category`
- `Subcategory`
- `Topic`
- `Question_Type`
- `Difficulty`
- `Question`
- `Choice_A`
- `Choice_B`
- `Choice_C`
- `Choice_D`
- `Correct_Answer`
- `Explanation`
- `Source_Page`
- `Source_Record`
- `Validation_Status`
- `Active`
- `Notes`

Do not manually copy the 300 questions into React components.

Create a documented build-time ingestion process that:

1. Reads the spreadsheet.
2. Validates all required fields.
3. Converts approved records into a typed JSON data file.
4. Rejects duplicate `Question_ID` values.
5. Rejects records without a question, answer, explanation, or source reference.
6. Rejects objective questions with invalid or incomplete choices.
7. Includes only records where `Active` is `Yes`.
8. Includes only records with an approved validation status.
9. Preserves the stable question IDs.
10. Produces a clear build error when the data is invalid.
11. Generates useful summary information, including question counts by category, type, and difficulty.

Keep the spreadsheet outside the public runtime bundle if only the generated JSON is needed. Document how a future spreadsheet revision is converted and validated.

Do not generate content directly from the source PDFs at runtime. The master question bank is the application's question source.

## Content scope

The initial question bank contains 300 questions:

- Kicks: 50
- Belt Meanings: 30
- Forms: 100
- Teaching Quadrants: 80
- Workbook Content: 40

The Forms category is intentionally limited to:

- The nine color-belt forms
- Shim Jun
- Jung Yul
- Chung San Poom-Sae

Do not add Sok Bong or any Fourth Degree or higher form.

Unsupported workbook topics and the open-ended personal-purpose question must not be silently introduced into scored sessions.

Preserve ATA terminology, capitalization, form names, KIHAP terminology, and source wording as recorded in the question bank.

## Application entry screen

The opening screen should immediately explain the two modes and allow the learner to begin without creating an account.

Provide two clear choices:

### Review Mode

For guided learning, answer practice, explanations, and identifying topics requiring more study.

### Test Mode

For a scored assessment without answer feedback until the test is submitted.

The entry workflow should allow the learner to configure the session using the approved options, which may include:

- Mode
- Categories
- Subcategories or topics
- Difficulty
- Question types
- Number of questions
- Passing score
- Randomized or ordered presentation

Show how many eligible questions match the selected settings before the session begins. Prevent the user from requesting more questions than are available.

Provide a sensible Quick Start configuration so someone can begin without understanding every filter.

## Review Mode behavior

Review Mode should support active learning rather than merely displaying answers.

Recommended behavior:

1. Present one question at a time.
2. Let the learner choose or enter an answer when the format permits.
3. Allow direct-recall cards to use a Reveal answer interaction.
4. After answering or revealing, show whether the response was correct, the correct answer, the source-based explanation, and optionally the source page and source record.
5. For flash cards, let the learner mark Got it or Needs review.
6. Allow navigation forward and backward.
7. Show progress through the current session.
8. Preserve answers while the current browser session remains active.

At the end, provide a Review Summary containing:

- Total questions reviewed
- Correct and incorrect objective responses
- Flash cards marked Got it
- Flash cards marked Needs review
- Results by category
- Results by difficulty
- Results by topic when useful
- A list of missed or uncertain questions
- The correct answer and explanation for each missed question
- Suggested categories or topics to review next
- A button to review only missed or uncertain questions
- A button to start a new session

Do not call the Review Mode result a formal score if the session includes self-assessed flash cards. Distinguish objectively correct answers from self-assessed recall.

## Test Mode behavior

Test Mode should behave like a clean, credible assessment.

Recommended behavior:

1. Select questions from the eligible pool without duplicates.
2. Randomize question order.
3. Randomize choices for objective questions while preserving the correct-answer mapping.
4. Do not display correctness or explanations while the test is underway.
5. Show question number and overall progress.
6. Allow backward and forward navigation if approved.
7. Clearly identify unanswered questions.
8. Require confirmation before final submission.
9. Prevent accidental answer loss during normal in-app navigation.
10. Score only objectively scorable question formats unless a self-scoring method is explicitly approved.

At submission, calculate and display:

- Number correct
- Number incorrect
- Number unanswered
- Percentage score
- Pass or needs-more-review result
- Passing score used
- Results by category
- Results by difficulty
- Results by question type
- Time used, if timing is enabled

The post-test answer review must show each question with:

- The learner's answer
- The correct answer
- Correct or incorrect status
- The explanation from the question bank
- Category, topic, and difficulty
- Optional source page and source record

Provide controls to retake the same test if reproducible tests are enabled, create a new randomized test, review only missed questions, and return to the home screen.

## Question-type support

Support all question formats present in the bank:

- Direct-recall flash card
- Four-choice multiple choice
- Reverse recognition
- Select-all-that-apply
- Matching or classification
- Scenario or application

Do not force every format into a conventional radio-button question when another interaction is more appropriate.

Accessibility takes priority over novelty. Drag-and-drop must not be the only way to answer a matching question. Provide a keyboard-accessible alternative such as dropdowns, button groups, or selectable lists.

## Scoring rules

Define scoring in one centralized, independently tested module.

Recommended defaults:

- One point per objectively scored question.
- No negative scoring.
- Select-all questions are correct only when the complete correct set is chosen and no incorrect choice is selected.
- Unanswered questions receive zero points.
- Self-assessed flash cards do not contribute to the formal Test Mode percentage unless the user explicitly approves that behavior.
- Round displayed percentages consistently.
- Use 80% as the default passing threshold unless configured otherwise.

Do not spread scoring logic across presentation components.

## Randomization requirements

Use an unbiased selection method.

The selection system must:

- Never include the same question twice in one session.
- Respect all selected filters.
- Respect the requested number of questions.
- Maintain correct-answer mappings after shuffling choices.
- Avoid mutating the authoritative question objects.
- Support an optional deterministic seed if reproducible tests are approved.
- Fail gracefully when filters produce too few eligible questions.

Add automated tests specifically for question selection, choice shuffling, answer preservation, and scoring.

## Learning-design guidance

Use established learning principles where practical:

- Retrieval practice
- Immediate explanatory feedback in Review Mode
- Delayed feedback in Test Mode
- Interleaving across selected categories
- Clear correction of misconceptions
- Focused review of missed questions
- Progressive disclosure of explanations
- Manageable session lengths
- Visible progress without unnecessary gamification

Avoid artificial streak pressure, public leaderboards, excessive animation, distracting sound effects, manipulative engagement patterns, unnecessary rewards unrelated to learning, and claims that the application certifies ATA competence.

The application is a study aid, not an official certification or testing system unless separately authorized.

## User-interface expectations

Create a modern, calm, professional interface appropriate for adult and teen learners.

The design should include:

- Clear visual hierarchy
- Large readable question text
- Comfortable spacing
- Obvious selected-answer states
- Strong but restrained feedback colors
- Responsive layouts
- Mobile-friendly answer controls
- A persistent but unobtrusive progress indicator
- A clear distinction between Review and Test modes
- A confirmation step before destructive actions such as ending or resetting a session

Do not depend on color alone to communicate correct, incorrect, selected, passed, or failed states.

If approved ATA brand assets are not supplied, use a neutral visual system rather than imitating or inventing official ATA branding.

## Accessibility

Target WCAG 2.2 AA.

At minimum:

- Use semantic landmarks and headings.
- Make the entire application keyboard accessible.
- Provide visible focus indicators.
- Use properly associated labels.
- Announce answer feedback appropriately to assistive technology.
- Maintain sufficient color contrast.
- Support browser zoom and text resizing.
- Avoid motion that cannot be disabled.
- Respect `prefers-reduced-motion`.
- Ensure touch targets are appropriately sized.
- Do not rely exclusively on drag-and-drop.
- Test with automated accessibility tools and perform basic keyboard checks.

## Privacy and analytics

Default to no analytics.

If analytics are later requested:

- Do not collect question answers or study performance without explicit approval.
- Do not collect personal information.
- Prefer privacy-preserving, cookieless analytics.
- Document exactly what is collected.
- Do not add advertising or third-party tracking.

## Reliability and error handling

Handle the following conditions clearly:

- Question data cannot be loaded.
- The data schema is invalid.
- No questions match the selected filters.
- Fewer questions are available than requested.
- An answer record becomes inconsistent.
- A restored browser session references a question no longer in the bank.
- The user attempts to leave an unfinished session.
- A test is submitted with unanswered questions.

Show useful human-readable messages rather than raw technical errors.

## Testing requirements

Include unit tests for question filtering, random selection without duplication, seeded selection if enabled, choice shuffling, correct-answer preservation, scoring, category and difficulty summaries, and spreadsheet-to-JSON validation.

Include component tests for mode selection, session configuration, answer selection, flash-card reveal, review feedback, test submission, results display, missed-question review, and reset behavior.

Include end-to-end tests that complete both modes, verify that Test Mode hides feedback until submission, verify scoring and results, check mobile-sized layouts, verify keyboard-only navigation, and verify the production build.

## Performance

Keep the application lightweight.

- Load only the data and code needed.
- Avoid heavy UI frameworks unless justified.
- Optimize the question-bank JSON if necessary.
- Do not load the original spreadsheet in the browser.
- Use code splitting only where it meaningfully improves the application.
- Ensure the application remains fast on ordinary mobile devices.
- Avoid runtime dependencies on external APIs.

## Deployment

The project should produce a static production build that can be hosted on GitHub Pages, Cloudflare Pages, Netlify, Vercel, or an ordinary static web server.

Include:

- A clear README
- Local-development instructions
- Production-build instructions
- Automated-test instructions
- Question-bank update instructions
- Deployment instructions for the selected host
- Environment-variable documentation, even if none are required
- Base-path configuration for subdirectory hosting
- A suitable favicon and metadata
- A simple 404 or fallback strategy appropriate for the selected routing approach

Prefer a deployment that requires no paid infrastructure.

Use a continuous-integration workflow to run linting, type checking, tests, data validation, and the production build on each change.

## Maintainability

Organize the project so that:

- Question data is separate from UI code.
- Scoring is separate from components.
- Session-selection logic is separately testable.
- Question-format components share a consistent interface.
- Review and Test modes reuse common components without mixing their feedback rules.
- Adding future questions requires updating the source workbook and rerunning the documented conversion process.
- Adding a new question format requires a clearly defined renderer and scorer.
- Important architectural decisions are documented.

Do not overengineer the application. Prefer a small number of well-defined modules over unnecessary abstraction layers.

## Expected implementation deliverables

After the clarification questions are answered, provide:

1. A concise architecture proposal.
2. A description of the question-data conversion and validation process.
3. A page and component map.
4. A state model for home, configuration, active session, and results.
5. Explicit scoring and randomization rules.
6. A proposed directory structure.
7. A test strategy.
8. A deployment recommendation.
9. A list of assumptions.
10. A phased implementation plan.
11. The complete application.
12. Documentation for updating the question bank and deploying the site.

Before writing the complete application, present items 1-10 for approval.

## Definition of done

The application is complete when:

- It runs without login, backend, or database.
- It can be deployed as a static site.
- Review and Test modes both work correctly.
- All supported question formats render accessibly.
- Test scoring is accurate.
- Review summaries clearly explain correct and incorrect responses.
- Test results include complete answer review and explanations.
- The application uses only active, validated question-bank records.
- The approved 12-form scope is enforced.
- Fourth Degree and higher forms do not appear.
- Unsupported workbook content does not appear.
- Refresh and reset behavior match the approved stateless design.
- The production build passes.
- Automated tests pass.
- Keyboard navigation and responsive layouts have been verified.
- The README explains development, content updates, testing, building, and deployment.

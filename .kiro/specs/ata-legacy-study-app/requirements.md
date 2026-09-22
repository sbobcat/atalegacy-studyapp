# Requirements Document

## Introduction

The ATA Legacy Study Application is a fully static, browser-based learning tool that helps ATA Legacy instructor candidates study and self-assess their knowledge. The application provides two distinct modes: Review Mode for guided learning with immediate feedback, and Test Mode for scored assessments with delayed feedback. It is deployed as a static website with no backend, no database, no user accounts, and no collection of personal information. All content is derived from the `ATA_Legacy_Master_Question_Bank.xlsx` spreadsheet, which is converted to validated typed JSON at build time. The application targets WCAG 2.2 AA accessibility, works on desktop, tablet, and mobile, and can be hosted on GitHub Pages or any equivalent static hosting service.

---

## Glossary

- **Application**: The ATA Legacy Study Application, a static single-page web application.
- **Question_Bank**: The authoritative content source — `ATA_Legacy_Master_Question_Bank.xlsx` — which is converted to a typed JSON data file at build time.
- **Ingestion_Pipeline**: The build-time process that reads the Question_Bank spreadsheet, validates records, and outputs a typed JSON data file.
- **Question**: A single record from the Question_Bank with fields: Question_ID, Category, Subcategory, Topic, Question_Type, Difficulty, Question, Choice_A–D, Correct_Answer, Explanation, Source_Page, Source_Record, Validation_Status, Active, Notes.
- **Active_Question**: A Question record where Active equals "Yes" and Validation_Status is an approved value.
- **Flash_Card**: A Question with Question_Type of "Direct-recall flash card"; answered via a Reveal interaction rather than objective choice selection.
- **Objective_Question**: Any Question with Question_Type other than "Direct-recall flash card" that has a deterministic correct answer.
- **Session**: A single in-progress instance of either Review Mode or Test Mode, held in browser memory or sessionStorage.
- **Review_Mode**: The guided-learning session type that provides immediate feedback after each response.
- **Test_Mode**: The scored-assessment session type that withholds feedback until submission.
- **Session_Config**: The set of user-selected parameters that define a Session, including mode, filters, question count, passing score, and seed.
- **Filter**: A Session_Config attribute limiting eligible questions — Category, Subcategory, Topic, Difficulty, or Question_Type.
- **Eligible_Pool**: The set of Active_Questions that match all selected Filters.
- **Passing_Score**: The minimum percentage required to display a "Pass" result in Test Mode; default is 80%.
- **Seed**: An optional numeric value that makes question selection and choice shuffling deterministic and reproducible.
- **Scorer**: The centralized scoring module that calculates points for Objective_Questions only.
- **Review_Summary**: The end-of-session results screen shown after a Review Mode session.
- **Test_Results**: The end-of-session results screen shown after a Test Mode session is submitted.
- **WCAG**: Web Content Accessibility Guidelines, version 2.2, conformance level AA.
- **CI**: Continuous integration workflow that runs linting, type checking, tests, data validation, and production build on each change.

---

## Requirements

### Requirement 1: Question Bank Ingestion

**User Story:** As a maintainer, I want the question bank to be automatically converted and validated at build time, so that the application always uses only approved, complete content without any manual data entry.

#### Acceptance Criteria

1. THE Ingestion_Pipeline SHALL read `ATA_Legacy_Master_Question_Bank.xlsx` and produce a typed JSON data file as a build artifact.
2. WHEN the Ingestion_Pipeline processes a record, THE Ingestion_Pipeline SHALL include only records where the `Active` field equals "Yes" (case-insensitive).
3. WHEN the Ingestion_Pipeline processes a record, THE Ingestion_Pipeline SHALL include only records where the `Validation_Status` field equals one of the following approved values: "Approved" or "Validated" (case-insensitive); any other value SHALL cause the record to be excluded.
4. WHEN the Ingestion_Pipeline encounters a duplicate `Question_ID` value, THE Ingestion_Pipeline SHALL reject all records sharing that ID and produce a build error listing each conflicting ID and the row numbers where they appear.
5. WHEN the Ingestion_Pipeline encounters a record where any of the following fields is absent, empty, or whitespace-only — `Question_ID`, `Question`, `Correct_Answer`, `Explanation`, `Source_Page`, or `Source_Record` — THE Ingestion_Pipeline SHALL reject that record and produce a build error identifying the row number and the missing field name.
6. WHEN the Ingestion_Pipeline processes an Objective_Question and any of `Choice_A`, `Choice_B`, `Choice_C`, or `Choice_D` is absent, empty, or whitespace-only, OR the value of `Correct_Answer` does not match the label of a populated choice, THE Ingestion_Pipeline SHALL reject that record and produce a build error identifying the row number and the specific validation failure.
7. WHEN the Ingestion_Pipeline completes without errors, THE Ingestion_Pipeline SHALL emit a summary to the build log listing the total number of included questions and question counts broken down by Category, Question_Type, and Difficulty.
8. WHEN the Ingestion_Pipeline completes without errors and zero records are included, THE Ingestion_Pipeline SHALL produce a build error stating that the output contains no questions.
9. WHEN the Ingestion_Pipeline is run after a spreadsheet revision, THE Ingestion_Pipeline SHALL produce an updated JSON data file that supersedes the prior version.
10. THE Ingestion_Pipeline SHALL preserve the original `Question_ID` values in the output JSON unchanged.
11. THE Ingestion_Pipeline SHALL exclude the source spreadsheet file from the production runtime bundle served to browsers.
12. WHEN the Ingestion_Pipeline encounters multiple validation errors across different records, THE Ingestion_Pipeline SHALL collect and report all errors before terminating rather than stopping at the first error.

---

### Requirement 2: Content Scope Enforcement

**User Story:** As a content owner, I want the application to strictly limit its content to the approved 300-question scope, so that no out-of-scope material reaches learners.

#### Acceptance Criteria

1. THE Application SHALL include only the following Categories from the Question_Bank: Kicks, Belt Meanings, Forms, Teaching Quadrants, and Workbook Content; the Ingestion_Pipeline SHALL produce a build error if the output would contain questions from any other Category, and the expected total across these five categories is 300 questions (Kicks: 50, Belt Meanings: 30, Forms: 100, Teaching Quadrants: 80, Workbook Content: 40).
2. THE Application SHALL include only the following forms within the Forms Category: the nine color-belt forms (white, orange, yellow, camo, green, purple, blue, brown, red), Shim Jun, Jung Yul, and Chung San Poom-Sae.
3. THE Application SHALL exclude any Question whose Topic references Sok Bong or any Fourth Degree or higher form; the Ingestion_Pipeline SHALL produce a build-time log entry identifying each excluded record by Question_ID.
4. THE Application SHALL preserve ATA-specific terminology, capitalization, form names, KIHAP terminology, and source wording exactly as recorded in the Question_Bank; no normalization, substitution, or supplementation of question text, answer text, or explanation text SHALL occur at build time or runtime.
5. THE Application SHALL NOT generate, infer, or supplement question content from any source other than the Question_Bank.
6. WHEN the Ingestion_Pipeline encounters a record whose Category is not in the approved list, or whose Topic references an out-of-scope form or content area, THE Ingestion_Pipeline SHALL exclude that record and emit a warning to the build log identifying the Question_ID, the field value, and the reason for exclusion.
7. WHEN the Ingestion_Pipeline encounters a record where `Active` is not "Yes" or `Validation_Status` is not an approved value, THE Ingestion_Pipeline SHALL exclude that record and emit a warning to the build log identifying the Question_ID, the field name, and the field value.

---

### Requirement 3: Session Configuration

**User Story:** As a learner, I want to configure my study session before it begins, so that I can focus on the topics and question types most relevant to my preparation.

#### Acceptance Criteria

1. THE Application SHALL present a session configuration screen before beginning any Review_Mode or Test_Mode session.
2. THE Application SHALL allow the learner to select Mode as either Review_Mode or Test_Mode.
3. THE Application SHALL allow the learner to filter the Eligible_Pool by Category, Subcategory, Topic, Difficulty, and Question_Type independently or in any combination.
4. THE Application SHALL allow the learner to select a question count from the options 10, 20, 30, 50, or all eligible questions.
5. WHEN a requested question count exceeds the size of the Eligible_Pool, THE Application SHALL prevent that count from being selected and display the maximum available count.
6. WHEN the learner changes any Filter selection, THE Application SHALL update the displayed Eligible_Pool count within 200 milliseconds.
7. THE Application SHALL allow the learner to set the Passing_Score as a whole-number percentage in the range 1–100, defaulting to 80.
8. THE Application SHALL allow the learner to optionally enter a positive integer Seed in the range 1–2,147,483,647 to enable a reproducible session; if the entered value is outside this range or is not a positive integer, THE Application SHALL display a validation error and prevent session start.
9. THE Application SHALL provide a Quick Start option that begins a Review_Mode session immediately using a default configuration covering all Categories, all Question_Types, 20 questions, and an 80% Passing_Score.
10. WHEN no questions match the selected Filters, THE Application SHALL disable the start button and display a message stating that no eligible questions are available.
11. WHEN the learner changes the Category filter selection, THE Application SHALL update the available Subcategory and Topic filter options to include only values present in questions belonging to the newly selected Categories; any previously selected Subcategory or Topic value that no longer matches the updated options SHALL be automatically deselected.

---

### Requirement 4: Question Randomization and Selection

**User Story:** As a learner, I want questions to be drawn fairly and presented in varied order, so that each session is a genuine test of knowledge rather than a memorized sequence.

#### Acceptance Criteria

1. THE Application SHALL select questions from the Eligible_Pool without repeating the same Question within a single Session.
2. IF the Question is an Objective_Question, THEN THE Application SHALL present its answer choices in a randomized order that differs from their source order, and the choice labeled as correct in the Question_Bank SHALL remain mapped to the same answer content after shuffling so that selecting that content is scored as correct.
3. THE Application SHALL NOT mutate the authoritative Question objects when shuffling choices; all shuffled presentations SHALL be derived from immutable copies.
4. WHEN a Seed is provided, THE Application SHALL use that Seed as input to a deterministic selection and shuffling algorithm so that the same Seed always produces the same question order and choice order given the same Eligible_Pool.
5. IF no Seed is provided, THEN THE Application SHALL select and order questions such that each question in the Eligible_Pool has equal probability of appearing at each draw position.
6. WHEN the Eligible_Pool contains fewer questions than the requested count after all Filters are applied, THE Application SHALL select all available questions and notify the learner of the actual count before the session begins.
7. IF the session includes questions from multiple Categories, THEN THE Application SHALL present questions in a round-robin rotation across those Categories so that no Category exhausts its questions before others have been drawn proportionally; IF one Category is exhausted before others, THEN THE Application SHALL continue drawing from the remaining Categories without interruption.
8. WHEN the learner enters a Seed value that is not a positive integer in the range 1–2,147,483,647, THE Application SHALL display a validation error message and prevent the session from starting.

---

### Requirement 5: Review Mode Behavior

**User Story:** As a learner, I want to study one question at a time with immediate feedback and explanations, so that I can reinforce correct understanding and correct misconceptions as I go.

#### Acceptance Criteria

1. THE Application SHALL present one Question at a time during a Review_Mode session.
2. WHEN the learner submits an answer to an Objective_Question in Review_Mode, THE Application SHALL immediately display whether the response was correct or incorrect.
3. WHEN the Application displays Review_Mode feedback, THE Application SHALL show the correct answer and the explanation from the Question_Bank; source page and source record identifier SHALL be available in a section that is collapsed by default and can be expanded by the learner.
4. WHEN the Question is a Flash_Card in Review_Mode, THE Application SHALL present a Reveal button; pressing Reveal SHALL display the answer text from the Question_Bank.
5. WHEN the Flash_Card answer has been revealed, THE Application SHALL present "Got it" and "Needs review" controls; these controls SHALL NOT be available before Reveal is pressed.
6. THE Application SHALL allow the learner to navigate forward to the next Question and backward to any previously visited Question within the current Session.
7. WHEN the learner navigates backward to a previously answered Objective_Question, THE Application SHALL restore and display the learner's prior answer selection and the feedback that was shown for that answer.
8. WHEN the learner navigates backward to a previously revealed Flash_Card, THE Application SHALL restore the revealed answer and the self-assessment choice ("Got it" or "Needs review") that was recorded.
9. THE Application SHALL display a persistent progress indicator showing the current question number and total questions in the session.
10. WHEN the learner reaches the final Question in a Review_Mode session, THE Application SHALL present a control to end the session and view the Review_Summary.
11. IF the learner has not yet submitted an answer to the current Objective_Question or pressed Reveal on the current Flash_Card, THEN THE Application SHALL NOT allow the learner to navigate forward to the next question.

---

### Requirement 6: Review Summary

**User Story:** As a learner, I want a detailed summary at the end of a Review Mode session, so that I can identify knowledge gaps and decide what to study next.

#### Acceptance Criteria

1. WHEN a Review_Mode session ends, THE Application SHALL display a Review_Summary screen.
2. WHILE the Review_Summary screen is displayed, THE Application SHALL show the total number of Questions reviewed, the number of Objective_Questions answered correctly, the number of Objective_Questions answered incorrectly, the number of Flash_Cards marked "Got it", and the number of Flash_Cards marked "Needs review".
3. WHILE the Review_Summary screen is displayed, THE Application SHALL show, for each Category included in the session: the count of Objective_Questions answered correctly, the count answered incorrectly, the count of Flash_Cards marked "Got it", and the count marked "Needs review"; and the same four counts broken down by Difficulty level.
4. WHILE the Review_Summary screen is displayed, THE Application SHALL show a list of all Questions that were answered incorrectly or marked "Needs review", with each entry including the question text, the correct answer, the explanation from the Question_Bank, and the source page and source record identifier.
5. WHILE the Review_Summary screen is displayed, THE Application SHALL show a list of suggested Categories or Topics for further study, where each suggestion corresponds to a Category or Topic in which at least one Question was answered incorrectly or marked "Needs review".
6. THE Application SHALL NOT label the Review_Summary result as a formal score when the session included any Flash_Cards, and SHALL distinguish objectively scored answers from self-assessed Flash_Card recall using separate labeled sections or counts.
7. IF at least one Question in the session was answered incorrectly or marked "Needs review", THEN THE Application SHALL provide an enabled button to begin a new Review_Mode session using only those Questions; IF no Questions were answered incorrectly or marked "Needs review", THEN that button SHALL be disabled.
8. THE Application SHALL provide a button to return to the session configuration screen to start a new session.

---

### Requirement 7: Test Mode Behavior

**User Story:** As a learner, I want a clean, credible assessment experience that withholds feedback until I submit, so that my performance reflects genuine unassisted knowledge.

#### Acceptance Criteria

1. WHILE a Test_Mode session is in progress, THE Application SHALL NOT display correctness indicators, correct answers, or explanations for any Question.
2. WHEN Test_Mode presents an Objective_Question, THE Application SHALL randomize the displayed order of choices for that Question.
3. WHILE a Test_Mode session is in progress, THE Application SHALL display a progress indicator showing the current question number, total questions, and count of unanswered questions; this indicator SHALL update each time the learner navigates to a different question or submits an answer.
4. WHILE a Test_Mode session is in progress, THE Application SHALL allow the learner to navigate forward and backward and to replace a previously selected answer with a different choice before submission.
5. WHEN the learner activates the submit control, THE Application SHALL display a confirmation dialog stating the number of unanswered questions; submission SHALL proceed only after the learner explicitly confirms in that dialog; IF the learner cancels, THE Application SHALL return to the test with no answers changed.
6. WHEN a Flash_Card is encountered in a Test_Mode session, THE Application SHALL present a Reveal button that shows the answer on demand and, after reveal, "Got it" and "Needs review" self-assessment controls; Flash_Card responses SHALL NOT be included in the formal percentage score calculation.
7. WHILE a Test_Mode session is in progress, THE Application SHALL retain all answer selections in memory so that navigating between questions does not discard any previously recorded answer.

---

### Requirement 8: Test Mode Scoring

**User Story:** As a learner, I want accurate, transparent scoring after I submit a test, so that I can trust the result as a meaningful measure of my readiness.

#### Acceptance Criteria

1. THE Scorer SHALL award one point for each Objective_Question answered with the response that matches the correct answer as defined in the Question_Bank.
2. THE Scorer SHALL award zero points for each Objective_Question that has no answer recorded at submission time.
3. THE Scorer SHALL NOT reduce a question's point value below zero for an incorrect answer.
4. WHEN the Question_Type is "Select-all-that-apply", THE Scorer SHALL award one point only when the learner's selected set exactly matches the complete correct set.
5. THE Scorer SHALL exclude Flash_Cards from both the points-awarded total and the scored-question count used in the percentage calculation.
6. IF the session contains at least one scored Objective_Question, THEN THE Scorer SHALL calculate the percentage score as: (total points awarded ÷ total scored Objective_Questions) × 100, rounded to the nearest whole number.
7. IF the session contains zero scored Objective_Questions, THEN THE Scorer SHALL not produce a percentage score and THE Application SHALL display a notice that no scorable questions were included.
8. IF the calculated percentage score is greater than or equal to the configured Passing_Score, THEN THE Application SHALL display a "Pass" result.
9. IF the calculated percentage score is less than the configured Passing_Score, THEN THE Application SHALL display a "Needs more review" result.
10. THE Scorer SHALL be implemented as a module whose inputs and outputs are exercisable independently of any presentation component through automated unit tests.

---

### Requirement 9: Test Results Display

**User Story:** As a learner, I want a comprehensive results screen after submitting a test, so that I can understand exactly how I performed and review every question in detail.

#### Acceptance Criteria

1. WHEN a Test_Mode session is submitted, THE Application SHALL display a Test_Results screen.
2. THE Application SHALL display the number of Questions answered correctly, the number answered incorrectly, the number left unanswered, the percentage score, the pass/needs-more-review result, and the Passing_Score used.
3. THE Application SHALL display the count of correctly answered, incorrectly answered, and unanswered Objective_Questions broken down by Category; by Difficulty; and by Question_Type.
4. THE Application SHALL provide an answer review section listing every Objective_Question with: the learner's answer, the correct answer, a correct or incorrect indicator, the explanation from the Question_Bank, the Category, the Topic, the Difficulty, and a collapsible section containing the source page and source record identifier; Flash_Cards in the same section SHALL display the revealed answer (if revealed), the learner's self-assessment ("Got it", "Needs review", or "Not revealed"), and the explanation, without a correct or incorrect indicator.
5. WHEN a Seed was used to generate the test, THE Application SHALL display the Seed value in the Test_Results screen so the learner can reproduce the same test.
6. THE Application SHALL provide: a button to retake the same test using the original Seed (enabled only when a Seed was used); a button to start a new randomized test; a button to review only the missed Questions, where "missed" means Objective_Questions answered incorrectly plus Flash_Cards marked "Needs review" (enabled only when at least one such question exists); and a button to return to the home screen.

---

### Requirement 10: Session State and Persistence

**User Story:** As a learner, I want my in-progress session to survive an accidental page refresh, so that I do not lose my work due to a minor browser action.

#### Acceptance Criteria

1. WHEN the learner refreshes the browser tab during an active Session, THE Application SHALL restore the session to the same question index, all previously recorded answer selections, and the accumulated score state that existed before the refresh.
2. WHEN the Application attempts to restore a session and that session references a Question_ID no longer present in the current Question_Bank, THE Application SHALL discard the stale session state, display a dismissible notice informing the learner that the previous session is no longer valid, and return to the configuration screen.
3. THE Application SHALL display a visible "Reset session" control accessible from any screen during an active Session.
4. WHEN the learner activates the "Reset session" control, THE Application SHALL clear all Application state stored for the current session and return to the home screen.
5. THE Application SHALL NOT synchronize session state between devices or browser tabs.
6. WHEN the browser tab is closed, THE Application SHALL NOT retain session state such that it would be restored in a new tab or a new browser window.
7. THE Application SHALL NOT collect, transmit, or persist any personal information about the learner.

---

### Requirement 11: Accessibility

**User Story:** As a learner using assistive technology or keyboard navigation, I want the full application to be usable without a pointing device and to work with screen readers, so that no learner is excluded.

#### Acceptance Criteria

1. THE Application SHALL conform to WCAG 2.2 Level AA.
2. THE Application SHALL be fully operable using keyboard navigation alone; THE Application SHALL provide a skip-navigation link as the first focusable element on each screen, and the tab order SHALL follow the visual reading order of the page without requiring a pointer device for any interaction.
3. THE Application SHALL provide visible focus indicators on all interactive elements; each focus indicator SHALL have a contrast ratio of at least 3:1 against adjacent colors and SHALL be visually distinct with a minimum 2 CSS pixel offset area, as required by WCAG 2.2 SC 2.4.11.
4. WHEN the Application reveals answer feedback in Review_Mode, THE Application SHALL announce the result to screen-reader users via an ARIA live region with `aria-live="polite"`.
5. THE Application SHALL use semantic HTML landmarks and correctly ordered headings throughout.
6. THE Application SHALL associate all form controls with descriptive labels using proper HTML label associations.
7. THE Application SHALL maintain a minimum color contrast ratio of 4.5:1 for normal text and 3:1 for large text as required by WCAG 2.2 AA.
8. THE Application SHALL NOT rely on color alone to convey correct, incorrect, selected, passed, or failed states; each state SHALL also be communicated through text or an icon with an accessible label.
9. THE Application SHALL support browser zoom up to 200% without horizontal scrolling at a viewport width of at least 320 CSS pixels, without text truncation, and with all controls remaining operable.
10. WHEN the matching or classification Question_Type is presented, THE Application SHALL provide a keyboard-accessible dropdown or button-based interface as the primary interaction method; drag-and-drop MAY be offered as an enhancement for pointer users.
11. WHERE a user has set the system preference `prefers-reduced-motion`, THE Application SHALL limit all animation and transition durations to no more than 0.01 seconds.
12. THE Application SHALL ensure all touch targets are at least 24×24 CSS pixels in size.
13. WHEN the Application performs a dynamic content change — including revealing answer feedback, navigating to a new question, or opening a confirmation dialog — THE Application SHALL move keyboard focus to the newly rendered primary content or dialog so that keyboard and screen-reader users are not stranded at a stale position.

---

### Requirement 12: Question Type Rendering

**User Story:** As a learner, I want each question type to be presented in the most appropriate and accessible format, so that the interaction matches the nature of the question.

#### Acceptance Criteria

1. THE Application SHALL render "Four-choice multiple choice" Questions using a radio-button group presenting exactly four choices in an initially unselected state, allowing the learner to select exactly one answer.
2. THE Application SHALL render "Select-all-that-apply" Questions using a checkbox group with a visible label that explicitly states multiple answers may be correct.
3. THE Application SHALL render "Direct-recall flash card" Questions with a Reveal button that shows the answer text on demand; the "Got it" and "Needs review" controls SHALL NOT be interactive until after the Reveal button has been pressed.
4. THE Application SHALL render "Matching/classification" Questions using a dropdown or button-based interface in which each item on the prompt side is paired with a selectable control whose options are drawn from the complete set of answer-side items defined in the question.
5. THE Application SHALL render "Reverse recognition" Questions and "Scenario/application" Questions using a radio-button group presenting exactly four choices in an initially unselected state, allowing the learner to select exactly one answer.
6. WHEN a Question's Question_Type value does not match any implemented renderer, THE Application SHALL display the question text alongside a notice stating that this question type is not yet supported, without throwing an unhandled error or crashing the application.

---

### Requirement 13: Static Deployment

**User Story:** As a maintainer, I want the application to build into static files and deploy without any server-side infrastructure, so that it can be hosted freely and maintained without operational overhead.

#### Acceptance Criteria

1. THE Application SHALL produce a production build consisting solely of static HTML, CSS, JavaScript, and data assets with no server-side component.
2. THE Application SHALL be deployable to GitHub Pages, Cloudflare Pages, Netlify, Vercel, or any standard static web server with no host-specific build configuration required.
3. THE Application SHALL include a base-path configuration option so it can be hosted at a subdirectory path; WHEN the base path is set to a subdirectory, all asset references, internal links, and client-side routing paths SHALL resolve correctly relative to that subdirectory URL.
4. IF the learner navigates directly to a deep-link URL within the application, THEN THE Application SHALL serve the root index document and resolve routing client-side, so that the learner reaches the intended view without receiving an HTTP error.
5. WHEN a CI workflow run is triggered by a code change, THE CI workflow SHALL execute linting, TypeScript type checking, unit tests, component tests, data validation, and the production build in sequence; the workflow run SHALL exit with a non-zero status code if any step fails.
6. THE Application SHALL include a favicon, a descriptive page title that identifies the application by name, and Open Graph metadata including non-empty `og:title`, `og:description`, and `og:url` tags.

---

### Requirement 14: Error Handling and Resilience

**User Story:** As a learner, I want clear, human-readable error messages when something goes wrong, so that I understand what happened and know what to do next.

#### Acceptance Criteria

1. WHEN the Question_Bank JSON data file cannot be loaded, THE Application SHALL display an error message in plain language that does not include raw stack traces or internal error codes, and SHALL provide a control that allows the learner to retry loading or return to the home screen.
2. WHEN the loaded Question_Bank data fails schema validation at runtime, THE Application SHALL display an error message in plain language identifying each failed record by its Question_ID or row position, and SHALL provide a control that allows the learner to return to the home screen.
3. WHEN no Questions match the selected Filters, THE Application SHALL display an informative message and allow the learner to modify the Filters rather than starting an empty session.
4. WHEN the learner requests more questions than the Eligible_Pool contains, THE Application SHALL cap the selection at the available count and notify the learner before the session begins.
5. WHEN the learner activates a "Reset session" or "End session" control during an active Session that has at least one recorded answer, THE Application SHALL display a confirmation prompt; IF the learner cancels, THE Application SHALL return to the session with all answers intact and unchanged.
6. WHEN the learner activates the submit control in Test_Mode and at least one Question is unanswered, THE Application SHALL display a confirmation dialog stating the count of unanswered questions before finalizing the submission; IF the learner cancels, THE Application SHALL return to the test with no answers changed.

---

### Requirement 15: Maintainability and Extensibility

**User Story:** As a maintainer, I want the codebase and data pipeline to be organized so that adding questions, question types, or deploying to a new host is straightforward, so that the application can grow without requiring a rewrite.

#### Acceptance Criteria

1. THE Application SHALL separate question data from UI component code so that updating the Question_Bank requires only rerunning the Ingestion_Pipeline and rebuilding the application.
2. THE Application SHALL implement all scoring logic in the Scorer module, separate from presentation components, so that scoring rules can be tested and modified independently; the Scorer module's public interface SHALL accept question answers and session configuration as inputs and return score results as output, with no dependency on any React component or browser API.
3. THE Application SHALL define a renderer interface for Question_Type components that specifies the required props — at minimum: the Question object, the current answer state, an onChange handler, and a disabled flag — so that implementing a new Question_Type requires creating one component that satisfies that interface without modifying any existing component.
4. THE Application SHALL share Review_Mode and Test_Mode common components for question display and navigation; the feedback behavior difference between modes SHALL be controlled by a prop or context value passed to those shared components rather than by duplicating component logic.
5. THE Application SHALL include a maintainer documentation file describing the steps to update the Question_Bank spreadsheet, run the Ingestion_Pipeline, validate the JSON output, and deploy the updated application to the selected static host.
6. THE Application SHALL include a developer documentation file describing local development setup, test execution commands, production build commands, and CI workflow configuration.

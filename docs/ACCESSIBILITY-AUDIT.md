# Task 17 accessibility audit

Spec: `ata-legacy-study-app`, required tasks 17.1–17.3.

## Changes

- Added shared header/navigation landmarks, retaining the skip link as the first keyboard target and one h1 per route.
- Added a shared blue keyboard focus outline with 2px thickness and 2px offset; existing blue/red/amber rings remain in use.
- Enlarged radio/checkbox controls to 24px and established minimum interactive target sizes.
- Added wrapping and narrower mobile padding; source-detail grid columns can shrink. Matching answers display in a wrapping list with short dropdown labels, preserving original scoring labels.
- Constrained dialogs to the viewport with vertical scrolling.
- Reduced-motion preferences cap animations at 10ms and one iteration, disable transitions, and use immediate scrolling. Zero-duration transitions avoid introducing a focus transition on otherwise unanimated controls.
- Gave the progress element an accessible name.

## Verification

A temporary Playwright script used installed Chrome against the local Vite app. It passed 37 cases covering all six routes with empty state, all five bank question types in Review and Test modes, populated summary/results pages, and dialog setup. Persisted fixtures were checked for successful restoration.

Checks covered 320px viewport width at normal size and with 200% CSS zoom, horizontal overflow, enabled target dimensions, form labels, heading order, landmarks, reduced-motion durations, rendered text contrast, and focus outlines/rings. The lowest measured enabled text contrast was 6.70:1; disabled controls were excluded. Blue focus colors (#1d4ed8 and #1e40af) exceed 3:1 against the adjacent white/light surfaces; red and amber rings likewise use dark shades on light surfaces. Correct/incorrect/pass/fail feedback uses explicit text, and selection uses native checked/selected state.

Keyboard checks verified skip-link activation, initial dialog focus, reverse-tab containment, and Escape dismissal. DOM and source review confirmed reading-order controls without positive tabindex values. Existing matching-renderer tests verify full choice text remains visible and original selection labels are recorded and cleared.

All 32 component tests passed. Lint, TypeScript checking, production build, and git diff whitespace validation passed.

## Limits

Zoom was simulated using CSS zoom in Chromium, not the browser toolbar zoom control. These scoped checks are not a full WCAG certification or an assistive-technology audit. Optional task 17.4 (permanent axe/Playwright accessibility tests) remains deferred. Existing Vite/plugin deprecation warnings are unchanged.

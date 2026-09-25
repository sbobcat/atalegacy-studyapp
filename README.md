# ATA Legacy Study App

[![CI](https://github.com/sbobcat/atalegacy-studyapp/actions/workflows/ci.yml/badge.svg)](https://github.com/sbobcat/atalegacy-studyapp/actions/workflows/ci.yml)

ATA Legacy is a focused study app for ATA students and instructors working with approved legacy curriculum material. It provides a repeatable way to review questions, take a scored test, and inspect explanations without requiring a backend.

**[Try the live demo](https://sbobcat.github.io/atalegacy-studyapp/)**

## What it includes

- **Review mode**: work through a selected question set with immediate answer feedback, explanations, and source details.
- **Test mode**: answer without feedback, submit the session, and review the score and breakdown afterward.
- **Question types**: four-choice multiple choice, select-all-that-apply, matching/classification, reverse recognition, scenario/application, and direct-recall flash cards.
- **Accessible interaction**: keyboard navigation, semantic controls, focus management, live announcements, visible focus indicators, and responsive layouts.
- **Deterministic practice**: optional seeded selection makes a session reproducible.

## Architecture

```text
XLSX question bank
	|
	v
scripts/ingest.ts -- validate, filter, and summarize
	|
	v
src/data/questions.json -- generated Question[]
	|
	v
Vite bundle -- React static site
	|
	v
GitHub Pages
```

The workbook is read at build time only. It is not imported by the browser bundle; the app loads the generated JSON at runtime.

## Technology

React 18, TypeScript, Tailwind CSS, Vite, Vitest, fast-check, Playwright, Zod, and SheetJS.

## Quick start

Requires Node.js 20 or newer.

```sh
git clone https://github.com/sbobcat/atalegacy-studyapp.git
cd atalegacy-studyapp
npm ci
npm run ingest
npm run dev
```

Open the local URL printed by Vite. To run the production build locally:

```sh
npm run build
npm run preview
```

Useful checks:

```sh
npm run lint
npm run typecheck
npm run test
npm run test:e2e
```

See [docs/DEVELOPER.md](docs/DEVELOPER.md) for the complete local workflow and [docs/MAINTAINER.md](docs/MAINTAINER.md) for ingestion and deployment details.

## Deployment

Pushes to `main` run the CI workflow. A successful workflow builds the static site and deploys it to GitHub Pages. Hash-based routes allow the app to work on static hosting without server-side rewrites. Set `VITE_BASE_PATH=/` for root hosting; the GitHub Pages deployment uses `/atalegacy-studyapp/`.

## Publication readiness

The software source is licensed under Apache License 2.0. The question bank workbook and generated `src/data/questions.json` contain curriculum-derived content and may have separate copyright or redistribution restrictions. Public release of those files is **blocked until the content owner confirms written permission and the repository license covers the content**. See [CONTRIBUTING.md](CONTRIBUTING.md) for the contributor-supplied-bank workflow and [LICENSE](LICENSE) for the software license.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. Use the issue templates for reproducible bug reports and scoped feature proposals.

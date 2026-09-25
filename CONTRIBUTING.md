# Contributing

Thanks for helping improve ATA Legacy. Contributions should keep the app focused on approved ATA Legacy study content and accessible practice workflows.

## Development setup

Requires Node.js 20 or newer.

```sh
npm ci
npm run ingest
npm run dev
```

The ingestion command reads the reviewed workbook and writes `src/data/questions.json`. See [docs/DEVELOPER.md](docs/DEVELOPER.md) for the full build workflow and [docs/MAINTAINER.md](docs/MAINTAINER.md) for deployment details.

## Checks

Run the checks relevant to your change before opening a pull request:

```sh
npm run lint
npm run typecheck
npm run test
npm run test:e2e
```

Use `npm run ingest -- --dry-run` to validate question-bank input without rewriting the generated JSON. ESLint is the source of truth for code style; keep changes formatted consistently with the surrounding TypeScript and React code.

## Pull requests

- Create a branch from `main` using a short descriptive name such as `fix/keyboard-focus` or `feat/review-summary`.
- Use imperative, concise commit messages, for example `Fix test mode navigation`.
- Explain the user-visible behavior and include focused test evidence in the pull request.
- Keep CI green: lint, type checking, unit/property/component tests, ingestion validation, production build, and Playwright must pass.
- Call out accessibility impact, including keyboard, focus, semantic HTML, and responsive behavior.
- Do not commit secrets, local environment files, build output, or unrelated formatting changes.

Use the pull request checklist in `.github/PULL_REQUEST_TEMPLATE.md`.

## Question-bank changes

Question-bank changes require review of the source workbook and the generated JSON together. Run the ingestion pipeline, inspect all warnings and errors, and use the QA checklist in `assets/questionbank/Question_Bank_QA_Checklist.xlsx`.

Only approved ATA Legacy scope is accepted: Kicks, Belt Meanings, Forms, Teaching Quadrants, and Workbook Content. Do not add Sok Bong or Fourth Degree-and-higher forms. Preserve ATA-specific terminology and source identifiers exactly.

The workbook and generated questions may contain copyrighted or otherwise restricted curriculum content. Do not submit new content unless you have permission to redistribute it. Until publication rights are confirmed, contributors should use a separately supplied local workbook and must not add proprietary source material to a public branch. The ingestion workflow currently expects `assets/questionbank/ATA_Legacy_Master_Question_Bank.xlsx`; coordinate with a maintainer before changing that workflow.

## Issues

Use the bug-report template for a reproducible defect and include the browser, operating system, route, and evidence requested there. Use the feature-request template for a focused problem and proposed solution. Please search existing issues first and keep proposals within the ATA Legacy study-app scope.

## Publication audit

Before this repository is made public, a maintainer must complete these checks:

- `.gitignore` excludes build output and local environment files, but the tracked workbook is intentionally still available to CI. Do not publish while its redistribution rights are unresolved. If the workbook cannot be cleared, remove it and the generated curriculum data, then change CI to use a contributor-supplied private bank or a cleared fixture.
- `src/data/questions.json` is generated curriculum content and needs the same copyright review as the workbook; Apache License 2.0 covers the software source, not automatically the question bank.
- A tracked-text scan found no API keys, passwords, tokens, private keys, or credentials.
- The README badge targets the repository's `ci.yml` Actions workflow and should be checked again after the repository visibility or owner changes.

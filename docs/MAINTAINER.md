# Maintainer Guide

## Update the question bank

1. Replace `assets/questionbank/ATA_Legacy_Master_Question_Bank.xlsx` with the reviewed workbook.
2. Run the ingestion pipeline:

```sh
npm ci
npm run ingest
```

The pipeline applies the active, validation, duplicate, required-field, objective-choice, and content-scope checks. It writes the approved records to `src/data/questions.json` and prints totals by category, question type, and difficulty.

To validate without replacing the generated JSON:

```sh
npm run ingest -- --dry-run
```

Review warnings and errors. A non-zero exit means the data must be corrected before release. The generated JSON should contain the expected question count and preserve each source `Question_ID`.

## Deploy

### Application version and update date

The footer on every screen displays the major and minor parts of `package.json`'s version (for example, `0.1.0` appears as `Version 0.1`). Before a release that needs a new visible version, run `npm version minor --no-git-tag-version` (or `major`) and include both `package.json` and `package-lock.json` in the release changes. Patch bumps do not change the visible version.

Vite captures the UTC build date automatically as `Last updated: YYYY-MM-DD`. It stays fixed for that bundle, including after page refreshes; it is the build date, not the exact deployment time. During local development it reflects the date the Vite server started. Both Vite config files are kept in sync because the repository also tracks `vite.config.js`.

### Publish

Push the validated changes to `main`. GitHub Actions runs linting, type checking, tests, ingestion validation, the production build, and Playwright tests. A successful `main` workflow publishes `dist/` to GitHub Pages at:

`https://sbobcat.github.io/atalegacy-studyapp/`

The source workbook is versioned for CI ingestion but is never included in the browser bundle. The generated JSON is also versioned so a clean checkout can build without running a write-mode ingestion step.

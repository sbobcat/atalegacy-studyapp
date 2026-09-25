# Developer Guide

## Local setup

Requires Node.js 20 or newer.

```sh
npm ci
npm run ingest
npm run dev
```

The local Vite server uses the GitHub Pages base path by default. For root hosting, set `VITE_BASE_PATH=/` before starting Vite.

## Checks and tests

```sh
npm run lint
npm run typecheck
npm run test
npm run test:e2e
```

The Playwright configuration builds the app and runs the tests against `vite preview`. Use `PLAYWRIGHT_BASE_URL` when testing a different host or base path.

## Production build

```sh
npm run ingest -- --dry-run
VITE_BASE_PATH=/atalegacy-studyapp/ npm run build
npm run preview
```

The generated `dist/` directory is a static site. Hash routes keep navigation working on GitHub Pages without server-side rewrites.

## CI workflow

`.github/workflows/ci.yml` runs lint, TypeScript checking, Vitest, question-bank validation, the production build, and Playwright against the preview server in that order. On a successful push to `main`, the deploy job publishes the build artifact with GitHub Pages deployment actions.

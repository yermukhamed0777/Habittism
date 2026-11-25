# Contributing to Hexis

Thanks for helping improve Hexis. This document covers the local setup, the verification suite, and the planning convention that keeps long-term work auditable.

## Ground rules

- Treat every existing file as the user's work. Inspect before deleting or overwriting it.
- Do not commit secrets, tokens, `.env` files, personal data, or generated verification screenshots. The ignore rules in `.gitignore` cover `.env*`, `dist/`, `node_modules/`, `.tmp-shots/`, `shots/`, `synodos/`, and `.workbuddy-ai/`.
- Do not change repository visibility, licence, or deploy targets without an explicit decision recorded in [`plan/decisions.md`](plan/decisions.md).
- Do not claim a task is done unless a command in this document was run and its result recorded in [`plan/progress.md`](plan/progress.md).

## Local setup

1. Use Node.js 22.12 or newer (verified locally with Node 24.18.1; `vite` and `oxlint` require `^20.19.0 || >=22.12.0` in `package-lock.json`).
2. Run `npm ci`. On Windows PowerShell, invoke npm as `npm.cmd` if script execution policy blocks `npm.ps1`.
3. Copy `.env.example` to `.env.local` and fill in Supabase values. Never commit the result.
4. Run `npm run dev` and open `http://localhost:5173/`.

Supabase schema and auth setup are documented in [`README.md`](README.md#run-locally).

## Verification suite

Run all four checks before proposing a change:

```sh
npm ci
npm run lint -- --deny-warnings
npm run build
npm run test:rls
npx playwright install chromium   # once per machine
npm run test:e2e
npm run test:pwa                  # requires npm run build first
```

What the checks cover:

- `lint` — oxlint with `--deny-warnings`. `.oxlintrc.json` ignores the untracked local research trees `synodos/` and `.workbuddy-ai/` so the local result matches CI.
- `build` — TypeScript project build plus Vite production bundle into `dist/`.
- `test:rls` — in-memory PGlite verification of owner isolation, constraints, and the three SQL import RPCs against `supabase/schema.sql` and every migration in filename order.
- `test:e2e` — Playwright flows against a Vite dev server with mocked Supabase HTTP fixtures (no live account or credentials needed).
- `test:pwa` — Playwright against the production `dist/` via `vite preview`, including Vercel CSP headers, manifest/icon checks, and one offline guest navigation.

`CI` (`.github/workflows/ci.yml`) runs the same commands on Node 22 for pushes and pull requests to `main`. The separate GitHub Pages workflow (`.github/workflows/deploy.yml`) builds with `HEXIS_BASE_PATH=/Hexis/` and Supabase values from repository variables; it is not gated on the CI job passing.

## Planning convention

The long-term plan lives in [`plan/`](plan/README.md). After every work session, in the **same commit** as the work:

1. Tick, split, or add items in `plan/backlog.md`.
2. Append a `plan/progress.md` entry with exact changes, commands, and results.
3. Append to `plan/decisions.md` if direction, scope, or cost changed.
4. Update `plan/roadmap.md` and the session-history table in `plan/strategy.md` if a horizon, milestone, or work split changed.
5. Update the status snapshot in `plan/README.md`.
6. Re-run lint, build, `test:rls`, `test:e2e`, and `test:pwa`; record the results.

Research-only and scoping sessions still produce a plan entry. These files are append-only where stated; never rewrite old log rows.

## Pull requests

- Keep changes small and reference a backlog ID (for example `P0-3`) in the commit message.
- Include the verification commands and their results in the PR description.
- Do not push or publish without explicit confirmation from the repository owner.

# Changelog

All notable changes to Hexis are recorded here. Entries are derived from the actual commit history (`git log --pretty=format:'%ad|%h|%s' --date=short`) and from verification runs recorded in [`plan/progress.md`](plan/progress.md). No release tags exist in this repository; date headings are commit dates, not release dates.

## [Unreleased] — 2026-11-26

### Added

- `test/logic.mjs` (`npm run test:logic`) for outbox validation, read-only guest claims, weekly-freeze semantics, and legacy archive totals.
- `scripts/pages.mjs` and `npm run verify:pages`: builds and tests the `/Hexis/` Pages variant alongside the Vercel-shaped build.
- Content-free local pilot counters (`src/lib/pilotEvents.ts`), a Settings panel behind `?pilot=events`, and an e2e assertion that emitted events contain no journal content.
- `docs/pilot-7-day.md` and `docs/walkthrough.md` for the guided cohort and the five-minute demo.
- `scripts/demo.mjs` (`npm run demo`) to capture deterministic demo frames into gitignored `shots/`.
- `engines` in `package.json` and CI/deploy pinned to Node 22.12.

### Fixed

- `P0-2` a failed daily notification no longer burns the dedupe key; the same-day retry is verified in `test:e2e`.
- `P0-3` malformed outbox entries are validated, discarded and removed before replay.
- `P0-4` affirmation bodies are trimmed before optimistic apply, so whitespace-only input creates no entry.
- `P0-5` guest claim survives read-only `localStorage` and no longer blocks account load.
- `P0-6` weekly streak rule made explicit and consistent: one freeze per missed check-in plus at least one real completion.
- `P0-7` legacy archives with unknown start keep historical scheduled totals in Insights while staying out of Today.
- `P0-8` the command-menu button is visible down to 303 px, with header overflow checks at 320 px and 303 px.
- `P1-1` Pages deployment now requires a green CI run; manual dispatch is the documented bypass.
- `P1-2` CI uploads both Vercel- and Pages-shaped artifacts and tests both base paths.
- `P1-4` supported Node versions are declared and pinned; `P1-3` was verified already correct (import IDs are mapped to `guest_id` with a fresh primary key).

### Verified

- `npm ci`, lint, build, `test:logic`, `test:rls`, `test:e2e`, `test:pwa`, `verify:pages` — exact output recorded in `plan/progress.md`.

## 2026-11-25

### Added

- `plan/` with strategy, roadmap, backlog, append-only decision and progress logs, and an index with the update convention.
- `CONTRIBUTING.md` and `THIRD_PARTY_NOTICES.md`.
- CI badge in `README.md`, and links from `README.md` and `CONTRIBUTING.md` to the plan.
- GitHub Pages deployment section in `README.md`, derived from `.github/workflows/deploy.yml`.

### Changed

- `.oxlintrc.json` ignores `synodos/**`, `.workbuddy-ai/**`, `dist/**`, and `node_modules/**` so `npm run lint -- --deny-warnings` passes locally as it does in CI.
- `.gitignore` ignores the untracked local research trees `synodos/` and `.workbuddy-ai/`; no files were deleted.
- `README.md` wording corrected where it contradicted `src/lib/tracking.ts` and `src/App.tsx` on weekly freezes, archived habits without a start date, the Weekly Coach data source, and streak milestones.

### Verified

- `npm ci`, `npm run lint -- --deny-warnings`, `npm run build`, `npm run test:rls`, `npm run test:e2e`, `npm run test:pwa` — exact output in `plan/progress.md`.

## 2026-11-24

- `20af56d` chore: rebrand Habittism to Hexis and restore Pages deployment.

## 2026-11-22

- `4a2f25e` docs: document journal recovery and release settings.
- `bf123f4` security: enforce production browser policies.
- `ce13395` feat: add a private weekly coach to Insights.
- `fbd4071` feat: expand habit icons to sixteen accessible accents.
- `9b191a0` fix: recover unsynced account edits after reload.
- `b460b53` fix: restore full JSON backups without overwriting journal data.

## 2026-11-21

- `3a8d879` docs: describe app installation, shortcuts and archive behavior.
- `dbab324` design: introduce liquid-glass themes and a daily progress dial.
- `98732de` fix: keep command palette effects safe in Chromium.
- `3b9a7e7` feat: add a weekly outlook and flexible target progress.
- `4f76e03` feat: install Habittism as an offline-capable app.
- `29b0c6e` feat: add a keyboard command menu and direct workspace links.
- `77ee74d` feat: edit habit details without changing tracking history.
- `8066501` fix: preserve journal history across habit archives and restores.
- `4e6fa44` update .gitignore to exclude ChatGPT folder.
- `67b4e75` remove accidental ChatGPT files and update .gitignore.
- `d1c5d3f` feat: implement archiving behavior, add migration, update UI and hooks.
- `9e50b5a` feat: add habit archiving and restore controls.

## 2026-11-20

- `37235fa` test: run browser and PostgreSQL verification in CI.
- `a1a8155` feat: add guest journals, starter packs and daily focus tools.
- `cfcdf7d` feat: add owner-scoped guest merge and check-in reflections.
- `a4d963b` chore: configure Vercel deployment and document Supabase setup.
- `c129740` test: verify cloud habit tracking and authentication flows.
- `c54d9c3` fix: harden autosave, import controls and mobile navigation.
- `603ec9c` feat: polish the workspace with dark mode and browser reminders.
- `f55018b` feat: add weekly and monthly habit insights.
- `309611b` feat: import legacy browser journals into Supabase.
- `b968522` feat: sync the habit workspace and calendar with Supabase.
- `6ee45d9` feat: model flexible schedules, numeric progress and streak freezes.
- `f815ba2` feat: add Supabase authentication and environment setup.
- `bb1f99a` feat: add Supabase habit schema and owner policies.
- `9af1254` feat: preserve daily greeting and interactive habit history.

## 2026-11-19

- `7ce3748` docs: link the live GitHub Pages preview in the README.
- `9f9e487` feat: build Habittism — habit tracker with liquid glass UI.
- `8b5bb2a` Initial commit.

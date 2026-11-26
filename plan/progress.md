# Progress — append-only session log

Append a new entry at the end after every work session, including research-only sessions. Never rewrite an older entry. Each entry states exactly what changed, the verification commands with their results, and what remains open mapped to backlog IDs.

## 2026-11-24 — rebrand and Pages deployment repair (reconstructed)

Source: `.workbuddy-ai/memory/2026-11-24.md:1-8`; commit `20af56d`. Recorded here because no `plan/` existed at that time.

- **Changed:** Habittism → Hexis rebrand; restored `push` trigger in `.github/workflows/deploy.yml`; switched `HABITTISM_BASE_PATH` to `HEXIS_BASE_PATH=/Hexis/`; removed the old `vite.config.ts` fallback; restored workflows deleted by ZIP extraction; deleted `Hexis.zip`; left `synodos/` untracked.
- **Root cause:** commit `a4d963b` changed the Pages trigger to `workflow_dispatch` only.
- **Verified (as recorded in the memory file):** `npm ci`, `npm run build`, `npm run lint` excluding untracked `synodos/`, `npm run test:rls`, `npm run test:e2e`, `npm run test:pwa` all passed; CI run `45356682855` and Pages deploy `45356682909` succeeded; live site served the Hexis service-worker cache and manifest.
- **Open:** local lint still failed with 58 warnings when `synodos/` was included (`P0-1`, now resolved); no plan folder existed.

## 2026-11-25 — Phase 1 audit, Phase 2 scaffolding, Phase 3 plan (this session)

### What changed

- **Read-only audits:** three parallel audits covering (a) `src/**`, `supabase/**`; (b) UI, i18n, styles, docs, PWA; (c) tests, scripts, CI, packaging. No audit modified files.
- **Lint fix:** `.oxlintrc.json:4` now ignores `synodos/**`, `.workbuddy-ai/**`, `dist/**`, `node_modules/**`; `.gitignore` now ignores `synodos/` and `.workbuddy-ai/`. No files were deleted.
- **Public-repo scaffolding:** added `CONTRIBUTING.md`, `CHANGELOG.md`, `THIRD_PARTY_NOTICES.md`; added a CI badge and plan/doc links to `README.md`; added a GitHub Pages deployment section to `README.md:41-45`.
- **Doc reconciliation:** `README.md:17,78,82,84,85` now match the code on the touch command-menu icon, weekly freezes, archived habits without a start date, the Weekly Coach data source, and streak milestones.
- **Plan:** created `plan/README.md`, `plan/strategy.md`, `plan/roadmap.md`, `plan/backlog.md`, `plan/decisions.md`, and this file. No root `PLAN.md` existed, so nothing was moved.

### Exact verification commands and results

| Command | Result |
| --- | --- |
| `gh auth status` | Logged in to github.com as `yermukhamed0777`; token scopes `delete_repo, gist, read:org, repo, workflow`. |
| `gh repo view yermukhamed0777/Hexis --json name,visibility,isPrivate,licenseInfo,defaultBranchRef,url,createdAt,updatedAt` | `name=Hexis`, `visibility=PUBLIC`, `isPrivate=false`, `licenseInfo.key=mit`, `defaultBranchRef=main`. No repo was created and no visibility/licence was changed. |
| `git remote -v`; `git rev-parse HEAD`; `git rev-parse origin/main` | origin `https://github.com/yermukhamed0777/Hexis.git`; local HEAD `20af56d3335e39021400cee1ff7f32b72e8f6473`; origin/main identical. |
| `node --version`; `npm.cmd --version` | Node `v24.18.1`; npm `11.16.0`. Plain `npm` in PowerShell failed with `npm.ps1 cannot be loaded because running scripts is disabled on this system`; `npm.cmd` was used. |
| `gh run list --repo yermukhamed0777/Hexis --limit 5` | CI `45356682855` success, Pages `45356682909` success on `20af56d` (pre-existing). |
| `npm.cmd ci` | `added 46 packages, and audited 47 packages in 9s`; `found 0 vulnerabilities`. |
| `npm.cmd run lint -- --deny-warnings` (before fix) | Exit 1; 58+ warnings only from untracked `synodos/...` files (e.g. `synodos/app/layout.tsx:21`, `synodos/components/sections/Idea.tsx:1`). |
| `npm.cmd run lint -- --deny-warnings` (after ignore fix) | Exit 0, no output. |
| `npm.cmd run build` | Baseline run exit 0; `2502 modules transformed`; `dist/index.html 1.40 kB / 0.62 kB gzip`, `dist/app-worker.js 1.53 kB`, `CSS 26.79 kB / 6.76 kB gzip`, `JS 332.67 kB / 103.13 kB gzip`; built in 499 ms. Final re-run after all edits exit 0 with identical sizes, built in 586 ms. |
| `npm.cmd run test:rls` | Exit 0; `PASS PostgreSQL owner isolation, reflections, atomic guest merge, conflict handling, and legacy import`. |
| `npm.cmd run test:e2e` | Exit 0; 12 PASS lines (auth/onboarding; calendar/history; weekly/numeric/insights; affirmation retry; durable outbox; legacy import/freeze; archive/restore; habit editing; command menu; weekly outlook; modern JSON restore; mobile/export/OAuth). |
| `npm.cmd run test:pwa` | Exit 0; `PASS install metadata, app icons, offline guest journal, and static-only caching under the Vercel CSP`. |
| `git status --short` (after ignore fix) | Only the intended tracked edits plus the new scaffolding/plan files; `synodos/` and `.workbuddy-ai/` no longer appear. |

### Audit findings carried into the backlog

- `P0-2` reminder dedupe written before notify (`src/hooks/useReminder.ts:59-67`); `P0-3` unvalidated outbox (`src/store/useCloudJournal.ts:57-68`); `P0-4` affirmation trim mismatch (`src/store/useCloudJournal.ts:39-40,51`); `P0-5` unguarded guest claim (`src/lib/guestJournal.ts:26-37`); `P0-6` weekly freeze over-excuse (`src/lib/tracking.ts:171,230`); `P0-7` null-start archive totals (`src/lib/tracking.ts:72-75,93-96`); `P0-8` touch command-menu icon (`src/index.css:440-442`).
- `P1-1` deploy not gated on CI (`.github/workflows/deploy.yml:3-6`); `P1-2` CI artifact base `/` vs Pages `/Hexis/` (`.github/workflows/ci.yml:45-49`, `.github/workflows/deploy.yml:22`); `P1-3` cross-user import ID collision (`supabase/migrations/20261122010000_import_modern_journal.sql:31-34`); `P1-4` unpinned Node (`package.json`, `README.md:21`).
- No i18n infrastructure exists: `index.html:2` is `lang="en"`, all UI copy is hard-coded English, and `src/components/TrackerViews.tsx:10` hard-codes `en-US` dates. No product analytics or AI service exists.

### What remains open

`P0-2` through `P0-8`, `P1-1` through `P1-4`, and all `M1-*`/`M2-*`/`M3-*`/`M4-*` items in [`backlog.md`](backlog.md). The first next action is `P0-2`.

### Delivery note

This entry is written before the commit by design. After the commit, `git push origin main`, local-vs-remote HEAD comparison, and `gh run list` confirm delivery; the resulting SHAs and CI status belong to the final report rather than a fabricated pre-commit claim.

## 2026-11-26 — clear every P0/P1 defect and prepare the seven-day pilot (this session)

### What changed

- **`P0-2`** `src/hooks/useReminder.ts`: added an in-flight guard, moved the `last-sent` write and in-session flag after a successful `notify()`, cleared a stale error on success. `e2e.mjs` now forces both the worker and page notification paths to fail, asserts the dedupe key stays null, then releases the failure and asserts a same-day retry writes the key.
- **`P0-3`** `src/store/useCloudJournal.ts`: exported `validAction` and `readPending`; outbox reads now validate action shape, discard bad JSON with a warning, and remove malformed keys. `test/logic.mjs` and `e2e.mjs` cover unknowns, bad fields and corrupt JSON.
- **`P0-4`** affirmation bodies are trimmed at enqueue and `apply` deletes the day's key for an empty body. `e2e.mjs` asserts whitespace-only input creates no local row or remote row.
- **`P0-5`** `src/lib/guestJournal.ts`: `setItem`/`getItem`/`removeItem` in `claimGuestJournal` are guarded, so account load proceeds under read-only storage. `test/logic.mjs` simulates the throw.
- **`P0-6`** `src/lib/tracking.ts`: documented the weekly-freeze rule and made the missed branch unconditional for past weeks; `README.md:78` updated. `test/logic.mjs` checks `target=4/done=1/frozen=3` keeps the streak while `done=0` breaks it.
- **`P0-7`** `src/lib/tracking.ts`: added `isActiveForHistory` and `isScheduledOn`; stats ignore an unknown archive start while `isActiveOn` keeps the habit out of Today. `README.md:82` updated and `test/logic.mjs` checks a 7-day archived habit keeps its opportunities and check-in.
- **`P0-8`** removed the `max-width: 303px` rule hiding the command-menu icon. `e2e.mjs` checks visibility and header overflow at 320 px and 303 px.
- **`P1-1`** `.github/workflows/deploy.yml`: replaced the `push` trigger with `workflow_run` on CI completion plus a `conclusion == 'success'` guard; checkout uses the verified `head_sha`. Manual dispatch is the explicit hotfix bypass.
- **`P1-2` / `M2-1`** `test/pwa.mjs` accepts `HEXIS_DIST` and asserts the built base; `scripts/pages.mjs` builds and tests the `/Hexis/` variant; CI uploads `dist-vercel` and `dist-pages` and runs `verify:pages`.
- **`P1-3`** verified no SQL change was needed: `import_modern_journal` maps supplied IDs to `guest_id` and Postgres generates the PK. Added a clarifying comment to `test/rls.mjs`.
- **`P1-4`** `package.json` declares `engines: ^20.19.0 || >=22.12.0`; lockfile root synced; CI and deploy pinned to Node 22.12; README and CONTRIBUTING updated.
- **`M1-2`** added `src/lib/pilotEvents.ts` with four allowlisted, content-free events and local counters. `AuthGate.tsx` records `sign_in`; `App.tsx` wraps the journal surface for `habit_created`/`checkin` and records `page_view`. A Settings panel behind `?pilot=events` exposes enable/disable and counts. `e2e.mjs` asserts every event has only `at`/`name` and contains no habit names, notes, affirmations or email.
- **`M1-3`** added `docs/walkthrough.md`, `scripts/demo.mjs` and `npm run demo`; five deterministic frames are written to gitignored `shots/`.
- **`M1-4`** added `docs/pilot-7-day.md` with cohort, consent wording, day-by-day schedule, counter instructions, failure format and decision gate. Recruiting and observing remain human.
- Updated `README.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, and all six `plan/` files. `.gitignore` now ignores `dist-pages`.

### Exact verification commands and results

| Command | Result |
| --- | --- |
| `npm.cmd ci` | `added 46 packages, and audited 47 packages in 10s`; `found 0 vulnerabilities`. |
| `npm.cmd run lint -- --deny-warnings` | Exit 0, no output. |
| `npm.cmd run build` | Exit 0; `2503 modules transformed`; `dist/index.html 1.40 kB / 0.62 kB gzip`, `dist/app-worker.js 1.53 kB`, CSS `26.71 kB / 6.73 kB gzip`, JS `336.24 kB / 104.10 kB gzip`; built in 453 ms. |
| `npm.cmd run test:logic` | Exit 0; three `discarded a malformed pending change` warnings from the intentional fixtures, then 5 PASS lines (outbox whitelist, trimmed affirmation validation, read-only guest claim, legacy archive totals, weekly streak rule). |
| `npm.cmd run test:rls` | Exit 0; `PASS PostgreSQL owner isolation, reflections, atomic guest merge, conflict handling, and legacy import`. |
| `npm.cmd run test:e2e` | Exit 0; 16 PASS lines including `whitespace-only affirmation creates no journal entry`, `failed notification is retried the same day and only then deduplicated`, `command menu is visible and the header fits at 320 px and 303 px`, and `pilot events are allowlisted and contain no journal content`. |
| `npm.cmd run test:pwa` | Exit 0; `PASS install metadata, app icons, offline guest journal, and static-only caching under the Vercel CSP`. |
| `npm.cmd run verify:pages` | Exit 0; `dist-pages` built with base `/Hexis/` (`index.html 1.43 kB`, JS `336.26 kB / 104.11 kB gzip`, 301 ms) and the same install PASS line. |
| `npm.cmd run demo` | Exit 0; all 16 e2e PASS lines repeated; 5 screenshots created in gitignored `shots/`. |
| `git status --short` | Only intended tracked edits plus new `docs/`, `scripts/`, `src/lib/pilotEvents.ts`, `test/logic.mjs`; `shots/`, `dist/` and `dist-pages/` are ignored. |

### What remains open

`M1-1`, `M1-4` (human cohort and seven sessions), `M2-2` (narrated video; frames and command exist), `M2-3`, and all `M3-*`/`M4-*` items. No P0 or P1 item is open. No product-usage metrics have been measured. No push or deployment was performed in this session; the CI/Pages gate is verified by workflow configuration and local commands, not by a deliberately red branch run.


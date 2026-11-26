# Hexis — strategy

Status: **public GitHub repository, deployed PWA; planning layer added 2026-11-25.**
Source: Phase 1 read-only audit of the working tree at `20af56d` plus commands recorded in [`progress.md`](progress.md). No product analytics exist, so no user or revenue numbers are claimed.

## Thesis

A habit tracker that does not put a signup wall in front of the user. Hexis opens as a guest journal in `localStorage` (`src/lib/guestJournal.ts:3,12,23`), works offline after the first load (`pwa/app-worker.js:8-32`, `test/pwa.mjs:51-63`), and offers Supabase sync only as an opt-in (`src/components/AuthGate.tsx:46-63`, `src/lib/supabase.ts:3-25`). The promise is privacy by access control: RLS on all four tables and owner-scoped RPCs (`supabase/schema.sql:58-76`, `test/rls.mjs:89-106`). It is **not** end-to-end encryption; account rows and guest JSON are plaintext to their respective storage providers.

## Users

- **Guest / privacy-curious trialist** — wants a blank journal immediately, no email. Implemented: `src/App.tsx:94-97`, `src/components/StarterPacks.tsx`.
- **Returning habit builder** — needs schedules, numeric goals, freezes, archive/restore, calendar and insights. Implemented in `src/lib/tracking.ts:72-255` and the components under `src/components/`.
- **Cross-device account holder** — signs in with password, magic link, or GitHub; guest journal merges into the account. Implemented in `src/components/AuthGate.tsx:86-177` and `supabase/migrations/20261120090500_guest_merge_and_reflections.sql`.
- **Existing-app migrator** — imports a legacy browser backup or a modern JSON backup. Implemented in `src/lib/legacyJournal.ts:28-97` and `src/lib/journalImport.ts:5-97`.

## Positioning

"Private by default, useful before signup, sync when you want it." Alternatives typically require an account first. Hexis's differentiator is the guest-first offline journal plus a one-click merge on sign-in, with a PWA install path (`public/manifest.webmanifest:15-18`). Deployment is currently dual: Vercel (`vercel.json`, `README.md:27-39`) and GitHub Pages (`.github/workflows/deploy.yml:1-47`, `README.md:41-45`).

## Metrics

**Measured (engineering only, 2026-11-26):** `npm ci` 0 vulnerabilities; lint 0 warnings; build succeeds (2503 modules, JS 336.24 kB / 104.10 kB gzip, CSS 26.71 kB / 6.73 kB gzip); `test:logic` 5 PASS lines; `test:rls` 1 PASS line; `test:e2e` 16 PASS lines; `test:pwa` 1 PASS line; `verify:pages` 1 PASS line on the `/Hexis/` build; `npm run demo` produced 5 screenshots. Earlier CI run `45356682855` and Pages deploy `45356682909` succeeded on `20af56d`. On commit `ab94729`, CI `45747394236` and Pages `45747520639` both succeeded, the latter via the new CI gate. These are verification results, not product usage.

**Not measured:** active users, guest→account conversion, D7 retention, check-in frequency, revenue, error rates. No analytics SDK or server-side event table exists. Any such number in future docs must be shown with the command that produced it.

**Targets to define with the user (not yet results):** guest→account conversion, weekly active journals, D7 check-in retention, p95 save latency, and sync-failure rate. Do not treat these as achieved.

## Risks

| Risk | Evidence | Impact |
| --- | --- | --- |
| RLS is the only privacy boundary; key validation is cosmetic | `src/lib/supabase.ts:3-11`, `supabase/schema.sql:58-76` | Misconfigured key/origin can misdirect auth; no E2E encryption |
| Deploy not gated on CI — **resolved 2026-11-26** | `.github/workflows/deploy.yml` now uses `workflow_run` + success guard | A red test run can still ship to Pages via manual dispatch only, which is an explicit bypass |
| CI artifact uses base `/`, Pages build uses `/Hexis/` — **resolved 2026-11-26** | `scripts/pages.mjs`, `test/pwa.mjs`, CI uploads both artifacts | Both targets are built and tested; no known mismatch |
| PWA shell can stay stale after deploy | `pwa/app-worker.js:8-19` (no `skipWaiting`) | Users see an old build until all tabs close |
| English-only UI with mixed locale formatting | `index.html:2`, `src/components/TrackerViews.tsx:10`, `src/lib/dates.ts:38` | Localisation requires touching all component copy |
| Known logic defects in streak/archive/outbox paths — **resolved 2026-11-26** | `src/lib/tracking.ts`, `src/store/useCloudJournal.ts`, `src/hooks/useReminder.ts` | All `P0-2`…`P0-8` items are ticked with recorded verification; no open known logic defect |
| Vendor lock-in to one Supabase origin in CSP | `vercel.json:13`, `README.md:33` | Changing backend requires manual header edit or requests are silently blocked |

## Open questions (human decisions required)

1. Is "private" meant as access-controlled only, or is client-side encryption a requirement? No code exists for the latter.
2. Keep the dual Vercel + Pages deployment, or choose one primary target? CI only tests the Vercel-shaped build.
3. Is Hexis a free product, a paid product, or a research prototype? No payments code exists; licence is currently MIT (`LICENSE:1`).
4. Should sign-in stay optional forever, or become required for cloud features beyond sync?
5. Which analytics are acceptable given the privacy promise, and where must data live?
6. Who owns the Supabase project, DNS, and Vercel account for long-term operation?

## Session history — exactly what was done

Sessions are grouped by commit date; descriptions use the actual commit subjects and the one memory file present (`.workbuddy-ai/memory/2026-11-24.md:1-8`). No metrics or completion states are inferred.

| Date | Session (commits) | Exactly what was done |
| --- | --- | --- |
| 2026-11-19 | `8b5bb2a`, `9f9e487`, `7ce3748` | Initial commit; built Habittism, a habit tracker with liquid glass UI; linked the live GitHub Pages preview in the README. |
| 2026-11-20 | 14 commits, `9af1254`…`37235fa` | Supabase schema and owner policies, auth and environment setup, flexible schedules/numeric goals/streak freezes, cloud sync, legacy import, insights, dark mode and reminders, autosave/import/mobile hardening, browser and PostgreSQL verification in CI, Vercel deployment docs, owner-scoped guest merge and reflections, guest journals/starter packs/daily focus. |
| 2026-11-21 | 12 commits, `9e50b5a`…`3a8d879` | Habit archiving and restore controls, archive behavior plus migration, `.gitignore` changes, history preservation across archive/restore, edit habit details without history changes, keyboard command menu and workspace links, offline installable app, weekly outlook and flexible targets, command-palette safety fix, liquid-glass themes and progress dial, installation/shortcut/archive docs. |
| 2026-11-22 | 6 commits, `b460b53`…`4a2f25e` | Restore full JSON backups without overwriting data, recover unsynced account edits after reload, 16 accessible accent colors, private Weekly Coach, production browser policies, journal recovery/release settings docs. |
| 2026-11-24 | `20af56d` | Rebranded Habittism to Hexis and restored Pages deployment. Root cause recorded in `.workbuddy-ai/memory/2026-11-24.md:4`: `a4d963b` had changed `deploy.yml` to `workflow_dispatch` only; push trigger restored, `HEXIS_BASE_PATH=/Hexis/` set, old `vite.config.ts` fallback removed. CI `45356682855` and Pages `45356682909` succeeded. |
| 2026-11-25 | uncommitted at time of writing | Read-only three-track audit (core/data, UI/docs, tests/CI); baseline verification `npm ci`, lint, build, `test:rls`, `test:e2e`, `test:pwa`; fixed local lint by ignoring untracked research trees; added public-repo scaffolding and this `plan/` folder; reconciled contradictory README claims. |
| 2026-11-26 | uncommitted at time of writing | Cleared every P0 and P1 item: notification retry, outbox validation, affirmation trim, read-only guest claim, weekly-freeze rule, legacy archive totals, narrow-screen command menu, CI-gated Pages deploy, dual build matrix, Node pin. Added content-free pilot counters, walkthrough and demo scripts, and the seven-day pilot plan. Full verification suite green; no push or deploy performed. |

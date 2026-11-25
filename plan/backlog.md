# Hexis — backlog

Ordered, executable tasks. IDs are stable: never renumber an existing item. Every item has a file:line reference and a `Done when` criterion. Status is ticked only after the verification command is recorded in [`progress.md`](progress.md).

## Horizon map

| Horizon | IDs | Meaning |
| --- | --- | --- |
| Short term | `P0-*`, `P1-*` | Next assistant sessions; small, concrete, verifiable changes. |
| Midterm | `M1-*`, `M2-*` | Real-world validation, product/team milestones, GTM proof. |
| Long term | `M3-*`, `M4-*` | Durable product shape, deployment posture, business model, platform scale. |

## P0 — short term, easy

- [x] **P0-1 — Establish the planning layer and public-repo scaffolding.** Refs: `README.md:9`, `CONTRIBUTING.md`, `CHANGELOG.md`, `THIRD_PARTY_NOTICES.md`, `plan/README.md`. **Done when:** `plan/` contains the six files, root README links to it, and `npm run lint -- --deny-warnings` exits 0. Verified 2026-11-25 in `progress.md`.

- [ ] **P0-2 — Retry a failed daily notification instead of suppressing it.** Ref: `src/hooks/useReminder.ts:59-67` writes the dedupe key before `notify()`. **Done when:** the key is written only after successful notification and `e2e.mjs` proves a second attempt succeeds on the same day; `npm run test:e2e` passes.

- [ ] **P0-3 — Reject malformed outbox entries when reading `localStorage`.** Refs: `src/store/useCloudJournal.ts:57-68,17-42,167`. **Done when:** an unknown action type cannot produce an `undefined` journal, with a regression case and passing suite.

- [ ] **P0-4 — Trim affirmation bodies before optimistic apply.** Refs: `src/store/useCloudJournal.ts:39-40,51`, `src/lib/habitRepository.ts:129-134`. **Done when:** a whitespace-only entry creates neither a local row nor a remote write; `test:e2e` passes.

- [ ] **P0-5 — Guard guest-claim when `localStorage.setItem` throws.** Refs: `src/lib/guestJournal.ts:26-37`, `src/App.tsx:64`. **Done when:** account load succeeds under simulated read-only storage; suite passes.

- [ ] **P0-6 — Apply the chosen weekly-freeze rule consistently.** Refs: `src/lib/tracking.ts:171,230`, `README.md:78`. **Done when:** user has chosen the semantics, `target=4/done=1/frozen=3` behaves as chosen, README and `e2e.mjs` agree.

- [ ] **P0-7 — Count known schedules for archived habits with no start date.** Refs: `src/lib/tracking.ts:72-75,93-96`, `supabase/migrations/20261121090000_track_archive_periods.sql:10-16`, `README.md:82`. **Done when:** a known-schedule date contributes an opportunity while check-ins survive; suite passes.

- [ ] **P0-8 — Make the touch command-menu entry point match the docs.** Refs: `src/index.css:440-442`, `README.md:17`, `src/App.tsx:212-213`. **Done when:** either the icon is visible at narrow widths or `README.md:17` states the limitation, with checks at 320 px and 303 px.

## P1 — short term, larger

- [ ] **P1-1 — Gate Pages deployment on green CI.** Refs: `.github/workflows/deploy.yml:3-6,38-47`, `.github/workflows/ci.yml:1-50`. **Done when:** a failing CI run prevents the Pages deploy job.

- [ ] **P1-2 — Align CI artifact base path with the deployed target.** Refs: `.github/workflows/ci.yml:45-49`, `.github/workflows/deploy.yml:22`, `vite.config.ts:27`. **Done when:** artifact asset URLs contain the same base as the deployment that consumes it.

- [ ] **P1-3 — Avoid cross-user ID collisions in modern import.** Refs: `supabase/migrations/20261122010000_import_modern_journal.sql:31-34`, `supabase/schema.sql:10`, `test/rls.mjs:81-87`. **Done when:** two accounts can import backups with the same habit ID without failure; `npm run test:rls` passes.

- [ ] **P1-4 — Declare and pin a supported Node version.** Refs: `package.json:1-34`, `.github/workflows/ci.yml:18-22`, `.github/workflows/deploy.yml:27-30`, `README.md:21`. **Done when:** `engines` is set, lockfile synced, CI minor pinned, and `npm ci` verified at the declared minimum and on Node 24.

## M1 — midterm, validation

- [ ] **M1-1 — Unmoderated guest-flow test with two external users.** Refs: `src/App.tsx:94-97`, `src/components/StarterPacks.tsx`. **Done when:** two outsiders complete a guest session unaided, failures are filed as new backlog IDs, and `progress.md` records the sessions.

- [ ] **M1-2 — Content-free product event set.** Refs: `e2e.mjs:143-144` (current error collection only). **Done when:** a test asserts emitted events contain no habit names, notes, or affirmations, and the event schema is recorded in `decisions.md`.

- [ ] **M1-3 — Scripted five-minute walkthrough.** Refs: `README.md:7-17`, `public/manifest.webmanifest:15-18`. **Done when:** a repeatable script produces a demo covering guest start, check-in, offline, and install, and its command is in `progress.md`.

## M2 — midterm, product and GTM proof

- [ ] **M2-1 — Build matrix for both deployment targets.** Refs: `.github/workflows/ci.yml:31`, `.github/workflows/deploy.yml:22`. **Done when:** CI builds and tests both `/` and `/Hexis/` outputs and `test:pwa` runs against each.

- [ ] **M2-2 — Zero open P0 items with a recorded demo.** Refs: this file's P0 section, `CHANGELOG.md`. **Done when:** all P0 boxes are ticked and a demo recording exists with its production command recorded.

- [ ] **M2-3 — Assign operational ownership and one external conversation.** Refs: `README.md:27-45`, `DECISIONS` via `plan/decisions.md`. **Done when:** names/accounts are recorded for Supabase, Vercel, DNS and SMTP, and one pricing or partner conversation is logged with its outcome.

## M3 — long term, durable product

- [ ] **M3-1 — Publish a repeatable performance benchmark.** Refs: `e2e.mjs` (timing currently not measured), `plan/strategy.md` (no latency numbers today). **Done when:** a command outputs p95 save-to-confirm in a fixed fixture and the number is recorded with the command.

- [ ] **M3-2 — Account export/deletion drill.** Refs: `README.md:62-64`, `src/lib/journalExport.ts:3-50`. **Done when:** a documented drill exports and deletes a test account and both results are captured in `progress.md`.

- [ ] **M3-3 — Choose and record the business model.** Refs: `LICENSE:1`, `plan/strategy.md` open questions 3 and 5. **Done when:** `decisions.md` records price or explicit free stance and the data-jurisdiction choice.

## M4 — long term, platform scale

- [ ] **M4-1 — Versioned integration contract and two external integrations.** Refs: `src/lib/tracking.ts` (core model), `src/store/useCloudJournal.ts:163-214` (public hook surface). **Done when:** a contract document exists and two integrations pass it; user has approved the scope.

- [ ] **M4-2 — Eval suite for any AI feature, plus self-hosted install drill.** Refs: `src/components/WeeklyCoach.tsx:8-20` (deterministic today). **Done when:** versioned fixtures score any AI output, and someone other than the author completes a self-hosted install.

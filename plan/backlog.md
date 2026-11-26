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

- [x] **P0-2 — Retry a failed daily notification instead of suppressing it.** Ref: `src/hooks/useReminder.ts`. **Done when:** the key is written only after successful notification and `e2e.mjs` proves a second attempt succeeds on the same day; `npm run test:e2e` passes. Verified 2026-11-26 (forced worker + page failure, then focus-triggered retry; `last-sent` stays null until success).

- [x] **P0-3 — Reject malformed outbox entries when reading `localStorage`.** Refs: `src/store/useCloudJournal.ts`. **Done when:** an unknown action type cannot produce an `undefined` journal, with a regression case and passing suite. Verified 2026-11-26 in `test/logic.mjs` and `test:e2e`.

- [x] **P0-4 — Trim affirmation bodies before optimistic apply.** Refs: `src/store/useCloudJournal.ts`, `src/lib/habitRepository.ts`. **Done when:** a whitespace-only entry creates neither a local row nor a remote write; `test:e2e` passes. Verified 2026-11-26.

- [x] **P0-5 — Guard guest-claim when `localStorage.setItem` throws.** Refs: `src/lib/guestJournal.ts`, `src/App.tsx`. **Done when:** account load succeeds under simulated read-only storage; suite passes. Verified 2026-11-26 in `test/logic.mjs`.

- [x] **P0-6 — Apply the chosen weekly-freeze rule consistently.** Refs: `src/lib/tracking.ts`, `README.md`. **Decision:** one freeze excuses one missed weekly check-in and at least one real completion is required; a past week with no completion breaks the streak. `target=4/done=1/frozen=3` keeps the streak. Verified 2026-11-26 in `test/logic.mjs`; README and tests agree.

- [x] **P0-7 — Count known schedules for archived habits with no start date.** Refs: `src/lib/tracking.ts`, `README.md`. **Done when:** a known-schedule date contributes an opportunity while check-ins survive. Verified 2026-11-26: `isActiveForHistory`/`isScheduledOn` ignore an unknown archive start for stats, while `isActiveOn` keeps the habit out of Today.

- [x] **P0-8 — Make the touch command-menu entry point match the docs.** Refs: `src/index.css`, `README.md`, `src/App.tsx`. **Done when:** the icon is visible at 320 px and 303 px with no header overflow. Verified 2026-11-26 in `test:e2e`.

## P1 — short term, larger

- [x] **P1-1 — Gate Pages deployment on green CI.** Refs: `.github/workflows/deploy.yml`, `.github/workflows/ci.yml`. **Done when:** a failing CI run prevents the Pages deploy job. Implemented with a `workflow_run` completion trigger plus `if: conclusion == 'success'`; manual dispatch remains an explicit bypass. Verified by configuration review and the recorded CI/Pages runs; a deliberately red branch has not been exercised here.

- [x] **P1-2 — Align CI artifact base path with the deployed target.** Refs: `.github/workflows/ci.yml`, `scripts/pages.mjs`, `test/pwa.mjs`. **Done when:** artifact asset URLs match the intended deployment target. CI now uploads `dist-vercel` (base `/`) and `dist-pages` (base `/Hexis/`); `npm run verify:pages` passed 2026-11-26.

- [x] **P1-3 — Avoid cross-user ID collisions in modern import.** Refs: `supabase/migrations/20261122010000_import_modern_journal.sql`, `test/rls.mjs`. **Done when:** two accounts can import backups with the same habit ID without failure. Verified 2026-11-26: the RPC stores the supplied ID in `guest_id` and lets Postgres generate the primary key, so no SQL change was needed; `test:rls.mjs` asserts a fresh ID and correct log remapping for a second account.

- [x] **P1-4 — Declare and pin a supported Node version.** Refs: `package.json`, `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`, `README.md`. **Done when:** `engines` is set, lockfile synced, CI minor pinned. `engines: ^20.19.0 || >=22.12.0`, lockfile root updated, CI and deploy pinned to `22.12`; `npm ci` verified on Node 24.18.1.

## M1 — midterm, validation

- [ ] **M1-1 — Unmoderated guest-flow test with two external users.** Refs: `src/App.tsx`, `src/components/StarterPacks.tsx`. **Done when:** two outsiders complete a guest session unaided, failures are filed as new backlog IDs, and `progress.md` records the sessions. **Status:** human work only; not started.

- [x] **M1-2 — Content-free product event set.** Refs: `src/lib/pilotEvents.ts`, `e2e.mjs`. **Done when:** a test asserts emitted events contain no habit names, notes, or affirmations, and the event schema is recorded in `decisions.md`. Verified 2026-11-26; schema recorded in `plan/decisions.md`.

- [x] **M1-3 — Scripted five-minute walkthrough.** Refs: `docs/walkthrough.md`, `scripts/demo.mjs`, `README.md`. **Done when:** a repeatable script produces a demo covering guest start, check-in, offline, and install, and its command is in `progress.md`. Verified 2026-11-26 (`npm run demo` produced five frames).

- [ ] **M1-4 — Seven-day pilot with five fixed users.** Refs: `docs/pilot-7-day.md`. **Intelligence:** complete — cohort plan, consent wording, counter enable/disable UI, failure-report format, decision gate, and all automated checks. **Human:** recruit five participants, obtain consent, run Days 0–7, collect counters, file failures as new IDs, and decide go/no-go. **Done when:** `progress.md` records all seven sessions and the decision in `decisions.md`. **Status:** human work only; not started.

## M2 — midterm, product and GTM proof

- [x] **M2-1 — Build matrix for both deployment targets.** Refs: `.github/workflows/ci.yml`, `scripts/pages.mjs`, `test/pwa.mjs`. **Done when:** CI builds and tests both `/` and `/Hexis/` outputs and `test:pwa` runs against each. Verified 2026-11-26.

- [ ] **M2-2 — Zero open P0 items with a recorded demo.** Refs: this file's P0 section, `CHANGELOG.md`, `scripts/demo.mjs`. **Done when:** all P0 boxes are ticked and a demo recording exists with its production command recorded. **Status:** all P0 boxes are ticked and `npm run demo` produces deterministic frames; the narrated video is a human step and has not been produced.

- [ ] **M2-3 — Assign operational ownership and one external conversation.** Refs: `README.md`, `plan/decisions.md`. **Done when:** names/accounts are recorded for Supabase, Vercel, DNS and SMTP, and one pricing or partner conversation is logged with its outcome. **Status:** human work only; not started.

## M3 — long term, durable product

- [ ] **M3-1 — Publish a repeatable performance benchmark.** Refs: `e2e.mjs`, `plan/strategy.md`. **Done when:** a command outputs p95 save-to-confirm in a fixed fixture and the number is recorded with the command.

- [ ] **M3-2 — Account export/deletion drill.** Refs: `README.md`, `src/lib/journalExport.ts`. **Done when:** a documented drill exports and deletes a test account and both results are captured in `progress.md`.

- [ ] **M3-3 — Choose and record the business model.** Refs: `LICENSE`, `plan/strategy.md` open questions 3 and 5. **Done when:** `decisions.md` records price or explicit free stance and the data-jurisdiction choice.

## M4 — long term, platform scale

- [ ] **M4-1 — Versioned integration contract and two external integrations.** Refs: `src/lib/tracking.ts`, `src/store/useCloudJournal.ts`. **Done when:** a contract document exists and two integrations pass it; user has approved the scope.

- [ ] **M4-2 — Eval suite for any AI feature, plus self-hosted install drill.** Refs: `src/components/WeeklyCoach.tsx`. **Done when:** versioned fixtures score any AI output, and someone other than the author completes a self-hosted install.

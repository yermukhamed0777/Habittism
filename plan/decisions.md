# Decisions — append-only log

Never rewrite or reorder a row. Add a new row with the next date. A row states the decision and why; it is not a claim that the work was completed.

| Date | Decision | Why |
| --- | --- | --- |
| 2026-11-20 | Use Supabase (Postgres + Auth) for account sync and Vercel for hosting. | Recorded by commits `bb1f99a` (schema and owner policies), `f815ba2` (auth), `a4d963b` (Vercel setup) and `README.md:27-35`. Guest-first access was already in the product. |
| 2026-11-21 | Track archive periods in a dedicated column via migration rather than overwriting check-in history. | Commits `9e50b5a`, `d1c5d3f`, migration `supabase/migrations/20261121090000_track_archive_periods.sql`; the README documents counts and streaks surviving archive/restore. |
| 2026-11-22 | Enforce production browser policies through Vercel headers and add a deterministic Weekly Coach. | Commit `bf123f4` added CSP and related headers in `vercel.json`; `ce13395` added `src/components/WeeklyCoach.tsx`, which reads the loaded journal rather than calling an AI service. |
| 2026-11-24 | Rebrand Habittism → Hexis and restore `push` as the Pages deploy trigger with base `/Hexis/`. | `.workbuddy-ai/memory/2026-11-24.md:3-7`: the previous commit had made deploy manual-only, leaving a stale site; rebrand required a consistent basename. Verified by CI `45356682855` and Pages `45356682909`. |
| 2026-11-24 | Leave `synodos/` untracked rather than committing or deleting it. | `.workbuddy-ai/memory/2026-11-24.md:8`: explicitly left untracked as requested; it is unrelated research work. |
| 2026-11-25 | Keep the existing repository PUBLIC and its MIT licence; add public-repo scaffolding and push. | Explicit user confirmation on 2026-11-25 after `gh repo view` showed `visibility: PUBLIC`, `licenseInfo.key: mit`. No licence change or repo creation was performed. |
| 2026-11-25 | Write plan documentation in English. | Explicit user confirmation; matches `index.html:2` (`lang="en"`) and the existing `README.md`. |
| 2026-11-25 | Ignore `synodos/` and `.workbuddy-ai/` in `.gitignore` and `.oxlintrc.json` rather than deleting them. | Explicit user confirmation. `npm run lint -- --deny-warnings` failed only because oxlint scanned 123,516 untracked files in those trees; CI on a clean checkout was green. No files were deleted. |
| 2026-11-25 | Scope the plan to Hexis only; exclude Synodos from strategy and roadmap. | Explicit user confirmation. Synodos has a separate nested git repository and no wiring into this project's tests or CI. |
| 2026-11-25 | Do not add an `engines` field to `package.json` in this session. | Verified from `package-lock.json`: required `vite` and `oxlint` accept Node `^20.19.0 || >=22.12.0`, so `README.md` is already accurate; the stricter `^22.13.0` rule belongs to an optional dependency. Avoids lockfile churn without a real defect. |
| 2026-11-25 | Reconcile README claims to code rather than silently changing tracking behavior. | Phase 2 scope: documentation must match verified code. The behavioral defects stay visible as backlog IDs `P0-6`/`P0-7` instead of being hidden by an inaccurate fix. |

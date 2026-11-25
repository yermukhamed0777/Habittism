# Hexis — plan index

This folder is the single source of truth for long-term execution. It was created on 2026-11-25; no root `PLAN.md` existed, so nothing was moved. Documentation language: English.

## Files

1. [`strategy.md`](strategy.md) — thesis, users, positioning, measured vs desired metrics, risks, open questions, and a condensed session-history table with one row per session.
2. [`roadmap.md`](roadmap.md) — THE PLAN, split into exactly three horizons (Short term, Midterm, Long term), each milestone divided into Intelligence and Human work, plus the host/database expansion table and selection rule.
3. [`backlog.md`](backlog.md) — ordered executable tasks with stable IDs, file:line references, and a `Done when` criterion for every item; includes the horizon map.
4. [`decisions.md`](decisions.md) — append-only decision log (date, decision, why). Never rewrite an old row.
5. [`progress.md`](progress.md) — append-only session log: exactly what changed, exact verification commands and results, and open items mapped to backlog IDs. Research-only sessions get an entry too.
6. [`README.md`](README.md) — this index, the binding update convention, and the status snapshot.

## Status snapshot

- **Stage:** Public GitHub repository (`yermukhamed0777/Hexis`, PUBLIC, MIT), PWA deployed to Vercel and GitHub Pages. Phase 1 audit and Phase 2 scaffolding complete; plan layer established. Known P0 defects remain open.
- **Latest measured numbers (2026-11-25):** Node `v24.18.1`, npm `11.16.0`; `npm ci` 0 vulnerabilities, 46 packages; lint exit 0 after ignore fix; build 2502 modules, JS 332.67 kB / 103.13 kB gzip, CSS 26.79 kB / 6.76 kB gzip, 499 ms baseline and 586 ms final re-run; `test:rls` 1 PASS; `test:e2e` 12 PASS; `test:pwa` 1 PASS. Pre-existing CI `45356682855` and Pages `45356682909` succeeded on `20af56d`. No product-usage metrics exist.
- **Next action:** `P0-2` — retry a failed daily notification instead of suppressing it (`src/hooks/useReminder.ts:59-67`), after this commit is pushed and CI is confirmed.

## Binding update convention

After **every** work session, in the **same commit** as the work:

1. Tick, split, or add items in [`backlog.md`](backlog.md). Never renumber stable IDs.
2. Append a [`progress.md`](progress.md) entry with exact changes, exact commands, and exact results. Append; do not rewrite.
3. Append to [`decisions.md`](decisions.md) if direction, scope, visibility, licence, cost, or deployment changed.
4. Update [`roadmap.md`](roadmap.md) and the session-history table in [`strategy.md`](strategy.md) if a horizon, milestone, or Intelligence/Human work split changed.
5. Update this status snapshot (stage, latest measured numbers, next action).
6. Re-run lint, build, `test:rls`, `test:e2e`, and `test:pwa`; record the results in the progress entry.

Research or scoping sessions still produce a plan entry, even when no code changed. A claim is not "done" until a recorded command supports it. Never invent metrics, history, or completion status.

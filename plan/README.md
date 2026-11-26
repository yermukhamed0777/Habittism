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

- **Stage:** Public GitHub repository (`yermukhamed0777/Hexis`, PUBLIC, MIT), PWA deployed to Vercel and GitHub Pages. Phase 1 audit and Phase 2 scaffolding complete; all `P0-*` and `P1-*` items are closed. The seven-day pilot is prepared in `docs/pilot-7-day.md`; its five participants and seven sessions are human work and have not been started. No product-usage metrics exist.
- **Latest measured numbers (2026-11-26):** Node `v24.18.1`, npm `11.16.0`; `npm ci` 0 vulnerabilities, 46 packages; lint exit 0; build 2503 modules, JS 336.24 kB / 104.10 kB gzip, CSS 26.71 kB / 6.73 kB gzip, 453 ms; `test:logic` 5 PASS; `test:rls` 1 PASS; `test:e2e` 16 PASS; `test:pwa` 1 PASS; `verify:pages` 1 PASS; `npm run demo` produced 5 frames. Earlier CI `45356682855` and Pages `45356682909` succeeded on `20af56d`. Delivery on commit `ab94729`: CI `45747394236` success (1m9s) and Pages `45747520639` success via the new CI gate.
- **Next action:** `M1-4` — the human seven-day pilot with five fixed users. Assistant-side preparation is complete, including the ten-scenario `npm run test:integrity` suite, `docs/recovery-guide.md`, and the final demo frames; the remaining work is recruitment, consent, seven observed sessions, failure filing, and the go/no-go decision. Simulation at 375/320/303 px is not physical-device verification.

## Binding update convention

After **every** work session, in the **same commit** as the work:

1. Tick, split, or add items in [`backlog.md`](backlog.md). Never renumber stable IDs.
2. Append a [`progress.md`](progress.md) entry with exact changes, exact commands, and exact results. Append; do not rewrite.
3. Append to [`decisions.md`](decisions.md) if direction, scope, visibility, licence, cost, or deployment changed.
4. Update [`roadmap.md`](roadmap.md) and the session-history table in [`strategy.md`](strategy.md) if a horizon, milestone, or Intelligence/Human work split changed.
5. Update this status snapshot (stage, latest measured numbers, next action).
6. Re-run lint, build, `test:rls`, `test:e2e`, and `test:pwa`; record the results in the progress entry.

Research or scoping sessions still produce a plan entry, even when no code changed. A claim is not "done" until a recorded command supports it. Never invent metrics, history, or completion status.

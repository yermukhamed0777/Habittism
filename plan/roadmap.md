# Hexis — roadmap

The plan is split into exactly three horizons: **Short term**, **Midterm**, **Long term**. An expansion section follows for host/database alternatives. Each milestone is split into **Intelligence** (what the assistant can do) and **Human** (what only the user can do). Targets are proposals, not measured results.

## Short term

Really easy, concrete next steps. I take the Intelligence items; the user is needed only where marked.

1. **Fix the failed-notification reminder dedupe** (`P0-2`, `src/hooks/useReminder.ts:59-67`).
   - **Intelligence:** Move the `last-sent` write to after a successful `notify()`; add a regression case to `e2e.mjs` that forces a failure and verifies a retry in the same day; run the four verification commands.
   - **Human:** Confirm that a failed browser notification should be retried rather than counted as sent.
   - **Done when:** `test:e2e` contains a failing-then-succeeding notification case and `npm run test:e2e` passes; `plan/progress.md` records the command and result.

2. **Validate outbox actions on read** (`P0-3`, `src/store/useCloudJournal.ts:57-68,17-42,167`).
   - **Intelligence:** Whitelist action types and required fields; drop malformed entries with a console warning; add a unit-style check to `test/rls.mjs` or a dedicated harness.
   - **Human:** None.
   - **Done when:** A corrupted `localStorage` outbox entry cannot reduce the journal to `undefined`; verification suite passes.

3. **Trim affirmations consistently** (`P0-4`, `src/store/useCloudJournal.ts:39-40,51`, `src/lib/habitRepository.ts:129-134`).
   - **Intelligence:** Apply `.trim()` at enqueue time as well as in the repository; add an e2e assertion that whitespace-only input creates no local entry.
   - **Human:** Confirm that blank affirmations should delete the day's entry (current server behavior).
   - **Done when:** `test:e2e` passes with the new assertion.

4. **Guard guest-journal claim against unavailable storage** (`P0-5`, `src/lib/guestJournal.ts:26-37`, `src/App.tsx:64`).
   - **Intelligence:** Wrap `setItem` in try/catch consistent with `guestJournal.ts:10-16`; ensure account load proceeds when storage is read-only; add a test.
   - **Human:** None.
   - **Done when:** A simulated `setItem` throw still allows cloud journal load; suite passes.

5. **Correct weekly streak freeze accounting** (`P0-6`, `src/lib/tracking.ts:171,230`, `README.md:78`).
   - **Intelligence:** Decide the intended rule with the user, implement it, update `README.md:78`, add a streak case to `e2e.mjs`.
   - **Human:** Choose the rule: one freeze per week, or one freeze per missed day. This is a product semantics decision.
   - **Done when:** The chosen rule holds for `target=4, done=1, frozen=3`; README and tests agree.

6. **Fix archived habits with no recorded start date** (`P0-7`, `src/lib/tracking.ts:72-75,93-96`, `README.md:82`).
   - **Intelligence:** Make `start:null` use known schedule dates instead of treating every date as archived; update README and add a regression case.
   - **Human:** Confirm that legacy archived habits with unknown start dates should retain scheduled totals.
   - **Done when:** A known-schedule date contributes an opportunity; suite passes.

7. **Restore or document the touch command-menu entry point** (`P0-8`, `src/index.css:440-442`, `README.md:17`).
   - **Intelligence:** Either keep the icon visible at narrow widths or document the limitation precisely; verify at 320 px and 303 px in `e2e.mjs`.
   - **Human:** Decide whether very narrow touch screens must have the command menu.
   - **Done when:** The documented behavior matches the rendered behavior at both widths.

8. **Gate Pages deployment on a green CI run** (`P1-1`, `.github/workflows/deploy.yml:3-6,38-47`, `.github/workflows/ci.yml:1-50`).
   - **Intelligence:** Add a `needs: ci` job or workflow_run gate; keep manual dispatch explicit; test with a deliberately failing lint on a branch.
   - **Human:** Approve slower deploys and decide whether hotfixes may bypass CI.
   - **Done when:** A red CI run prevents the Pages job from starting.

9. **Align the CI artifact with the deployed base path** (`P1-2`, `.github/workflows/ci.yml:45-49`, `.github/workflows/deploy.yml:22`).
   - **Intelligence:** Either build the artifact with `HEXIS_BASE_PATH=/Hexis/` or label it as a Vercel-shaped artifact; add a check that asset URLs contain the intended base.
   - **Human:** Decide whether the artifact is meant to be deployable to Pages.
   - **Done when:** Artifact asset URLs match the intended deployment target.

10. **Prevent cross-user ID collisions in modern import** (`P1-3`, `supabase/migrations/20261122010000_import_modern_journal.sql:31-34`, `supabase/schema.sql:10`).
    - **Intelligence:** Generate a fresh `id` when the supplied ID already exists for another user; extend `test/rls.mjs`.
    - **Human:** Confirm that imported backups may legitimately reuse IDs across accounts.
    - **Done when:** Two users can import backups containing the same habit ID without either failing.

11. **Pin the supported Node version** (`P1-4`, `package.json:1-34`, `.github/workflows/ci.yml:18-22`, `README.md:21`).
    - **Intelligence:** Add `engines`, sync the lockfile, and pin CI to a minor that satisfies `^20.19.0 || >=22.12.0`; verify `npm ci` on both 22.x and 24.x where available.
    - **Human:** Decide the minimum supported Node release and how long old releases are supported.
    - **Done when:** `npm ci` fails clearly below the declared minimum and succeeds at it.

## Midterm

Bigger milestones with real-world validation and GTM proof.

**M1 — First external validation.** Exit criteria: at least two people outside the project have used the guest flow unaided, their observed failures are recorded as backlog IDs with fixes verified, and a privacy-safe event set exists (no habit names, notes, or check-in content in analytics).
- **Intelligence:** Build a guest-only demo build, add consent-free counters (page view, habit created, check-in, sign-in) behind a local flag, write a test that asserts no journal content is present in emitted events, prepare a scripted 5-minute walkthrough.
- **Human:** Recruit the two testers, obtain permission to observe and record, run the sessions, decide what feedback changes the product, and record the decision in `plan/decisions.md`.

**M2 — Repeatable product and GTM proof.** Exit criteria: the same onboarding flow passes on Vercel and Pages builds, a recorded demo exists, one documented paid or partnership conversation has occurred, and the team/personal handoff responsibilities (Supabase, Vercel, DNS, SMTP) are assigned.
- **Intelligence:** Add a build-matrix check for both base paths, produce a deterministic demo fixture and recording script, document account ownership and backup/restore operations, reduce the known defect list to zero P0 items.
- **Human:** Record and publish the demo, recommend it to friends, book partner meetings, set a price or state clearly that the product stays free, and sign up for the services that require a human account.

## Long term

What the product is awaiting: shape, deployment posture, business model, and quantitative exit criteria. All numbers below are **proposed targets requiring user confirmation**, not measured results.

**M3 — Durable privacy-first product.** Shape: guest-first PWA with optional owner-scoped cloud sync, no journal content in third-party analytics, and a documented data export/deletion path. Deployment posture: one primary static host plus a managed or self-hosted Postgres, with a reproducible staging environment. Business model: direct consumer subscription or one-time purchase, or an explicit free/public-good stance. Exit criteria (proposed): zero P0/P1 backlog items; p95 save-to-confirm under 300 ms measured in a published benchmark; 30-day guest→account conversion measured from consent-free counters; one complete account deletion/export drill recorded; 100% of deploys gated on green CI.
- **Intelligence:** Implement the measurement harness and deletion/export drill, maintain the benchmark, keep the plan logs current, and add localization scaffolding if the user chooses a second language.
- **Human:** Choose the business model and price, approve terms/privacy copy, decide which jurisdiction stores account data, and sign the service contracts.

**M4 — Optional platform / team scale.** Shape: the same core with plugins or MCP-style integrations and an evaluated AI Coach, only if validation shows demand. Deployment posture: add self-hosted packaging (static bundle + Postgres) for users who will not use managed services. Exit criteria (proposed): at least two external integrations built against a documented contract; an eval suite with versioned fixtures for any AI feature; one successful self-hosted install by someone other than the author; support burden measured and accepted.
- **Intelligence:** Define and version the integration contract, build fixtures and eval scoring, package the self-hosted stack, and automate release notes from `CHANGELOG.md`.
- **Human:** Decide whether external integrations are in scope, approve any AI data-use policy, run partner pilot meetings, and accept or reject the support load.

## Expansion — host/database alternatives by job

| Job | Current | Alternatives | Watch-out |
| --- | --- | --- | --- |
| Static hosting | Vercel + GitHub Pages (`vercel.json`, `.github/workflows/deploy.yml`) | Cloudflare Pages, Netlify, self-hosted nginx | Two targets already diverge on base path and headers; adding a third multiplies build-matrix work. |
| Server DB / vector | Supabase Postgres (`supabase/schema.sql`) | Neon, PocketBase, self-hosted Postgres; PGlite + custom sync | RLS policies and three SQL RPCs must be reimplemented; there is no vector store today, and adding one changes the privacy story. |
| Auth | Supabase Auth (`src/components/AuthGate.tsx:86-177`) | Auth.js, Clerk, Firebase Auth, self-hosted | Redirect allowlists and guest-merge identity must be remapped; magic-link and GitHub flows are asserted by `e2e.mjs`. |
| Storage / CDN | None; static assets in `public/` | Cloudflare R2, Supabase Storage | No user files are stored today; adding storage needs an explicit privacy and retention decision. |
| Edge functions | None; reminder runs in the page (`src/hooks/useReminder.ts`) | Vercel Edge, Cloudflare Workers, Supabase Edge | Moving reminders server-side breaks the "while the app is open" promise in `README.md:79` and needs push permission handling. |
| Observability | None; `pageerror` collected only in `e2e.mjs:143-144` | Sentry, OpenTelemetry, Vercel Analytics | Must never transmit habit names, notes, or affirmations; consent and retention need a recorded decision. |
| Product analytics | None | PostHog (self-hosted), Plausible, Umami | Event schema must be content-free; hosted analytics conflicts with the privacy thesis unless explicitly approved. |
| AI / eval | Deterministic Weekly Coach (`src/components/WeeklyCoach.tsx:8-20`) | LLM coach, local model, versioned eval harness | Prompts could send journal text off-device; evals need synthetic fixtures, never production journals. |
| Payments | None | Stripe, Lemon Squeezy, Paddle | Tax/VAT, account linkage, and refund flows are human obligations; current licence is MIT. |
| Email | Supabase default SMTP; custom SMTP documented at `README.md:27` | Resend, Postmark, any SMTP relay | Default service delivers only to project team addresses; marketing email requires consent. |
| Docs | `README.md` + `plan/` | Docusaurus, MkDocs, GitHub Wiki | Extra build surface; keep append-only plan logs out of a generated site. |
| Feature flags | None | Unleash, Statsig, simple env flags | Flags must not silently change privacy-critical behavior without tests. |
| On-prem packaging | None | Docker Compose bundle with self-hosted Supabase; static bundle + external DB | Base path, SMTP, backups, and upgrades become the operator's responsibility. |
| CI / supply chain | GitHub Actions, `npm ci`, lockfile v3 | Renovate/Dependabot, pinned action SHAs, signed commits, provenance | Deploy is not gated on CI (`deploy.yml:3-6`); optional dependencies can change lockfile resolution. |

**Selection rule:** choose the cheapest boring option that preserves the product's core promise — a guest journal that works offline before signup, owner-scoped sync when the user opts in, and zero journal content in third-party telemetry. Stay on Supabase + Vercel/Pages until a measured requirement forces a switch; when switching, port the RLS assertions in `test/rls.mjs` and the PWA checks in `test/pwa.mjs` before cutting over.

# Hexis

[![CI](https://github.com/yermukhamed0777/Hexis/actions/workflows/ci.yml/badge.svg)](https://github.com/yermukhamed0777/Hexis/actions/workflows/ci.yml)

Hexis is a private habit tracker and affirmation journal. Start immediately as a guest, build a blank journal one habit at a time or choose an optional starter pack, and sign in to sync across devices.

[Open Hexis](https://habittism.vercel.app/) (the existing Vercel project is named `habittism`; `hexis.vercel.app` is an unrelated third-party app)

Long-term planning, decision history, and session logs live in [`plan/`](plan/README.md). Contribution and verification rules are in [`CONTRIBUTING.md`](CONTRIBUTING.md). Third-party components are listed in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md). The guided seven-day pilot is planned in [`docs/pilot-7-day.md`](docs/pilot-7-day.md), a repeatable five-minute walkthrough is in [`docs/walkthrough.md`](docs/walkthrough.md), and the supported recovery paths are in [`docs/recovery-guide.md`](docs/recovery-guide.md).

## Install and launch

Open the live app and choose **Install app** on the guest banner or in **Settings → App**. The browser can add a desktop, Start menu, or home-screen icon. Where supported, the app icon’s shortcuts open [Today’s Focus](https://habittism.vercel.app/?view=today) or the [habit calendar](https://habittism.vercel.app/?view=calendar).

Guest journals can reopen offline after the first visit completes. The app caches the interface and its static assets. Your guest journal stays in browser storage, and account sync uses the network.

Use **Ctrl+K** or **⌘K** to jump to a page, find a habit, or start an action. The search icon opens the same menu on touch devices, including narrow screens down to 303 px.

## Run locally

1. Use Node.js 20.19+ or 22.12+ (the version declared in `package.json` `engines`; 22.12 is the version used in CI) and run `npm ci`.
2. Create a Supabase project. In its **SQL Editor**, run [supabase/schema.sql](supabase/schema.sql) once, then apply each SQL file in [supabase/migrations](supabase/migrations) in filename order. Projects that already have the base schema need only the unapplied migrations.
3. Copy [`.env.example`](.env.example) to `.env.local`. Set `VITE_SUPABASE_URL` to the Project URL and `VITE_SUPABASE_ANON_KEY` to its publishable or legacy anon key. Vite exposes these two values in the browser bundle. Keep Supabase service-role and secret keys in server environments.
4. In Supabase **Authentication → URL Configuration**, add `http://localhost:5173/` to **Redirect URLs**. Set the **Site URL** to that address while developing a local-only project. [Supabase redirect configuration](https://supabase.com/docs/guides/auth/redirect-urls)
5. Run `npm run dev` and open [the local app](http://localhost:5173/).

Email and password, email confirmation, magic links, password reset, and GitHub sign-in use Supabase Auth. For public email delivery, configure **Custom SMTP** in Supabase Authentication. The default mail service only delivers to authorized project team addresses. [Supabase SMTP setup](https://supabase.com/docs/guides/auth/auth-smtp)

To enable GitHub sign-in, create a GitHub OAuth App. Use your Hexis URL as the homepage and copy the callback URL from Supabase’s **GitHub** auth provider into the OAuth App’s **Authorization callback URL**. Enable the provider in Supabase and enter the GitHub client ID and secret there. [Supabase GitHub sign-in setup](https://supabase.com/docs/guides/auth/social-sign-in/auth-github)

## Deploy on Vercel

1. Complete the Supabase schema and auth setup above. In Vercel, select **Add New → Project**, connect GitHub, and import `yermukhamed0777/Hexis`. If the repository is missing from the list, grant the Vercel GitHub App access to it. [Vercel GitHub integration](https://vercel.com/docs/git/vercel-for-github)
2. Leave **Root Directory** at the repository root and use the **Vite** preset. [vercel.json](vercel.json) sets `npm run build` and the `dist` output directory. The app uses in-page navigation and returns from sign-in at the root URL.
3. Under **Environment Variables**, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` before the first deploy. In an existing project, use **Settings → Environment Variables**, select **Production**, and redeploy after saving. Add the values to **Preview** if you want preview deployments to connect to Supabase. [Vercel environment variables](https://vercel.com/docs/environment-variables)
4. Deploy. Confirm that **Settings → Environments → Production → Branch Tracking** uses `main`. Future pushes to `main` will deploy to production. [Vercel branch tracking](https://vercel.com/docs/git#customizing-the-production-branch)
5. If you are deploying with a different Supabase project, update the `connect-src` origin in [vercel.json](vercel.json) to match `VITE_SUPABASE_URL`.
6. Copy the production URL from Vercel. In Supabase **Authentication → URL Configuration**, set it as **Site URL** and add the exact root URL with a trailing slash to **Redirect URLs**. Add any preview URLs you use for auth, and keep `http://localhost:5173/` if you run locally. [Supabase redirect configuration](https://supabase.com/docs/guides/auth/redirect-urls)
7. On the deployed site, create a test account, confirm email or sign in with GitHub, create a habit, and check that its check-in and today’s affirmation survive a reload.

## Deploy to GitHub Pages

[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) deploys `main` to `https://yermukhamed0777.github.io/Hexis/` on every push and on manual dispatch. It builds with `HEXIS_BASE_PATH=/Hexis/` so asset URLs use the `/Hexis/` subpath, and it reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from Actions repository variables (**Settings → Secrets and variables → Actions → Variables**). Set those two variables before relying on account sync; with no values, `src/lib/supabase.ts` leaves the client unset and the build is guest-only. The separate **CI** workflow runs lint, build, and tests but does not gate this deployment.

The headers in [`vercel.json`](vercel.json) are Vercel configuration; the Pages workflow does not copy them into Pages configuration. The CSP assertions in `test/pwa.mjs` therefore describe the Vercel target, not the Pages target.

## Move data from the previous app

Guest habits, check-ins, and affirmations merge automatically when you sign in in the browser where you created them. A merge adds guest records alongside existing habits. If both journals have an affirmation on the same date, the account’s entry takes precedence.

When you sign in on the same site where you used the browser-only version, choose **Import data** if Hexis finds saved habits, check-ins, or affirmations. The import retains existing cloud entries and can be retried without duplicating records.

If you’re moving from a different address, such as the [previous GitHub Pages site](https://yermukhamed0777.github.io/Hexis/), open that address in the browser that holds your data. Paste the following into its developer console to download a local backup. On the new site, sign in and open **Settings → Data → Import JSON backup** to upload it.

```js
(() => {
  const backup = localStorage.getItem('hexis-store-v1')
  if (!backup) throw new Error('No Hexis backup was found in this browser.')
  const url = URL.createObjectURL(new Blob([backup], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'hexis-backup.json'
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
})()
```

## Back up and restore data

Use **Settings → Data** to export a JSON backup or CSV spreadsheet. To restore JSON, sign in and choose **Import JSON backup**. The preview lists habits, check-ins, and affirmations before you import. Restoring adds missing records, including numeric goals, schedules, notes, freezes, and archive history. Existing account entries take precedence when you import the same backup again.

If an account write fails, the app keeps the pending change in the current browser and retries after reopening the journal or reconnecting. When browser storage is unavailable, keep the tab open until sync finishes. Guest journals remain available offline after installation assets have loaded.

## How tracking works

- Dates follow the browser’s local time. A habit starts contributing to scheduled totals on its creation date. Earlier completions you add from habit history appear as optional check-ins.
- Daily and weekday habits count streaks in consecutive scheduled check-ins. Flexible goals count distinct completed days towards a Monday–Sunday target and measure streaks in weeks. The first week’s target is capped at the number of days left. Flexible goals appear in Today while the target is open, and the calendar counts their check-ins on the dates you logged them.
- Freeze an unfinished scheduled day from habit history to protect the streak. Frozen days stay outside completed totals. For weekly habits, one freeze excuses one missed weekly check-in and at least one real completion is still required: a past week with `4` targets, `1` completion and `3` freezes keeps the streak, while a week with no completion breaks it.
- Numeric goals are complete once the logged amount meets the target. Reminders run in the browser and can notify you once a day while the app is open.
- Today’s Focus moves partial goals and time-sensitive weekly targets up the queue. Complete a check-in and tap an energy tag or add a short reflection.
- **This week** shows scheduled check-ins and flexible weekly targets together. Open a past or current day to view its check-ins.
- Archive from **Habits → Active** and restore from **Habits → Archived**. Archive periods start on the current local date and end on the restore date. Paused dates create no missed goals. Earlier counts and streaks are preserved, and weekly quotas are capped at the active days in that week. Older archived habits whose archive start date is unknown keep their check-ins and their known scheduled totals in Insights, while staying out of Today while archived.
- Open a habit’s history and choose **Edit details** to change its name, icon, color, or category. These edits preserve the schedule, goal, and history.
- **Weekly Coach** in Insights summarizes the current week and opens the next due habit for a check-in. It uses the journal currently loaded in the app: the guest journal on this device, or your synced account journal.
- Insights includes rolling 90-day and 365-day heatmaps and shows 7-, 30-, and 100-day streak milestones for daily and weekday habits. Export your habits, check-ins, reflections, and affirmations as JSON or CSV from **Settings → Data**.

For the guided pilot, append `?pilot=events` to the app URL to reveal **Settings → Pilot counters**. They count page views, habits created, check-ins, and sign-ins locally; no journal text is stored or transmitted. The cohort plan and consent wording are in [`docs/pilot-7-day.md`](docs/pilot-7-day.md).

## Verify changes

```sh
npm ci
npm run lint -- --deny-warnings
npm run build
npm run test:logic
npm run test:rls
npm run test:integrity
```

The browser tests start Vite on a local port and use isolated Supabase HTTP fixtures.

```sh
npx playwright install chromium
npm run test:e2e
npm run test:pwa
npm run verify:pages
```

The install test uses the production build to verify the manifest, app icons, and guest launch offline. Run `npm run build` first. `npm run verify:pages` builds the `/Hexis/` subpath variant into `dist-pages/` and runs the same install checks against it, so both deployment targets are covered. `npm run test:logic` checks the outbox whitelist, guest-claim fallback, and streak/archive rules without a browser. `npm run test:integrity` drives ten reproducible journal-integrity scenarios (guest persistence, migration, two-session sync, offline replay, failed writes, export/import, permission denial, expiry, recovery notice and midnight rollover) with synthetic data and isolated fixtures. Device-width checks are simulated in Chromium, not verified on physical hardware.

To capture the deterministic demo frames used by the walkthrough, run `npm run demo` after `npm run build`; frames are written to the gitignored `shots/` directory. GitHub Pages deployment is gated on a green CI run; a manual workflow dispatch is the explicit bypass for hotfixes.

[MIT License](LICENSE)

# Habittism

Habittism is a private habit tracker and affirmation journal. Start immediately as a guest, build a blank journal one habit at a time or choose an optional starter pack, and sign in to sync across devices.

[Open Habittism](https://habittism.vercel.app/)

## Install and launch

Open the live app and choose **Install app** on the guest banner or in **Settings → App**. The browser can add a desktop, Start menu, or home-screen icon. Where supported, the app icon’s shortcuts open [Today’s Focus](https://habittism.vercel.app/?view=today) or the [habit calendar](https://habittism.vercel.app/?view=calendar).

Guest journals can reopen offline after the first visit completes. The app caches the interface and its static assets. Your guest journal stays in browser storage, and account sync uses the network.

Use **Ctrl+K** or **⌘K** to jump to a page, find a habit, or start an action. The search icon opens the same menu on touch devices.

## Run locally

1. Use Node.js 22.12 or newer and run `npm ci`.
2. Create a Supabase project. In its **SQL Editor**, run [supabase/schema.sql](supabase/schema.sql) once, then apply each SQL file in [supabase/migrations](supabase/migrations) in filename order:
   - `20261120090500_guest_merge_and_reflections.sql` (guest merge, check-in notes, and energy tags)
   - `20261121000000_add_archived_at.sql` (archive timestamp tracking)
   - `20261121090000_track_archive_periods.sql` (archive period intervals)
   - `20261122010000_import_modern_journal.sql` (lossless modern JSON import and archive period range validation)
   - `20261122020000_expand_habit_colors.sql` (18-color icon accent palette constraint)
   Projects that already have the base schema need only the unapplied migrations.
3. Copy [`.env.example`](.env.example) to `.env.local`. Set `VITE_SUPABASE_URL` to the Project URL and `VITE_SUPABASE_ANON_KEY` to its publishable or legacy anon key. Vite exposes these two values in the browser bundle. Keep Supabase service-role and secret keys in server environments.
4. In Supabase **Authentication → URL Configuration**, add `http://localhost:5173/` to **Redirect URLs**. Set the **Site URL** to that address while developing a local-only project. [Supabase redirect configuration](https://supabase.com/docs/guides/auth/redirect-urls)
5. Run `npm run dev` and open [the local app](http://localhost:5173/).

### Auth and email delivery

Email and password, email confirmation, magic links, password reset, and GitHub sign-in use Supabase Auth.
- For public email delivery, configure **Custom SMTP** in Supabase Authentication. The default mail service only delivers to authorized project team addresses. [Supabase SMTP setup](https://supabase.com/docs/guides/auth/auth-smtp)
- To enable GitHub sign-in, create a GitHub OAuth App. Use your Habittism URL as the homepage and copy the callback URL from Supabase’s **GitHub** auth provider into the OAuth App’s **Authorization callback URL**. Enable the provider in Supabase and enter the GitHub client ID and secret there. [Supabase GitHub sign-in setup](https://supabase.com/docs/guides/auth/social-sign-in/auth-github)
- **Leaked-password protection**: Under **Authentication → Attack Protection**, enable "Prevent use of leaked passwords" (HaveIBeenPwned check) to harden sign-ups and credential updates.

## Deploy on Vercel

1. Complete the Supabase schema and auth setup above. In Vercel, select **Add New → Project**, connect GitHub, and import `yermukhamed0777/Habittism`. If the repository is missing from the list, grant the Vercel GitHub App access to it. [Vercel GitHub integration](https://vercel.com/docs/git/vercel-for-github)
2. Leave **Root Directory** at the repository root and use the **Vite** preset. [vercel.json](vercel.json) sets `npm run build` and the `dist` output directory. Production headers configure Content Security Policy (CSP), `X-Content-Type-Options: nosniff`, and `X-Frame-Options: DENY`.
3. Under **Environment Variables**, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` before the first deploy. To enable the optional AI habit coach, add `GEMINI_API_KEY` in server-side environment variables. [Vercel environment variables](https://vercel.com/docs/environment-variables)
4. Deploy. Confirm that **Settings → Environments → Production → Branch Tracking** uses `main`. Future pushes to `main` will deploy to production. [Vercel branch tracking](https://vercel.com/docs/git#customizing-the-production-branch)
5. Copy the production URL from Vercel. In Supabase **Authentication → URL Configuration**, set it as **Site URL** and add the exact root URL with a trailing slash to **Redirect URLs**. Add any preview URLs you use for auth, and keep `http://localhost:5173/` if you run locally. [Supabase redirect configuration](https://supabase.com/docs/guides/auth/redirect-urls)
6. On the deployed site, create a test account, confirm email or sign in with GitHub, create a habit, and check that its check-in and today’s affirmation survive a reload.

## Move data and restore backups

Guest habits, check-ins, and affirmations merge automatically when you sign in in the browser where you created them. A merge adds guest records alongside existing habits without duplicating entries. If both journals have an affirmation on the same date, the account’s entry takes precedence.

### Modern JSON backup and restore

Export your full journal at any time from **Settings → Data → Export JSON**. The modern export contains all habit configurations, numeric goals and units, check-in history, reflection notes, energy moods, streak freezes, archive intervals, and daily affirmations.

To restore a backup, open **Settings → Data → Import browser backup** and select your `.json` file:
- The importer automatically detects modern vs legacy formats.
- Previews the exact record breakdown (habits, numeric goals, archive periods, check-ins, affirmations) before writing.
- Validates all records at the application and database boundaries.
- Retains existing cloud entries and executes idempotently.
- Guest users can also restore backups directly into local storage.

### Legacy browser backups

If you’re moving from the [previous GitHub Pages site](https://yermukhamed0777.github.io/Habittism/), open that address in the browser that holds your data and paste the following into its developer console to download a local backup:

```js
(() => {
  const backup = localStorage.getItem('habittism-store-v1')
  if (!backup) throw new Error('No Habittism backup was found in this browser.')
  const url = URL.createObjectURL(new Blob([backup], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'habittism-backup.json'
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
})()
```

Upload the downloaded file in **Settings → Import browser backup**.

## How tracking works

- Dates follow the browser’s local time. A habit starts contributing to scheduled totals on its creation date. Earlier completions you add from habit history appear as optional check-ins.
- Daily and weekday habits count streaks in consecutive scheduled check-ins. Flexible goals count distinct completed days towards a Monday–Sunday target and measure streaks in weeks. The first week’s target is capped at the number of days left. Flexible goals appear in Today while the target is open, and the calendar counts their check-ins on the dates you logged them.
- Freeze an unfinished scheduled day from habit history to protect the streak. Frozen days stay outside completed totals. For weekly habits, a freeze can excuse one missed day when calculating the streak after the week ends.
- Numeric goals are complete once the logged amount meets the target. Reminders run in the browser and can notify you once a day while the app is open.
- Today’s Focus moves partial goals and time-sensitive weekly targets up the queue. Complete a check-in and tap an energy tag or add a short reflection.
- **This week** shows scheduled check-ins and flexible weekly targets together. Open a past or current day to view its check-ins.
- Archive from **Habits → Active** and restore from **Habits → Archived**. Archive periods start on the current local date and end on the restore date. Paused dates create no missed goals. Earlier counts and streaks are preserved, and weekly quotas are capped at the active days in that week.
- Open a habit’s history and choose **Edit details** to change its name, icon, color (from 18 visually distinct accents), or category. These edits preserve the schedule, goal, and history.
- Insights includes rolling 90-day and 365-day heatmaps, weekly completion trends, streak milestones (7, 30, 100 days), and the **Weekly Habit Coach**.

## Weekly Habit Coach

The **Weekly Habit Coach** in Insights provides a grounded, realistic reflection and one adjustment for the week ahead:
- **Deterministic summary**: Always computed locally from aggregate weekly consistency rates and active habits. No network calls or third-party providers required.
- **Opt-in AI suggestion**: Authenticated users can request an AI adjustment via the same-origin `/api/coach` Vercel function.
- **Privacy by default**: Only aggregate numbers (habit count, weekly completion rate, top category) are transmitted. Journal affirmations, daily reflection notes, emails, and full history are strictly kept private on the user's device.
- **Rate limiting and safety**: Server-side per-user rate limiting (10 requests/hour), schema bounds validation, and graceful fallback to the deterministic summary if the provider is unavailable or unconfigured.

## Verify changes

```sh
npm ci
npm run lint -- --deny-warnings
npm run build
npm run test:rls
```

The browser test starts Vite on a local port and uses isolated Supabase HTTP fixtures:

```sh
npx playwright install chromium
npm run test:e2e
npm run test:pwa
```

The install test uses the production build to verify the manifest, app icons, and guest launch offline. Run `npm run build` first.

## Rollback guide

- **Application rollback**: In the Vercel Dashboard, select the previous stable deployment (`3a8d879`) and click **Promote to Production** for an instant instant zero-downtime rollback.
- **Database compatibility**: All migrations (`20261122010000_import_modern_journal.sql` and `20261122020000_expand_habit_colors.sql`) are forward-compatible and additive. Existing records are preserved without data destruction.

[MIT License](LICENSE)

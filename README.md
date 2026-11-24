# Hexis

Hexis is a private habit tracker and affirmation journal. Start immediately as a guest, build a blank journal one habit at a time or choose an optional starter pack, and sign in to sync across devices.

[Open Hexis](https://hexis.vercel.app/)

## Install and launch

Open the live app and choose **Install app** on the guest banner or in **Settings → App**. The browser can add a desktop, Start menu, or home-screen icon. Where supported, the app icon’s shortcuts open [Today’s Focus](https://hexis.vercel.app/?view=today) or the [habit calendar](https://hexis.vercel.app/?view=calendar).

Guest journals can reopen offline after the first visit completes. The app caches the interface and its static assets. Your guest journal stays in browser storage, and account sync uses the network.

Use **Ctrl+K** or **⌘K** to jump to a page, find a habit, or start an action. The search icon opens the same menu on touch devices.

## Run locally

1. Use Node.js 22.12 or newer and run `npm ci`.
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
- Freeze an unfinished scheduled day from habit history to protect the streak. Frozen days stay outside completed totals. For weekly habits, a freeze can excuse one missed day when calculating the streak after the week ends.
- Numeric goals are complete once the logged amount meets the target. Reminders run in the browser and can notify you once a day while the app is open.
- Today’s Focus moves partial goals and time-sensitive weekly targets up the queue. Complete a check-in and tap an energy tag or add a short reflection.
- **This week** shows scheduled check-ins and flexible weekly targets together. Open a past or current day to view its check-ins.
- Archive from **Habits → Active** and restore from **Habits → Archived**. Archive periods start on the current local date and end on the restore date. Paused dates create no missed goals. Earlier counts and streaks are preserved, and weekly quotas are capped at the active days in that week. Older archived habits with no recorded start date retain their check-ins and use only dates with known schedules for totals.
- Open a habit’s history and choose **Edit details** to change its name, icon, color, or category. These edits preserve the schedule, goal, and history.
- **Weekly Coach** in Insights summarizes the current week and opens the next due habit for a check-in. It uses your journal on this device.
- Insights includes rolling 90-day and 365-day heatmaps and celebrates 7-, 30-, and 100-day streaks for daily and weekday habits. Export your habits, check-ins, reflections, and affirmations as JSON or CSV from **Settings → Data**.

## Verify changes

```sh
npm ci
npm run lint -- --deny-warnings
npm run build
npm run test:rls
```

The browser test starts Vite on a local port and uses isolated Supabase HTTP fixtures.

```sh
npx playwright install chromium
npm run test:e2e
npm run test:pwa
```

The install test uses the production build to verify the manifest, app icons, and guest launch offline. Run `npm run build` first.

[MIT License](LICENSE)

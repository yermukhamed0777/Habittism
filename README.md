# Habittism

Habittism is a private habit tracker and affirmation journal. Create habits from a blank slate, check in on the schedules you set, and explore progress in a calendar or in Insights.

## Run locally

1. Use Node.js 22.12 or newer and run `npm ci`.
2. Create a Supabase project. In its **SQL Editor**, open a new query and run the full contents of [supabase/schema.sql](supabase/schema.sql) once. This creates the tables, ownership policies, and import function.
3. Copy [`.env.example`](.env.example) to `.env.local`. Set `VITE_SUPABASE_URL` to the Project URL and `VITE_SUPABASE_ANON_KEY` to its publishable or legacy anon key. Vite exposes these two values in the browser bundle. Keep Supabase service-role and secret keys in server environments.
4. In Supabase **Authentication → URL Configuration**, add `http://localhost:5173/` to **Redirect URLs**. Set the **Site URL** to that address while developing a local-only project. [Supabase redirect configuration](https://supabase.com/docs/guides/auth/redirect-urls)
5. Run `npm run dev` and open [the local app](http://localhost:5173/).

Email and password, email confirmation, magic links, password reset, and GitHub sign-in use Supabase Auth. For public email delivery, configure **Custom SMTP** in Supabase Authentication. The default mail service only delivers to authorized project team addresses. [Supabase SMTP setup](https://supabase.com/docs/guides/auth/auth-smtp)

To enable GitHub sign-in, create a GitHub OAuth App. Use your Habittism URL as the homepage and copy the callback URL from Supabase’s **GitHub** auth provider into the OAuth App’s **Authorization callback URL**. Enable the provider in Supabase and enter the GitHub client ID and secret there. [Supabase GitHub sign-in setup](https://supabase.com/docs/guides/auth/social-sign-in/auth-github)

## Deploy on Vercel

1. Complete the Supabase schema and auth setup above. In Vercel, select **Add New → Project**, connect GitHub, and import `yermukhamed0777/Habittism`. If the repository is missing from the list, grant the Vercel GitHub App access to it. [Vercel GitHub integration](https://vercel.com/docs/git/vercel-for-github)
2. Leave **Root Directory** at the repository root and use the **Vite** preset. [vercel.json](vercel.json) sets `npm run build` and the `dist` output directory. The app uses in-page navigation and returns from sign-in at the root URL.
3. Under **Environment Variables**, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` before the first deploy. In an existing project, use **Settings → Environment Variables**, select **Production**, and redeploy after saving. Add the values to **Preview** if you want preview deployments to connect to Supabase. [Vercel environment variables](https://vercel.com/docs/environment-variables)
4. Deploy. Confirm that **Settings → Environments → Production → Branch Tracking** uses `main`. Future pushes to `main` will deploy to production. [Vercel branch tracking](https://vercel.com/docs/git#customizing-the-production-branch)
5. Copy the production URL from Vercel. In Supabase **Authentication → URL Configuration**, set it as **Site URL** and add the exact root URL with a trailing slash to **Redirect URLs**. Add any preview URLs you use for auth, and keep `http://localhost:5173/` if you run locally. [Supabase redirect configuration](https://supabase.com/docs/guides/auth/redirect-urls)
6. On the deployed site, create a test account, confirm email or sign in with GitHub, create a habit, and check that its check-in and today’s affirmation survive a reload.

## Move data from the previous app

When you sign in on the same site where you used the browser-only version, choose **Import data** if Habittism finds saved habits, check-ins, or affirmations. The import retains existing cloud entries and can be retried without duplicating records.

If you’re moving from a different address, such as the [previous GitHub Pages site](https://yermukhamed0777.github.io/Habittism/), open that address in the browser that holds your data. Paste the following into its developer console to download a local backup. On the new site, sign in and open **Settings → Import browser backup** to upload it.

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

## How tracking works

- Dates follow the browser’s local time. A habit starts contributing to scheduled totals on its creation date. Earlier completions you add from habit history appear as optional check-ins.
- Daily and weekday habits count streaks in consecutive scheduled check-ins. Flexible goals count distinct completed days towards a Monday–Sunday target and measure streaks in weeks. The first week’s target is capped at the number of days left. Flexible goals appear in Today while the target is open, and the calendar counts their check-ins on the dates you logged them.
- Freeze an unfinished scheduled day from habit history to protect the streak. Frozen days stay outside completed totals. For weekly habits, a freeze can excuse one missed day when calculating the streak after the week ends.
- Numeric goals are complete once the logged amount meets the target. Reminders run in the browser and can notify you once a day while the app is open.

## Verify changes

```sh
npm ci
npm run lint
npm run build
```

To run the browser smoke test with isolated Supabase HTTP fixtures, install Playwright temporarily, download Chromium, and run the test. The test starts Vite on a local port.

```sh
npm install --no-save playwright
npx playwright install chromium
npm run test:e2e
```

[MIT License](LICENSE)

# Hexis — five-minute walkthrough

A repeatable script for a guided demo. The same steps are driven automatically by `npm run demo`, which writes screenshots to `shots/` for a narrated recording. Run `npm run build` first when you want the production build; the script itself uses the Vite dev server with mocked Supabase fixtures and never touches a live account.

Timing is a guide, not a measurement.

| Time | Action | What to point out |
| --- | --- | --- |
| 0:00 | Open the live app or `http://localhost:5173/`. Choose **Try Hexis as a guest**. | No email, no signup wall. The journal is already usable. |
| 0:30 | **New habit** → name it `Morning walk` → **Create habit**. | One field to start; schedule defaults to every day. |
| 1:00 | On **Today**, press **Complete Morning walk**. | The check-in is optimistic and the status line shows sync state. |
| 1:30 | Open **Calendar**, hover yesterday, then open the day. | Local-time dates, day counts, and history backfill. |
| 2:00 | **Settings → Habit reminders** → enable at `00:00`. | Notifications are local and deduplicated once per day. |
| 2:30 | **Install app** → read the install dialog. | Offline PWA: the interface and assets are cached after the first visit. |
| 3:00 | Turn the network off, reload `?view=today`. | The guest journal, including affirmations, reopens offline. |
| 3:30 | Write a daily affirmation and reload. | Guest data persists in the browser with no account. |
| 4:00 | **Sign in or sign up** (magic link, password, or GitHub). | The guest journal merges into the account; nothing is duplicated. |
| 4:30 | **Insights → Weekly Coach** and **Settings → Data → Export JSON**. | Deterministic coach, and an explicit export path. |
| 5:00 | Close with the privacy statement. | Guest-first, owner-scoped sync, no journal content in telemetry. |

## Capture command

```sh
npm run build
npm run demo
```

`shots/` is gitignored so demo frames never enter the repository. The recording itself is a human step: combine the frames with narration, and store the resulting video outside the repo or in the CV portfolio.

## What is deliberately not shown

- Real user data or account credentials — the suite uses fixed fixtures.
- Any live Supabase project — HTTP calls are intercepted locally.
- Claimed usage metrics — none are measured; see `plan/strategy.md`.

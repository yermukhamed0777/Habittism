# Hexis — recovery guide (release candidate)

This guide describes what is actually implemented. It uses synthetic examples only and records no user data. Account deletion is **not** available in v0.1; deleting a habit and exporting a backup are.

## 1. Guest journal stays on this device

- Guest habits, check-ins and affirmations live in `localStorage` under `hexis-guest-v1`.
- They persist across reloads and offline reopens after the first visit installs the app shell.
- Clearing site data removes them. Export a backup first if the browser may be reset.

**Recover:** reopen the app on the same browser profile. There is no server copy until you sign in.

## 2. Guest → account migration

- Signing in claims the guest journal exactly once, merges it into the account, and clears the guest claim.
- Re-signing in does not duplicate habits. The deterministic check is in `npm run test:integrity`.
- If the merge fails, the account load shows a retry screen; the guest journal remains until the merge succeeds.

**Recover:** use **Try again** on the load-error screen. Do not clear browser storage.

## 3. Failed writes and offline edits

- Pending changes are queued in `localStorage` under `hexis-outbox-v1:<user-id>:`.
- A successful notification or write removes its entry; a failed one stays and is retried on reopen, on reconnect, or with **Retry sync**.
- `npm run test:logic` proves a malformed outbox entry cannot erase the journal; `npm run test:integrity` proves offline edits replay exactly once.

**Recover:** reopen the journal or press **Retry sync**. Keep the tab open while `Saving changes…` is shown if browser storage is unavailable.

## 4. Export and import

- **Settings → Data → Export JSON** writes `hexis-<date>.json` containing habits, check-ins, affirmations, numeric goals, schedules, notes, freezes and archive periods.
- **Settings → Data → Export CSV** writes a spreadsheet; a tracker backup contains notes and must be kept private.
- **Settings → Data → Import JSON backup** is available only when signed in. It adds missing records and keeps existing account entries on repeat imports.

**Recover:** sign in, import the JSON backup, then reload. Repeat import is safe; it does not duplicate records. The round trip is asserted in `npm run test:integrity`.

## 5. Deletion

- **Habit deletion:** open a habit's history and choose **Delete habit**. The habit and its check-ins are removed locally and remotely; confirm the dialog before it proceeds.
- **Account deletion:** not implemented in this release (`M3-2`). To remove account data, delete habits individually and contact the project owner for database-level removal. Do not describe self-service deletion to pilot participants.

## 6. Authentication expiry and recovery

- An expired session leaves pending changes in the outbox rather than discarding them. Sign in again and the queue replays.
- Password recovery: **Forgot password?** on the sign-in page sends a reset link when email delivery is configured. The UI reports the request honestly; actual delivery requires owner-controlled SMTP and is not verified by automated tests.
- If a reset link does not arrive, check Supabase Auth → URL Configuration and Custom SMTP. Do not disable email confirmation as a workaround.

## 7. Dates, time zones and midnight

- Dates are local `YYYY-MM-DD` keys. A check-in made at 23:59 stays on that date after a reload or a time-zone change; the calendar groups by the stored key, not the device clock.
- `npm run test:integrity` sets a fixed clock across midnight and asserts one dated check-in and a consistent calendar.

## 8. PWA and notifications

- Install from **Settings → App** or the guest banner. The shell and assets are cached after the first visit.
- A new deployed build may need all tabs closed before the updated service worker takes control; this is a known v0.1 limitation, recorded in `plan/strategy.md`.
- Notification permission denial is reported in Settings; a failed delivery is retried later the same day and is not counted as sent. Both cases are exercised by `npm run test:e2e` and `npm run test:integrity`.

## 9. Verification commands

```sh
npm ci
npm run lint -- --deny-warnings
npm run build
npm run test:logic
npm run test:rls
npm run test:e2e
npm run test:integrity
npm run test:pwa
npm run verify:pages
npm run check:live   # against the deployed origin
```

No command above needs a real account, real email or private journal content.

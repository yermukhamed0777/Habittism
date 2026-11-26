# Hexis — seven-day pilot (ready-to-run plan)

This document is the handoff for a **fixed cohort of participants** using Hexis for seven consecutive days. Everything an assistant can prepare is done: the code, the build matrix, the verification suite, the content-free counters, the walkthrough script, and the failure-reporting format. The remaining steps need a human recruiter/observer.

Product usage has **not** been measured. No numbers in this document are results.

## Goal

Observe whether a small, fixed group can start a guest journal unaided, keep a habit for seven days, and understand the optional sign-in. Record failures as backlog IDs with enough detail to reproduce them. Do not send journal content anywhere.

## Cohort and consent

- **Five participants**, chosen once before Day 1 and kept fixed for all seven days. No replacements mid-pilot unless someone withdraws.
- Tell each participant, in writing: Hexis stores guest data in their browser; signing in syncs a copy to Supabase; they can export a JSON backup and delete individual habits; **there is no self-service account deletion yet** (tracked as `M3-2`); the pilot collects only four anonymous counters and never reads their habit names, notes, or affirmations.
- Get explicit permission before observing a session or taking a screen recording.
- Give participants this link: the deployed app plus `?pilot=events`, for example `https://habittism.vercel.app/?pilot=events`. The Vercel project is named `habittism`; `hexis.vercel.app` is an unrelated third-party app and must not be shared. That query parameter reveals **Settings → Pilot counters**, where they can turn local counters on or off and see the four counts.

## What is collected

Only these event names, with a timestamp and nothing else: `page_view`, `habit_created`, `checkin`, `sign_in`. The event set is defined in [`src/lib/pilotEvents.ts`](../src/lib/pilotEvents.ts) and asserted content-free by `npm run test:e2e`.

Counters stay in the participant's `localStorage` under `hexis-pilot-counters`. Ask participants to report the numbers at the end; do not add a telemetry backend. If anyone is uncomfortable, they can disable counters in Settings.

To read them manually, paste this into the browser console:

```js
JSON.parse(localStorage.getItem('hexis-pilot-counters') || '{}')
```

## Pre-flight (already automated; run once to confirm)

```sh
npm ci
npm run lint -- --deny-warnings
npm run build
npm run test:logic
npm run test:rls
npm run test:e2e
npm run test:pwa
npm run verify:pages
```

All commands must pass, plus `npm run test:integrity` for the data-integrity scenarios and `npm run check:live` against the deployed origin. CI must be green before the pilot build is used. The Pages workflow is gated on a successful CI run. Supported recovery paths are in [`recovery-guide.md`](recovery-guide.md).

Device coverage in the automated suite is **simulated** at 375/320/303 px in Chromium. It is not a physical-phone, tablet or assistive-technology verification; that remains a human step.

## Seven-day schedule

| Day | Observer action | What to note |
| --- | --- | --- |
| 0 | Send the link and the consent note. Confirm each participant can open the app. | Setup failures, browser/OS, access complaints. |
| 1 | Ask them to start as a guest and create one habit **without help**. Time the attempt. | Where they hesitate; any need to ask what a control does. |
| 2 | Ask them to complete the habit and find yesterday in Calendar. | Check-in clarity, date confusion. |
| 3 | Ask them to write an affirmation and confirm it survives a reload. | Trust in autosave. |
| 4 | Ask them to install the app and reopen offline. | Install friction, offline surprises. |
| 5 | Ask them to sign in (or decline) and explain what changes. | Signup wall concerns, merge surprises. |
| 6 | Let them use the app unprompted. | Voluntary behaviours, questions they ask. |
| 7 | Collect the four counters and a short interview. Ask what they would change. | Retention intent, blockers, quotes (with permission). |

## Recording a failure

For each observed failure, add a new stable ID to [`plan/backlog.md`](../plan/backlog.md) with:

1. A one-line title and the participant (anonymised, e.g. `P2`).
2. The exact steps, browser, viewport, and day of the pilot.
3. Expected vs observed behaviour.
4. A `Done when` criterion that a verification command can prove.

Do not edit an existing ID. Append a `plan/progress.md` entry with the sessions and the commands used to verify any fixes.

## Decision gate at the end

- **Go:** participants completed the Day 1 guest task unaided, the seven-day flow produced no P0 defects, and no event contained journal content.
- **No-go / iterate:** any P0 is open, a participant could not start without help, or counters emitted unexpected fields. Fix the backlog item, re-run the full suite, and only then repeat with a new cohort.

## What is intentionally left to a human

Recruiting the five participants, obtaining consent, running the seven sessions, deciding which feedback changes the product, recording a narrated video from `npm run demo`, and recording any business or pricing decision in `plan/decisions.md`. None of these can be completed by the assistant, and none have been claimed as done here.

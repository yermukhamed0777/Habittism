<div align="center">

<img src="public/favicon.svg" width="88" height="88" alt="Habittism logo" />

# Habittism

**Build the habits that build you.**

A professional habit tracker — web app, installable as a PWA — with a
GitHub-style contribution calendar and a modern *liquid glass* interface.

[Live preview](https://yermukhamed0777.github.io/Habittism/) · [Report an issue](https://github.com/yermukhamed0777/Habittism/issues) · [MIT License](./LICENSE)

</div>

---

## ✨ Highlights

### 📅 Contribution calendar
A full 53-week heatmap, modelled on the GitHub contribution graph. Each cell
represents one day; intensity reflects **the ratio of scheduled habits you
actually completed**. Scroll back through previous years with the arrow
controls.

Levels are assigned by *rank* rather than fixed thresholds, so the map always
uses its full colour range — exactly how GitHub breaks ties in its own graph.

### 🧊 Liquid glass design system
Everything is built on a reusable frosted-glass primitive:

- `backdrop-filter: blur() saturate()` over a slowly drifting aurora field
- Inner top-highlight + bottom-shadow for real depth
- An animated specular sheen that sweeps across each panel
- Fine film grain and a faint grid for texture
- Fully responsive — the same components serve desktop and mobile

### 🧠 Real habit semantics
This is not a checklist with a counter bolted on.

| Concept | Behaviour |
| --- | --- |
| **Scheduling** | Every habit has a weekly schedule (Mon/Wed/Fri, daily, …). |
| **Streaks** | Measured across *scheduled* days only — a Mon/Wed/Fri habit is not broken by Tuesday. |
| **Rest days** | Habits that aren't due today are marked **Rest** and don't count against you. |
| **Consistency** | Completions ÷ scheduled opportunities, not ÷ calendar days. |
| **Today** | Progress ring measures scheduled completions only. |

### 📊 Dashboard
- Hero panel with a live streak dial
- Four KPI cards (current streak, perfect days, consistency, total check-ins)
- Weekly momentum area chart across the last 14 weeks
- Per-habit cards with streaks, weekly progress bars and lifetime consistency

### ✏️ Full interactivity
- Create habits with an icon, category, accent colour and weekly target
- Toggle any habit on the current day, from either the Today panel or the card
- Delete habits (with a confirmation prompt)
- Open the greeting page to write a daily affirmation. New profiles start empty.
- Hover or focus a calendar date for counts, or select it for details.
- Open a habit’s history to add or remove check-ins on individual dates.

### 📦 Installable
Ships as a PWA with a web manifest and maskable icons — add it to your home
screen and it behaves like a native app.

---

## 🚀 Getting started

```bash
git clone https://github.com/yermukhamed0777/Habittism.git
cd Habittism
npm install
npm run dev
```

Open <http://localhost:5173>.

### Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server with HMR |
| `npm run build` | Type-check with `tsc -b`, then build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run oxlint |

---

## 🏗️ Tech stack

| Layer | Choice |
| --- | --- |
| Framework | React 19 + TypeScript |
| Build | Vite 8 |
| Styling | Tailwind CSS v4 (CSS-first `@theme` tokens) |
| Animation | Motion (Framer Motion) |
| Charts | Recharts |
| State | Zustand + `persist` middleware (localStorage) |
| Icons | Lucide React |
| Dates | date-fns |

### Architecture

```
src/
├── components/            # Presentational components
│   ├── ActivityChart.tsx       # Recharts momentum area chart
│   ├── AddHabitModal.tsx       # Create-habit dialog
│   ├── Background.tsx          # Aurora field + grain + grid
│   ├── ContributionCalendar.tsx# 53-week heatmap
│   ├── GlassPanel.tsx          # Glass primitive + SectionHeading
│   ├── HabitCard.tsx           # Individual habit card
│   ├── HabitIcon.tsx           # Icon registry
│   ├── Hero.tsx                # Hero panel + streak dial
│   ├── StatCard.tsx            # KPI card
│   ├── TodayPanel.tsx          # Today's checklist + progress ring
│   └── TopBar.tsx              # Sticky glass navigation
├── data/seed.ts          # Weekly schedules and legacy sample identifiers
├── hooks/useHabitStats.ts# Stats, streaks, day aggregation
├── lib/
│   ├── dates.ts           # Calendar grid, streak & date helpers
│   └── utils.ts           # `cn()` class merger
├── store/useHabitStore.ts# Zustand store with persistence
├── types.ts               # Domain types
├── App.tsx                # Page composition
└── index.css              # Design tokens + liquid glass system
```

### Design tokens

Tokens live in `src/index.css` under `@theme`, so they generate utilities
automatically:

```css
--color-ink-950: #05060a;   /* canvas            */
--color-iris-500: #8b5cf6;  /* primary accent   */
--color-aqua-400: #22d3ee;  /* secondary accent */
--color-mist-100: #e9ecf4;  /* primary text     */
```

---

## Local data

New profiles start empty. The greeting page saves affirmations by local date.
The dashboard stores each habit and its check-ins in this browser profile.
Clear in the header removes habits, check-ins and affirmations after confirmation.

---

## 🛣️ Roadmap

- [x] Contribution calendar with year navigation
- [x] Liquid glass design system
- [x] Scheduled habits with schedule-aware streaks
- [x] Weekly momentum analytics
- [x] PWA manifest + installable
- [ ] Cloud sync & cross-device history
- [ ] Habit templates & streak freezes
- [ ] Reminders and notification scheduling
- [ ] Native app wrappers (React Native / Capacitor)

---

## 👤 Author

**Yermukhamed TUKTIBAY** — Materials Science and Engineering, City University of Hong Kong

---

<div align="center">
  <sub>MIT License · Built with React, Tailwind CSS and Motion</sub>
</div>

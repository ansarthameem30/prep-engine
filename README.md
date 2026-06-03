# Prep Engine

**Prep Engine** is a production-ready study platform for structured interview prep curricula. It loads lessons and code files dynamically, tracks progress locally, and never modifies your source content.

## Features

| Area | Capabilities |
|------|----------------|
| **Dashboard** | Overall progress, streak, XP, weekly chart, continue learning |
| **Roadmap** | 60-day grid, timeline, and phase views with lock/unlock states |
| **Reader** | Markdown lessons + syntax-highlighted code (`.js`, `.ts`, `.tsx`, `.py`, …) |
| **Tasks** | Interactive checklists (stored separately from source files) |
| **Search** | Instant search across titles, paths, headings, excerpts (`Ctrl+K`) |
| **Analytics** | Completion rate, study time, weekly/monthly charts |
| **Bookmarks & Notes** | Personal study layer in localStorage |
| **Gamification** | XP, streaks, achievements |
| **Settings** | Theme, reading prefs, export/reset data |

## Content setup

```text
prep-engine/  (this app folder: sprint-platform)
└── content/     ← import your full curriculum here
```

```bash
npm run sync-content   # one-time copy from ../60-day-sprint
npm run dev
```

Until `content/` has enough files, the app uses `../60-day-sprint/` automatically.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build + copy `content/` → `dist/content/` |
| `npm run preview` | Preview production build |
| `npm run sync-content` | Copy legacy sprint into `content/` |
| `npm run lint` | ESLint |

## Deploy

**Vercel / Netlify:** set root to this folder (`sprint-platform`), build `npm run build`, output `dist`.

**GitHub Pages:** set `VITE_BASE_PATH=/your-repo-name/` before build (see `.env.example`).

## Production checklist

- [x] Error boundary + 404 page
- [x] SPA routing with deploy rewrites
- [x] Security headers (Vercel)
- [x] Dynamic content loading (small manifest, on-demand files)
- [x] localStorage export / reset
- [x] Legacy storage migration from Sprint Studio keys
- [x] Accessibility: skip link, landmarks, aria labels
- [x] PWA manifest + meta tags

## Tech stack

React 19 · TypeScript · Vite · Tailwind · Zustand · React Router · React Markdown · Recharts · Framer Motion

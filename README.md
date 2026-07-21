# Quizwright — Frontend

Review interface for [Quizwright-BE](https://github.com/hariharran/Quizwright-BE):
generate a quiz from an ingested lesson transcript and inspect the result.

It is deliberately a **review** tool, not a quiz-taking app. The person using it
is judging whether the generated questions are good, so answers are hidden by
default, every card shows the transcript passage it came from, and the
retrieval diagnostics are on screen rather than buried in the response.

## Stack

React 18 + Vite. Two runtime dependencies (`react`, `react-dom`) — no UI
framework, no CSS framework. ~330 lines of hand-written CSS carries the design
tokens, light/dark themes and layout. Production bundle: ~50 kB gzipped.

## Run locally

```bash
npm install
npm run dev          # http://localhost:5173
```

The dev server proxies API paths (`/generate-quiz`, `/ingest`, `/lessons`,
`/health`, `/debug`) to `http://127.0.0.1:8123`, so **no CORS is involved in
development**. Start the backend first:

```bash
# in the Quizwright-BE checkout
cd backend && uvicorn app.main:app --port 8123
```

Point the proxy elsewhere with `VITE_API_TARGET`.

## Build

```bash
npm run build        # emits dist/
npm run preview      # serve the build locally
```

## Deploy

Any static host. `vercel.json` and `netlify.toml` are both included, each with
the SPA rewrite so deep links render the app instead of a 404.

**Vercel:** import the repo — framework auto-detects as Vite. Then set the
environment variable:

```
VITE_API_BASE=https://<your-api>.onrender.com
```

Vite inlines env vars at build time, so **change it and redeploy** — editing it
without a rebuild has no effect.

Finally, allow this origin on the API by setting `CORS_ORIGINS` in the backend's
environment to the deployed frontend URL.

## Layout

```
src/
├─ App.jsx                    state, generate/ingest flows, page states
├─ api.js                     fetch wrapper; unwraps the API error envelope
├─ styles.css                 design tokens, light/dark, layout
└─ components/
   ├─ Controls.jsx            lesson, difficulty, count, types, transcript input
   ├─ CoverageStrip.jsx       which transcript passages the quiz drew from
   └─ QuestionCard.jsx        one question, with reveal
```

## Notes on the design

- **Coverage strip** — one segment per transcript passage, lit where the quiz
  drew from. It answers "did this cover the whole lesson or just the intro?",
  which a chunk count cannot. Hovering a card lights its segment; clicking a lit
  segment jumps to its question.
- **Monospace for data, sans for prose** — the subject is developer tooling
  (MCP config files, APIs), so monospace is the vernacular of its world.
- **Amber means one thing** — revealed answers, and nothing else.
- Responsive to 390 px, dark mode, visible keyboard focus, and
  `prefers-reduced-motion` respected.

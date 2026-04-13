# FINVEST — product brief

## Problem

Many first-time investors **under-save or avoid markets** because downside feels salient and poorly quantified. FINVEST targets that gap with **simulation**, **behavioral measurement**, and **plain-language explanations** so users build intuition before they allocate real money.

## Design principles

1. **No shame, clear numbers** — Fear scores and allocations are framed as learning tools, not judgments.
2. **Time is signal** — Hesitation in timed flows is a weak but useful proxy for deliberation vs. impulsivity (combined with answers).
3. **Show distributions** — Monte Carlo-style views communicate uncertainty better than a single forecast.

## Stack (as implemented)

| Layer | Technology |
|-------|------------|
| UI | React, Vite, Tailwind CSS, Framer Motion, Lucide |
| Charts | Recharts, TradingView Lightweight Charts |
| Auth / data | Supabase (PostgreSQL + Auth) |
| ML / logic | TypeScript/JavaScript modules under `ML/` and `FRONTEND/src/lib/` |
| LLM | Groq (OpenAI-compatible) and/or Google Gemini via `FRONTEND/api/chat.js` |
| Optional API | Express in `BACKEND/` |

## Feature areas (high level)

- **Onboarding & quizzes** — Emotional readiness pillars; timed “Decode Your Finance Self” assessment; fear score and cluster assignment.
- **Dashboard** — Risk sandbox, market-aware widgets, behavioral sections; chat when LLM env is configured.
- **Simulation** — Scenario and path visualizations (see `ML/` and dashboard components).

Exact scoring for quizzes is specified in [`QUIZ_CALCULATIONS.md`](QUIZ_CALCULATIONS.md).

## Suggested team split (four people)

| Focus | Owns |
|-------|------|
| **Frontend** | Pages, layout, accessibility, chart UX, API calls to same-origin `/api/*` |
| **Backend / data** | Supabase schema, RLS, Express routes if used, env hygiene |
| **ML & product logic** | Fear score, clustering, Monte Carlo parameters, copy that matches math |
| **Integration** | Vercel env, end-to-end demo path, README accuracy |

## Algorithms (summary)

- **Fear score** — Starts from a baseline; answer deltas and hesitation statistics adjust it, then clamp to 1–100.
- **Clusters** — Nearest-centroid in a normalized feature space (fear, patience, impulse, planning).
- **Allocation bands** — Discrete stock/bond/cash mixes keyed off fear score ranges.
- **Monte Carlo** — Many simulated paths → percentiles and loss-relevant summaries for visualization.

Details differ per module; source of truth is code in `FRONTEND/src/lib/` and `ML/`.

## Commands

```bash
cd FRONTEND && npm install && npm run dev
```

```bash
cd BACKEND && npm install && npm start
```

```bash
# Production build (from frontend)
cd FRONTEND && npm run build
```

## Demo narrative (short)

Landing → onboarding / quiz → reveal fear score + profile → portfolio / simulation views → (optional) chat when keys are set. Keep one **happy path** rehearsed end-to-end.

## Pitfalls

- **CORS** — Prefer same-origin `FRONTEND/api` on Vercel over a separate origin unless `BACKEND` is explicitly configured.
- **Secrets** — LLM and Supabase service keys belong in server/env or Vercel project settings, not `VITE_*` (except public Supabase anon key).
- **404 on `/api/chat`** — Fix deploy root and presence of `api/` in the built project (see root `README.md`).

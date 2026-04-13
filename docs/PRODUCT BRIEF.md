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

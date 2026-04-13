# FINVEST frontend

React 19 + Vite 8 + Tailwind CSS 4. The app is the main surface for onboarding, dashboard, risk sandbox, charts (Lightweight Charts + Recharts), and Supabase-backed auth/profile.

## Theory (UI layer)

The UI is built around **transparent feedback**: simulations and quizzes turn abstract “risk” into scores, bands, and allocations users can revisit. Charts and copy are labeled **educational**, not financial advice—appropriate for a learning product.

## Setup

```bash
cd FRONTEND
npm install
cp .env.example .env
```

Edit `.env`: Supabase URL/key, optional market keys, and (for local chat) `GROQ_API_KEY` / Gemini keys as described in `.env.example`. Restart `npm run dev` after env changes—Vite reads env at startup.

**Node:** `>=20.19.0 <25` (see `package.json` `engines`).

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Vite dev server (includes dev proxy for Yahoo chart path—see `vite.config.js`) |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve `dist/` locally |
| `npm run lint` | ESLint |

## Serverless routes (Vercel / compatible hosts)

| Route | Purpose |
|-------|---------|
| `api/chat.js` | LLM chat (Groq/Gemini), optional profile context |
| `api/market/yahoo-chart.js` | Yahoo Finance chart JSON proxy for candles |

These run as **server** code: secrets use `process.env` **without** the `VITE_` prefix.

## Layout (where to look)

- `src/pages/` — routes (e.g. `Dashboard`, `LandingPage`)
- `src/components/` — shared UI
- `src/lib/` — client logic, ML adapters, quiz engines
- `api/` — serverless handlers for this package’s deploy root

For monorepo-wide context and backend fallback, see the repository root [`README.md`](../README.md).

# Finvest frontend (Vite + React)

## Vercel deployment (recommended)

1. In the Vercel project, set **Root Directory** to **`FRONTEND`** so serverless routes under [`api/`](./api/) deploy with the SPA (same-origin `/api/chat`, `/api/market/yahoo-chart`).
2. If the repo root [`vercel.json`](../vercel.json) is used instead, prefer switching the project to Root Directory **`FRONTEND`** and [`vercel.json`](./vercel.json) here; otherwise `/api/*` may not be picked up.

### Environment variables (Vercel → Project → Settings → Environment Variables)

**Browser (Vite)** — `VITE_*` are baked in at build time:

- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — Supabase client
- Optional: `VITE_ALPHA_VANTAGE_API_KEY`, `VITE_FINNHUB_API_KEY`, `VITE_GEMINI_API_KEY` (UI features that call Google from the client)

**Serverless only** (not prefixed with `VITE_` — never exposed to the bundle):

- `GROQ_API_KEY`, optional `GROQ_MODEL` — chat via Groq
- `GEMINI_API_KEY` or `GOOGLE_AI_API_KEY`, optional `GEMINI_CHAT_MODEL` — chat via Gemini
- `LLM_PROVIDER` — `auto` | `groq` | `gemini` (default `auto`: Gemini if key present, else Groq)
- `SUPABASE_URL`, `SUPABASE_ANON_KEY` — used by [`api/chat`](./api/chat.js) to load `user_profiles` with the caller’s JWT
- Optional: `ALPHA_VANTAGE_KEY` or `ALPHA_VANTAGE_API_KEY` — delayed quotes in chat context

See [`.env.example`](./.env.example) for local development.

### Local development

- **`npm run dev`** — Vite only. `POST /api/chat` is proxied to `http://127.0.0.1:3001/chat` if the legacy [`BACKEND`](../BACKEND) is running; otherwise run **`vercel dev`** in this folder to execute [`api/chat.js`](./api/chat.js) locally.
- **`vercel dev`** — Serves the app with serverless `/api/*` routes (matches production).

## Client-side ML

[`src/lib/ml/`](./src/lib/ml/) wraps the repo [`ML/`](../ML) modules for the same behavior as the legacy Express routes (`/api/analyze-user`, Monte Carlo, scenarios). Import from `src/lib/ml` where needed.

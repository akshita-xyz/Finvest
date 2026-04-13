# FINVEST

**Feel the risk, master the outcome.**

FINVEST is a web app for young investors who hesitate because of **loss aversion** and unclear risk. The product combines **experiential learning** (simulations and scenarios), **behavioral scoring** (quizzes with timing signals), and **personalized allocation** so users rehearse outcomes before committing real capital.

## Theory (why this exists)

- **Loss aversion** (Kahneman & Tversky): losses feel roughly twice as painful as equivalent gains feel good—so fear of drawdowns blocks participation.
- **Mental accounting & framing**: showing volatility and “what if” paths in a safe environment reframes risk from a vague threat into something measurable.
- **Behavioral measurement**: response time and answer patterns proxy for patience, impulsivity, and planning—traits that map to portfolio suitability more usefully than a single risk checkbox.

## What’s in the repo

| Area | Role |
|------|------|
| `FRONTEND/` | React (Vite), dashboard, onboarding, ML-driven UI, serverless `api/` for chat and market proxies |
| `BACKEND/` | Optional Express API + Supabase (local or legacy integration) |
| `ML/` | JS modules: behavior, clustering, portfolio logic, simulation |
| `supabase/sql/` | PostgreSQL migrations for profiles |
| `api/` (repo root) | ESM re-exports for Vercel when **Root Directory** is the repository root |

## Commands

### Frontend (primary app)

```bash
cd FRONTEND
npm install
cp .env.example .env   # then edit; never commit real secrets
npm run dev
```

```bash
npm run build
npm run preview
npm run lint
```

### Backend (optional)

```bash
cd BACKEND
npm install
# BACKEND/.env: SUPABASE_URL, SUPABASE_ANON_KEY (Supabase Dashboard → Project Settings → API)
npm start
```

### Supabase SQL (local reference)

Apply migrations in order using the Supabase SQL editor or CLI against your project: `supabase/sql/001_user_profiles.sql`, then `002_user_profiles_avatar_url.sql`.

## Environment essentials

- **Browser / Vite**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` in `FRONTEND/.env` (see `FRONTEND/.env.example`).
- **Chat (`POST /api/chat`)**: server-side `GROQ_API_KEY` and/or Gemini keys; `LLM_PROVIDER=auto|groq|gemini` (auto prefers Groq when `GROQ_API_KEY` is set). Do not put secret keys in `VITE_*`.
- **Market data**: optional `VITE_FINNHUB_API_KEY` / `VITE_ALPHA_VANTAGE_API_KEY` for quotes and news.

## Vercel: avoid 404 on `/api/chat`

Serverless routes must be part of the deployment that Vercel builds:

- **Root Directory = `FRONTEND`**: uses `FRONTEND/vercel.json` and `FRONTEND/api/*`.
- **Root Directory = repo root**: Vercel uses root `vercel.json` and `api/*.js` (root `api/chat.js` re-exports the frontend handler). Root `package.json` uses `"type": "module"` for ESM.

Set the same env vars in the Vercel project; a 404 is usually routing/layout, not a missing API key.

## Documentation

- [`docs/QUIZ_CALCULATIONS.md`](docs/QUIZ_CALCULATIONS.md) — exact quiz and pillar math.
- [`docs/HACKATHON_PROMPT.md`](docs/HACKATHON_PROMPT.md) — brief product spec and team split.

## License

ISC

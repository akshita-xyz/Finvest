# FINVEST

**Feel the risk, master the outcome.** <br>
live at- https://finvest-team-bandwagons.vercel.app/

## Project overview

FINVEST is an investment learning platform for users who hesitate because of **loss aversion** and unclear risk. It combines:

- **Experiential learning** — risk sandbox, scenarios, and charts so users rehearse outcomes before committing real capital.
- **Behavioral scoring** — quizzes (including response timing) that feed fear scores, investor clusters, and suggested allocations.
- **Profiles & auth** — Supabase-backed accounts and `user_profiles` for dashboard preferences and certificates.
- **Optional AI chat** — serverless `POST /api/chat` using Groq and/or Google Gemini, with optional profile context.
- **Optional on-chain badges** — NFT contracts and deploy scripts under `blockchain/` (local or testnet).

The product is **educational**, not personalized financial advice.

## Tech stack

| Layer | Technologies |
|--------|----------------|
| **Frontend** | React 19, Vite 8, React Router, Tailwind CSS 4, Framer Motion, Lucide icons |
| **Charts** | Recharts, TradingView Lightweight Charts |
| **Auth & database** | Supabase (PostgreSQL, Row Level Security, Auth) |
| **Serverless (Vercel / Vite dev)** | Node handlers in `FRONTEND/api/` (chat, Yahoo chart proxy); root `api/` re-exports for repo-root deploy |
| **Optional backend** | Node.js, Express 5 (`BACKEND/`) |
| **ML / logic** | JavaScript modules in `ML/` and `FRONTEND/src/lib/` (Monte Carlo, clustering, quiz engines) |
| **Blockchain (optional)** | Hardhat, ethers.js (`blockchain/`) |

**Runtime:** Node `>=20.19.0 <25` for the frontend toolchain (see `FRONTEND/package.json` `engines`).

## Setup — run locally

### 1. Prerequisites

- [Node.js](https://nodejs.org/) (LTS, matching `FRONTEND` engines)
- npm (comes with Node)
- A [Supabase](https://supabase.com/) project (URL + anon key) for auth and profiles

### 2. Frontend (main app)

```bash
cd FRONTEND
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

Other useful commands:

```bash
npm run build      # production build → dist/
npm run preview    # serve dist locally
npm run lint       # ESLint
```

### 3. Optional: backend

```bash
cd BACKEND
cp .env.example .env   # set SUPABASE_URL, SUPABASE_ANON_KEY, PORT, etc.
npm install
npm start
```

Default port is in `BACKEND/.env.example` (e.g. `3001`). 

## APIs and external services

| Service | Purpose | Where configured |
|--------|---------|------------------|
| **Supabase** | Auth, PostgreSQL, realtime-capable client | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` in `FRONTEND/.env`; optional `SUPABASE_*` for server code |
| **Groq** | LLM chat (OpenAI-compatible API) | `GROQ_API_KEY` (server only, in `FRONTEND/.env` for local API routes or Vercel env) |
| **Google Gemini** | LLM chat alternative | `GEMINI_API_KEY` / `GOOGLE_AI_API_KEY` or `VITE_GEMINI_API_KEY` (see `FRONTEND/api/_lib/llmChat.js`) |
| **Alpha Vantage** | Delayed quotes / ticker hints (dashboard + optional chat context) | `VITE_ALPHA_VANTAGE_API_KEY`, optional `ALPHA_VANTAGE_KEY` server-side |
| **Finnhub** | Quotes, news, symbol search (preferred when set) | `VITE_FINNHUB_API_KEY` or `FINNHUB_API_KEY` |
| **Yahoo Finance** | OHLC/candle data for charts | Proxied via `FRONTEND/api/market/yahoo-chart.js` and dev proxy in `vite.config.js` (no API key; subject to Yahoo/network limits) |
| **EVM RPC + contract** | Optional NFT badges | `VITE_NFT_RPC_URL`, `VITE_BADGE_NFT_CONTRACT_ADDRESS` |

Chat provider selection: `LLM_PROVIDER=auto|groq|gemini` — with `auto`, Groq is preferred when `GROQ_API_KEY` is set.

## Deploy notes (Vercel)

- If **Root Directory** is **`FRONTEND`**, Vercel uses `FRONTEND/vercel.json` and `FRONTEND/api/*`.
- If **Root Directory** is the **repository root**, use root `vercel.json` and `api/*.js` (e.g. `api/chat.js` re-exports the frontend handler). Root [`package.json`](package.json) sets `"type": "module"` for ESM.

Set the same environment variables in the Vercel project (especially `GROQ_API_KEY` without `VITE_` for serverless).

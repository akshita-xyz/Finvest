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
| **Serverless (Vercel / Vite dev)** | Node handlers in `FRONTEND/api/` (chat, RAG, voice, Yahoo chart proxy); root `api/` re-exports for repo-root deploy |
| **ML / logic** | Pure-JS modules in `FRONTEND/src/lib/` (fear score, persona clustering, Monte Carlo, quiz engines) |
| **Blockchain (optional)** | Hardhat, ethers.js (`blockchain/`) |

**Runtime:** Node `>=20.19.0 <25` for the frontend toolchain (see `FRONTEND/package.json` `engines`).

## Setup — run locally

```bash
cd FRONTEND
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

## APIs and external services

| Service | Purpose | Where configured |
|--------|---------|------------------|
| **Supabase** | Auth, PostgreSQL, realtime-capable client | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` in `FRONTEND/.env`; optional `SUPABASE_*` for server code |
| **Groq** | LLM chat (OpenAI-compatible API) | `GROQ_API_KEY` (server only, in `FRONTEND/.env` for local API routes or Vercel env) |
| **Google Gemini** | LLM chat alternative | `GEMINI_API_KEY` / `GOOGLE_AI_API_KEY` or `VITE_GEMINI_API_KEY` (see `FRONTEND/api/_lib/llmChat.js`) |
| **Alpha Vantage** | Delayed quotes / ticker hints (dashboard + optional chat context) | `VITE_ALPHA_VANTAGE_API_KEY`, optional `ALPHA_VANTAGE_KEY` server-side |
| **Finnhub** | Quotes, news, symbol search (preferred when set) | `VITE_FINNHUB_API_KEY` or `FINNHUB_API_KEY` |
| **Yahoo Finance** | OHLC/candle data for charts | Proxied via `FRONTEND/api/market/yahoo-chart.js` and dev proxy in `vite.config.js` (no API key; subject to Yahoo/network limits) |
| **EVM RPC + contract** | Optional certificate registry (verifies authenticity at `/verify`) | `VITE_CERT_REGISTRY_RPC_URL`, `VITE_CERT_REGISTRY_ADDRESS`, `CERT_ISSUER_PRIVATE_KEY` |

Chat provider selection: `LLM_PROVIDER=auto|groq|gemini` — with `auto`, Groq is preferred when `GROQ_API_KEY` is set.

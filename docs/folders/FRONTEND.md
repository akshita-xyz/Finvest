# `FRONTEND/`

The actual product: a React 19 + Vite 8 + Tailwind 4 single-page application. This is what is built and served by Vercel; the rest of the repo is supporting infrastructure.

## Top-level layout

```
FRONTEND/
├── api/                  # Vercel serverless functions (single source of truth)
├── public/               # Static assets served from /
├── src/                  # SPA source — see folders/FRONTEND-src.md for the deep dive
├── vendor/tslib/         # Pinned tslib copy aliased in vite.config.js
├── vite-plugins/
│   └── finvestLocalApi.js  # Runs api/* inside `npm run dev`
├── .env.example          # Annotated env reference
├── eslint.config.js
├── index.html            # Loads /src/main.jsx
├── package.json          # React/Vite/Supabase/Recharts/etc.
├── README.md
└── vite.config.js
```

## What each thing does

### `api/`
Same code that ships to Vercel and that the dev server invokes via the local plugin. See [`folders/api.md`](api.md) for the per-route contract.

### `public/`
Anything here is served verbatim at the site root. Includes `vite.svg`, hero/landing video assets and any image referenced via absolute paths (`/coin.png`, `/finvest.svg`, etc.). Nothing here is bundled — it's served as-is.

### `src/`
All React code (pages, components, lib, services, hooks, context, styles, ML adapters). [`folders/FRONTEND-src.md`](FRONTEND-src.md) covers it in depth.

### `vendor/tslib/`
A vendored copy of `tslib`. `vite.config.js` aliases the bare `tslib` import to `vendor/tslib/tslib.es6.mjs` so transitive deps that import it as a CJS module don't break Vite's pre-bundling.

### `vite-plugins/finvestLocalApi.js`
Custom Vite middleware (`apply: 'serve'`). For each request to a known `/api/...` path, it imports the matching `FRONTEND/api/*.js` file (cache-busted by `mtimeMs`), patches the raw Node response with Express-style `status/json/send`, and runs the handler. Without this plugin, `npm run dev` wouldn't know how to answer `/api/chat`, `/api/voice`, `/api/voice-transcribe`, `/api/rag-embed`, `/api/rag-chat`, or `/api/market/yahoo-chart` — only Vercel does.

### `vite.config.js`
- React plugin
- Loads `.env`, sets `envPrefix: ['VITE_', 'FINNHUB_', 'SUPABASE_']` so legacy env names work in `import.meta.env`
- Inserts `finvestLocalApi()` before React
- `server.proxy['/__yahoo']` → `https://query1.finance.yahoo.com` (so the candle chart works without a serverless function in dev)
- Aliases `tslib` and dedupes `react` / `react-dom`

### `index.html`
Tiny shell with the `#root` mount point and a `<script type="module" src="/src/main.jsx">`. All CSS comes from `src/index.css` and `src/styles/*` once React mounts.

### `package.json`
- Engines: Node `>=20.19.0 <25`
- Scripts: `dev`, `build`, `preview`, `lint`, `proxy:yahoo`
- Notable runtime deps: `react@19`, `react-router-dom@7`, `@supabase/supabase-js`, `ethers@6`, `framer-motion`, `lightweight-charts`, `recharts`, `lucide-react`, `tailwindcss@4`
- Dev deps: `vite@8`, `@vitejs/plugin-react`, `eslint@9`

### `.env.example`
Annotated reference for every env var the SPA understands (Supabase, Finnhub, Alpha Vantage, Gemini, Groq, `FinvestCertRegistry`). Keep this in sync with [`docs/architecture.md`](../architecture.md) §9 when you add a new variable.

## Build & deploy

| Command | Purpose |
|---------|---------|
| `npm install` | Install deps |
| `npm run dev` | Vite dev server (`localhost:5173`), local API plugin, Yahoo proxy |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve `dist/` locally |
| `npm run lint` | ESLint over the project |

`vercel.json` at the repo root drives the actual production build (`cd FRONTEND && npm install && npm run build`).

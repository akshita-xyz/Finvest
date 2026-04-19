# FINVEST — System Architecture

> **One-liner.** FINVEST is a React + Vite single-page app that turns investing fear into measurable signals (fear score, persona cluster, allocation), backed by Supabase (auth + profile), Vercel serverless functions (LLM chat, RAG over PDFs, voice, market proxies), pure-JS in-browser quiz/simulation engines, and an optional Hardhat-deployed ERC-721 badge contract.

This document is the authoritative architecture reference for the repository. If something here disagrees with the code, the code is the source of truth — please update this file in the same change.

---

## 1. Repository topology

```
Finvest/
├── api/                     # Repo-root re-exports of FRONTEND/api/* for Vercel root-deploy
│   ├── chat.js              # → FRONTEND/api/chat.js
│   ├── rag-chat.js          # → FRONTEND/api/rag-chat.js
│   ├── rag-embed.js         # → FRONTEND/api/rag-embed.js
│   ├── voice.js             # → FRONTEND/api/voice.js
│   ├── voice-transcribe.js  # → FRONTEND/api/voice-transcribe.js
│   └── market/yahoo-chart.js
├── blockchain/              # Hardhat workspace for the certificate registry
│   ├── contracts/FinvestCertRegistry.sol
│   ├── scripts/             # deploy, sync-frontend-env, run-local-cert-stack, issue-cert
│   ├── deployments/         # network → { contractAddress, rpcUrl, … } (gitignored output)
│   ├── hardhat.config.js
│   └── package.json
├── docs/                    # Human-readable docs (this file lives here)
│   ├── architecture.md
│   ├── PRODUCT BRIEF.md
│   ├── QUIZ_CALCULATIONS.md
│   ├── pitch.md
│   ├── README.md            # Docs index
│   └── folders/             # Per-folder explanations
├── FRONTEND/                # The actual product: React 19 + Vite 8 SPA
│   ├── api/                 # Serverless functions deployed to Vercel
│   │   ├── _lib/            # Shared server helpers (LLM caller, profile compaction, AV)
│   │   ├── market/yahoo-chart.js
│   │   ├── chat.js          # POST /api/chat (Decode Your Finance Self assistant)
│   │   ├── rag-chat.js      # POST /api/rag-chat (Contract-AI Q&A)
│   │   ├── rag-embed.js     # POST /api/rag-embed (Gemini text-embedding-004)
│   │   ├── voice.js         # POST /api/voice (short voice-style replies)
│   │   └── voice-transcribe.js  # POST /api/voice-transcribe (Groq Whisper)
│   ├── public/              # Static assets served at /
│   ├── src/                 # SPA source (see §3)
│   ├── vendor/tslib/        # Pinned tslib copy aliased in vite.config.js
│   ├── vite-plugins/        # finvestLocalApi.js — runs api/* inside the dev server
│   ├── index.html, vite.config.js, eslint.config.js, package.json, .env.example
├── supabase/sql/            # Idempotent SQL migrations to paste into the Supabase SQL editor
│   ├── 001_user_profiles.sql
│   └── 002_user_profiles_avatar_url.sql
├── package.json             # Root: just enough metadata so root-deployed api/*.js ESM works
├── vercel.json              # Build/output config + SPA rewrite
└── README.md
```

The whole runtime is **ESM, Node ≥ 20.19**. The Hardhat workspace under `blockchain/` is the only CommonJS island (because Hardhat needs it).

---

## 2. Runtime layout & deployment topology

```
                           ┌──────────────────────────────────┐
                           │             Browser              │
                           │  React 19 SPA (Vite build)       │
                           │                                  │
                           │  Routes (react-router-dom v7):   │
                           │   /                LandingPage   │
                           │   /onboarding      Onboarding    │
                           │   /account         AccountPage   │
                           │   /login,/signup   thin wrappers │
                           │   /dashboard*      Dashboard     │
                           │   /personalized-portfolio*  Hub  │
                           │   /financial-goals FinancialGoals│
                           │   /rag-contracts   RagContracts  │
                           │   /verify          VerifyCertif. │
                           │   *=ProtectedRoute (auth/guest)  │
                           │                                  │
                           │  Floating <VoiceAssistant/> on   │
                           │  every route (voice + chat).     │
                           └──────────────┬───────────────────┘
                                          │ HTTPS
              ┌───────────────────────────┼─────────────────────────────┐
              │                           │                             │
              ▼                           ▼                             ▼
   ┌───────────────────┐       ┌───────────────────────┐     ┌─────────────────────┐
   │  Supabase         │       │  Vercel Serverless    │     │  Public APIs        │
   │  ─────────────    │       │  (FRONTEND/api/*)     │     │  ─────────────      │
   │  • Auth (GoTrue)  │       │                       │     │  Yahoo Finance      │
   │  • Postgres + RLS │       │  /api/chat            │◄────│  Finnhub            │
   │  • user_profiles  │       │  /api/rag-chat        │     │  Alpha Vantage      │
   │  • dashboard_prefs│       │  /api/rag-embed       │     │  mfapi.in           │
   │    (assessment,   │       │  /api/voice           │     │  Groq (LLM + STT)   │
   │     ppRoadmap,    │       │  /api/voice-transcribe│     │  Google Gemini      │
   │     nft_badges)   │       │  /api/market/         │     │   (chat + embed)    │
   │                   │       │     yahoo-chart       │     └─────────────────────┘
   └─────────┬─────────┘       └──────────┬────────────┘
             │ JS user JWT                │
             │ (anon key + Bearer)        │ Server-side only:
             ▼                            │  GROQ_API_KEY, GEMINI_API_KEY,
   Browser SDK reads/writes               │  ALPHA_VANTAGE_KEY,
   only the row where                     │  SUPABASE_ANON_KEY (for RLS profile load)
   auth.uid() = user_id.

                                       ┌────────────────────────────────┐
                                       │  EVM RPC (optional, opt-in)    │
                                       │  Hardhat/local or Sepolia      │
                                       │  FinvestCertRegistry           │
                                       │   • /api/cert-issue writes     │
                                       │     keccak256 hash on-chain    │
                                       │   • /verify page reads it back │
                                       │     (ethers v6 in browser)     │
                                       └────────────────────────────────┘
```

### Two run modes

1. **Vercel (production today, https://finvest-team-bandwagons.vercel.app/).**
   - `vercel.json` sets `buildCommand = cd FRONTEND && npm install && npm run build`,
     `outputDirectory = FRONTEND/dist`, and a SPA rewrite for non-`api/` non-`assets/` paths.
   - Serverless functions live in **`api/`** at the **repo root**; each file simply re-exports the canonical handler from `FRONTEND/api/`. This lets Vercel discover the routes without changing project root settings, while keeping a single source of truth in `FRONTEND/api/`.

2. **Local dev (Vite only).** [`FRONTEND/vite-plugins/finvestLocalApi.js`](../FRONTEND/vite-plugins/finvestLocalApi.js) is a Vite middleware (`apply: 'serve'`) that imports the same `FRONTEND/api/*.js` files on every request (with a freshness-based cache buster keyed off `mtimeMs`), so `npm run dev` exposes `/api/chat`, `/api/voice`, `/api/voice-transcribe`, `/api/rag-embed`, `/api/rag-chat`, and `/api/market/yahoo-chart` exactly like Vercel does. A second dev-only proxy maps `/__yahoo/*` → `https://query1.finance.yahoo.com/*` so the candlestick chart can fetch raw Yahoo JSON without CORS.

---

## 3. Frontend architecture (`FRONTEND/`)

### 3.1 Bootstrapping

- [`index.html`](../FRONTEND/index.html) loads `src/main.jsx` as a module.
- [`main.jsx`](../FRONTEND/src/main.jsx) wires `<StrictMode>` → `<BrowserRouter>` → `<AuthProvider>` → `<App/>`. `AuthProvider` must live inside the router because pages call `useNavigate`/`useLocation`.
- [`App.jsx`](../FRONTEND/src/App.jsx) declares the route table and mounts a global `<VoiceAssistant/>` outside `<Routes/>` so the floating assistant follows the user across pages. `<ScrollToTop/>` is also global.

### 3.2 Routing & gating

| Path | Component | Gate |
|------|-----------|------|
| `/` | `LandingPage` | Public |
| `/onboarding` | `Onboarding` (legacy 3-question quiz) | Public |
| `/account` | `AccountPage` (sign-in / sign-up + profile hub) | Public |
| `/login`, `/signup` | thin redirects to `/account?mode=…` | Public |
| `/dashboard` | `Dashboard` | `<ProtectedRoute>`: requires Supabase user **or** `guestMode` |
| `/personalized-portfolio` | `PersonalizedPortfolioHub` | `<ProtectedRoute>` |
| `/financial-goals` | `FinancialGoals` | Public (uses optional Supabase if signed in) |
| `/rag-contracts` | `RagContracts` | Public |
| `/verify` | `VerifyCertificate` | Public — re-hashes a `?cert=…` payload and reads `FinvestCertRegistry.lookup(hash)` to prove authenticity |

`ProtectedRoute` ([`src/components/ProtectedRoute.jsx`](../FRONTEND/src/components/ProtectedRoute.jsx)) waits for the first `getSession` to resolve, then either renders children or `<Navigate to="/account">`. **Guest mode** (`localStorage.finvest_guest_session = '1'`, see [`lib/guestMode.js`](../FRONTEND/src/lib/guestMode.js)) lets the user explore protected pages without creating a Supabase account.

### 3.3 State & data layers

The SPA does **not** use Redux/Zustand. State is layered as:

1. **React local state** in each page/component (forms, charts, quiz step).
2. **Auth context** ([`context/AuthProvider.jsx`](../FRONTEND/src/context/AuthProvider.jsx)) — exposes `{ user, session, loading, configured, signInWithPassword, signUpWithPassword, signOut, updateUserMetadata }` via `useAuth()` ([`hooks/useAuth.js`](../FRONTEND/src/hooks/useAuth.js)). It hydrates from `supabase.auth.getSession()`, subscribes to `onAuthStateChange`, and on every new `user.id` calls `ensureUserProfile(user)` so `public.user_profiles.email` / `display_name` stay in sync with Auth metadata.
3. **Supabase Postgres** via [`services/userProfileService.js`](../FRONTEND/src/services/userProfileService.js):
   - `fetchUserProfile(userId)` — read.
   - `updateUserProfileFields(userId, fields)` — partial update.
   - `mergeDashboardPrefs(userId, prefsPatch)` — JSONB deep-merge for `dashboard_prefs` (knows how to merge `nft_badges` specially without nuking neighbours).
   - `classificationFromFearScore(score)` — UI-aligned label band (`Risk-Tolerant` / `Growth-Seeker` / `Balanced` / `Risk-Averse`).
4. **Browser storage**: `sessionStorage` caches Alpha Vantage responses for ≤4 minutes ([`lib/alphaVantage.js`](../FRONTEND/src/lib/alphaVantage.js)); `localStorage` stores guest mode, the emotional-mindset quiz result (`finvest_emotion_mindset_v1`), and a small set of UI prefs (last sandbox symbol, intro-seen flag, scroll Y).

### 3.4 Page surfaces

- **`LandingPage`** — `Cursor` (custom cursor), `Intro` (one-shot animated tagline guarded by `sessionStorage.finvest_intro_tagline_seen_v1`), `Navbar`, `Hero` (video bg + canvas particle field + parallax), `Marquee`, `HackathonShowcase`, `TeamFooter`. Scroll position is persisted to sessionStorage and restored after intro.
- **`AccountPage`** — Tabbed sign-in / sign-up using `AuthLayout`; once signed in shows display name, avatar URL editor, links to dashboard tools, sign-out, and `<ProfileNftCertificates>` (renders the user's certificates with a "Verify on chain" button per certificate that publishes a keccak256 fingerprint via `/api/cert-issue` and links out to the public `/verify` page).
- **`Dashboard`** — single 2 000-line page with sidebar nav for `risk-sandbox`, `live-stocks`, `news-feed`, `emotion-testing`, `portfolio-insights`. It hosts the `RiskCandlestickChart` (TradingView Lightweight Charts), live quotes/news/symbol search via `marketDataHub.js`, the embedded **Decode Your Finance Self** chat widget that POSTs to `/api/chat`, and the `Emotional readiness test` (which writes to `localStorage` and to `dashboard_prefs.emotion`).
- **`PersonalizedPortfolioHub`** — 5-step roadmap (`overview → calculator → quiz → where → portfolio`). Driven by [`lib/personalizedPortfolioRoadmap.js`](../FRONTEND/src/lib/personalizedPortfolioRoadmap.js) which derives completion state from the user's profile row. Renders `<AssessmentQuiz>` (pages/personalized) and shows `FinvestCertificate` modals on each major milestone.
- **`FinancialGoals`** — goal-based planning. Combines [`lib/financialGoalsLogic.js`](../FRONTEND/src/lib/financialGoalsLogic.js) (deterministic FV math + Monte Carlo profit probability + per-fund weighted aggregation) with `mfapi.in` mutual-fund data, Alpha Vantage stock stats, and Gemini for narrative copy + MF query suggestions.
- **`VerifyCertificate`** — public verify page reachable at `/verify?cert=<base64url(JSON)>`. Decodes the cert, re-hashes it client-side via `lib/certificateHash.js`, calls `FinvestCertRegistry.lookup(hash)` over a public RPC, and shows ✅ Verified (with on-chain timestamp) or ❌ Not found. If no `?cert=` param is provided, the page exposes a paste-box that accepts either raw JSON or a full verify URL. Also reachable by scanning the QR code printed on every Finvest certificate.
- **`RagContracts`** — drop-in PDF analyzer. Pipeline: pdf.js (loaded from jsDelivr at runtime, no extra dep) → `splitText()` recursive splitter → `POST /api/rag-embed` (Gemini embeddings) → in-memory `{ text, embedding }` store → cosine similarity top-k → `POST /api/rag-chat` (Groq/Gemini). The reply uses a strict template with ⚠️ Risk / 💰 Cost / ⏳ Deadline / 🔒 Restriction tags that the UI re-styles via `renderTaggedText`.
- **`Onboarding`** — legacy 3-question quiz (goal/risk/salary) that writes a quick `fearScore` to `localStorage` and jumps to `/dashboard`. Kept for the marketing CTA flow.

### 3.5 Shared UI

[`src/components/`](../FRONTEND/src/components/) holds presentational and shared smart components:

| Component | Responsibility |
|-----------|----------------|
| `Navbar.jsx` | Sticky landing nav with scroll-spy pill animation, account dropdown, "Login as Guest" toggle |
| `Hero.jsx` | Hero section with looping coin video + canvas particle field + parallax |
| `Intro.jsx` | One-shot animated word reveal before the landing page (`onComplete` callback) |
| `RiskCandlestickChart.jsx` | TradingView Lightweight Charts wrapper, fetches OHLCV via `lib/marketChartData.js` |
| `VoiceAssistant.jsx` | Floating mic + chat panel: SpeechRecognition (browser) **or** Groq Whisper STT via `/api/voice-transcribe`; intents include navigation (`go to dashboard`), scroll commands, and free-form Q&A via `/api/voice` |
| `Modals.jsx` | Generic modal stack used by landing CTAs |
| `FinvestCertificate.jsx` | SVG-styled completion certificate (variants: `decode`, `emotion`) + portal-rendered `CertificateModal` |
| `ProfileNftCertificates.jsx` | Renders profile certificates with "Verify on chain" buttons that POST to `/api/cert-issue` then open `/verify?cert=…` in a new tab |
| `ProtectedRoute.jsx` | Auth/guest gate (see §3.2) |
| `auth/AuthLayout.jsx` | Shared two-column auth shell |
| `Cursor.jsx` | Custom cursor with hover affordances |
| `ScrollToTop.jsx` | Resets scroll on route change |

### 3.6 Client logic library (`src/lib/`)

| File | Responsibility |
|------|----------------|
| `supabaseClient.js` | Singleton browser Supabase client. Accepts `VITE_SUPABASE_URL/ANON_KEY` *or* `SUPABASE_URL/ANON_KEY` (legacy). Warns when the JWT `ref` claim doesn't match the URL host. Exports `isSupabaseConfigured` so the UI can render setup hints instead of cryptic errors. |
| `appBaseUrl.js` | Builds same-origin `/api/...` URLs respecting Vite `BASE_URL` for subpath deploys. |
| `guestMode.js` | `localStorage`-backed flag toggled from the navbar / CTAs. |
| `marketDataHub.js` | Unified market data: prefers Finnhub when key set, falls back to Alpha Vantage. Returns Finnhub-shaped `{ c, d, dp, h, l }` quotes regardless of source. Also handles symbol search and dashboard news (Finnhub general/company news → AV `NEWS_SENTIMENT` topics). |
| `marketChartData.js` | OHLCV pipeline: tries the dev `/__yahoo` proxy first when `import.meta.env.DEV`, then the same-origin serverless `/api/market/yahoo-chart`, then Finnhub `stock/candle` as a last-resort fallback. Defines `RISK_CHART_TIMEFRAMES`. |
| `alphaVantage.js` | Direct Alpha Vantage calls with 4-min sessionStorage cache: `avGlobalQuote`, `avTimeSeriesStats` (annualized log returns), `avFinnhubStyleQuote`, `avSymbolSearch`, `avNewsArticles`. |
| `mfapi.js` | India mutual-fund API (`api.mfapi.in`): search, history, weighted-stat aggregation. |
| `gemini.js` | Direct browser-side Gemini call (`generateGoalNarrative`, `generateMfSuggestionQueries`) used by `FinancialGoals` only. Server chat uses the server-side helper instead. |
| `personalizedPortfolioEngine.js` | The **timed assessment quiz** scoring engine (`ASSESSMENT_QUESTIONS`, `aggregateTraits`, `assignClusterKey`, `allocationFromFearScore`, `buildAssessmentResult`). Pure JS. |
| `personalizedPortfolioRoadmap.js` | Derives `{ overview, calculator, quiz, where, portfolio }` completion booleans from a profile row. |
| `emotionInvestingMindset.js` | The **6-pillar emotional readiness test** (`EMOTION_PILLARS`, `EMOTION_QUESTIONS`, `evaluateEmotionMindset`). Per-pillar normalized %, archetype label, closing copy. |
| `financialGoalsLogic.js` | Goal math: deterministic FV (`fvGrowingPortfolio`, `yearlySeriesDeterministic`), inflation-adjusted real values (`realFromNominal`), Monte Carlo profit probability (`monteCarloProfitProbability`), three default risk paths (`buildRiskPaths`), MF stat aggregation, MF scheme heuristic classifier. |
| `ragPdf.js` | Client-side RAG: lazy-loads pdf.js from jsDelivr, `extractPdfText` from File/Blob objects, `splitText` into chunks with overlap, orchestrates `embedTexts` by calling `/api/rag-embed`, calculates `cosineSimilarity` for vector search, `retrieveTopK` most relevant chunks, and sends queries to `/api/rag-chat`. |
| `certRegistryAbi.js` / `certRegistryClient.js` | Minimal `FinvestCertRegistry` ABI + an `ethers v6` `JsonRpcProvider` helper that calls `lookup(hash)` and returns `{ valid, timestamp, kind }`. |
| `certificateData.js` | Builds a versioned canonical certificate object (`v`, `type`, `userId`, `recipient`, `issuedAt`, `payload`) from `dashboard_prefs` + emotion localStorage. |
| `certificateHash.js` | Pure-JS canonical JSON serializer (sorted keys, no whitespace) + `hashCertificate(cert) → keccak256` + `buildVerifyUrl(cert) → /verify?cert=…`. Same canonicalization is duplicated in `api/cert-issue.js` and `blockchain/scripts/issue-cert.js` — they MUST stay byte-identical. |

> All quiz / portfolio / Monte Carlo math lives in the browser as pure ESM. There is **no** server-side math service.

### 3.7 Vite configuration

[`FRONTEND/vite.config.js`](../FRONTEND/vite.config.js) does five notable things:

1. Loads `.env` and shadows it onto `process.env` so server-side helpers imported during dev see secrets.
2. Sets `envPrefix: ['VITE_', 'FINNHUB_', 'SUPABASE_']` to expose the legacy non-`VITE_` variable names as `import.meta.env.*`. This is what lets `supabaseClient.js` accept either naming.
3. Loads the **dev API plugin** (`finvestLocalApi`) **before** `react()` so middleware runs first.
4. Configures the `/__yahoo` dev proxy for chart JSON.
5. Aliases `tslib` to a vendored copy at `vendor/tslib/tslib.es6.mjs` and dedupes `react`/`react-dom` to avoid hooks-with-multiple-React errors.

### 3.8 Styling

Tailwind CSS 4 powers utility classes; per-page CSS lives under [`src/styles/`](../FRONTEND/src/styles/) (e.g. `dashboard.css`, `account.css`, `auth.css`, `financial-goals.css`, `pp-hub.css`, `rag-contracts.css`, `finvest-certificate.css`, `investing-stories.css`). `src/index.css` holds globals + Tailwind layer setup; `src/App.css` holds layout shell rules.

---

## 4. Serverless API (`api/` and `FRONTEND/api/`)

The repo runs the same handler files in two modes — Vercel cold-invocations and the local Vite middleware — by writing them as plain `(req, res) => …` async functions. The repo-root `api/*.js` files exist only to **`export { default } from '../FRONTEND/api/<name>.js'`**, so the canonical implementation always lives in `FRONTEND/api/`.

### 4.1 `POST /api/chat` — Decode Your Finance Self

[`FRONTEND/api/chat.js`](../FRONTEND/api/chat.js) reads `{ message, userType?, access_token?, history? }`. It will:

1. Reconstruct a Supabase user-scoped client from the supplied JWT (`supabaseForUserJwt` in [`api/_lib/chatHelpers.js`](../FRONTEND/api/_lib/chatHelpers.js)) so RLS applies and only the caller's own profile is fetched.
2. Pull the row from `public.user_profiles`, compact it into prompt-safe context (`compactProfileForPrompt`).
3. Optionally enrich the system prompt with delayed Alpha Vantage quotes for tickers found in the user's message (`extractTickerCandidates` + `buildAlphaVantageContext`).
4. Build OpenAI-style `messages = [{ role: 'system' | 'user' | 'assistant', content }]`, normalising `model`/`ai` history roles.
5. Hand off to `generateChatReply` ([`api/_lib/llmChat.js`](../FRONTEND/api/_lib/llmChat.js)).

**Provider selection** (`resolveProvider`):

```
LLM_PROVIDER=auto  →  Groq if GROQ_API_KEY,
                       else Gemini if any of GEMINI_API_KEY/GOOGLE_AI_API_KEY/VITE_GEMINI_API_KEY,
                       else 'none' (returns instructive 503).
LLM_PROVIDER=groq  →  always Groq, default model llama-3.3-70b-versatile (override GROQ_MODEL).
LLM_PROVIDER=gemini→  always Gemini, default model gemini-2.0-flash (override GEMINI_CHAT_MODEL).
```

### 4.2 `POST /api/rag-chat` and `POST /api/rag-embed` — Contract AI

`rag-embed.js` iterates a hardcoded list of Gemini embedding models (`gemini-embedding-001` → `text-embedding-004` → `embedding-001`) on the **first** payload text to pick whatever the deployed key supports, then uses up to 4 parallel workers to embed the rest with the same `(model, apiVersion)` config. Caps: ≤ 64 texts/call, ≤ 8 000 chars/text, ≤ 24 MB body.

`rag-chat.js` builds a context block from the supplied excerpts (truncated to ≤ 12 000 chars total) and prompts the LLM with a strict five-rule contract-review template that tags findings with ⚠️ Risk / 💰 Cost / ⏳ Deadline / 🔒 Restriction. History is capped to the last 6 turns (12 messages).

The browser RAG state lives only in memory — there is no vector DB. Every page reload re-uploads the PDF.

### 4.3 `POST /api/voice` and `POST /api/voice-transcribe`

- `voice.js` is a 1-2-sentence chat for the floating assistant; uses the same `generateChatReply` helper with a tighter system prompt.
- `voice-transcribe.js` proxies raw recorder bytes to Groq's Whisper endpoint (`api.groq.com/openai/v1/audio/transcriptions`). Default model `whisper-large-v3-turbo`, configurable via `GROQ_STT_MODEL`. Body parser is disabled (`config.api.bodyParser = false`) so the raw audio buffer is preserved.

### 4.4 `GET /api/market/yahoo-chart`

CORS-free proxy for `query1.finance.yahoo.com/v8/finance/chart/<SYMBOL>`. Validates symbol/range/interval against simple regexes, sets a desktop User-Agent, returns Yahoo's JSON verbatim. The dev `/__yahoo` proxy provides a faster path for pure-Vite local use.

### 4.5 Dev-mode wiring

The Vite plugin in [`FRONTEND/vite-plugins/finvestLocalApi.js`](../FRONTEND/vite-plugins/finvestLocalApi.js) inserts middleware that:

- Patches the raw Node response with Express-like `status()` / `json()` / `send()` helpers (Vercel injects these in production but Vite gives you raw `ServerResponse`).
- Re-imports each `api/*.js` file with `pathToFileURL(file).href + '?v' + mtimeMs`, so saving a handler picks up immediately without restarting Vite.
- Routes the same `(req, res)` calls as production.

---

## 5. Data model — Supabase

### 5.1 `auth.users`

Managed by Supabase Auth (GoTrue). The SPA uses email + password and reads `user_metadata` for `full_name`, `name`, `avatar_url`. OAuth/magic-link redirects are enabled via the SDK's `detectSessionInUrl: true`.

### 5.2 `public.user_profiles` (migration 001)

```
id              UUID PRIMARY KEY
user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE  -- UNIQUE
email           TEXT
display_name    TEXT
fear_score      INTEGER
classification  TEXT
dashboard_prefs JSONB NOT NULL DEFAULT '{}'::jsonb
avatar_url      TEXT                                                       -- migration 002
created_at, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

- **RLS** is enabled; three policies (select/insert/update) all enforce `auth.uid() = user_id` for the `authenticated` role. There is no `delete` policy — rows live as long as the auth user.
- A trigger `AFTER INSERT ON auth.users` calls `public.handle_new_user()` (`SECURITY DEFINER`) to insert a baseline row with `user_id`, `email`, and `display_name` from `raw_user_meta_data.full_name`. The frontend additionally calls `ensureUserProfile()` after every login as a safety net (idempotent `upsert ON CONFLICT (user_id) DO NOTHING`).

### 5.3 `dashboard_prefs` JSONB schema (de-facto, written by the SPA)

```jsonc
{
  "assessment": {                       // Decode Your Finance Self quiz result
    "version": 1,
    "completedAt": "2026-04-18T…Z",
    "answers": { "decision_style": "read_first", … },
    "hesitationMs": [4321, 9876, …],
    "traits": { "patient": …, "impulsive": …, "overconfident": …,
                "planning": …, "leverage_comfort": …,
                "fearScore": 53, "avgHesitationMs": 6200 },
    "clusterKey": "balanced",
    "clusterLabel": "Balanced",
    "messages": { "label": …, "hint": …, "panic": …,
                  "trading": …, "loans": … },
    "allocation": { "stocks": 48, "bonds": 38, "cash": 14, "label": "Balanced" },
    "suitability": { "tradingStyle": …, "loansAndPolicies": … }
  },
  "ppRoadmap": { "whereVisited": true, "portfolioVisited": true },
  "emotion": {                          // Emotional readiness test summary
    "overallReadiness": 71, "archetype": "The Growing Steward",
    "pillars": [ { "key": "emotionalRegulation", "percent": 78, "level": "strong" }, … ],
    "completedAt": "2026-04-18T…Z"
  },
  "nft_badges": {
    "portfolioCertificate": { "issuedAt": "…", "tokenId": "12" },
    "emotionCertificate":   { "issuedAt": "…", "tokenId": "13" }
  }
}
```

`mergeDashboardPrefs()` deep-merges the patch object into the existing JSON (merging `nft_badges` specially) so multiple flows can coexist without one writer clobbering another.

---

## 6. Quiz, portfolio, and simulation logic

All scoring math runs **in the browser** as pure ESM. There's no separate ML service to stand up.

| Module | What it does |
|--------|---|
| [`personalizedPortfolioEngine.js`](../FRONTEND/src/lib/personalizedPortfolioEngine.js) | Decode Your Finance Self quiz — `ASSESSMENT_QUESTIONS`, `aggregateTraits` (with hesitation), `assignClusterKey` (nearest centroid), `allocationFromFearScore`, `buildAssessmentResult` |
| [`emotionInvestingMindset.js`](../FRONTEND/src/lib/emotionInvestingMindset.js) | Emotional Readiness test — pillars, scoring, archetype, advice |
| [`financialGoalsLogic.js`](../FRONTEND/src/lib/financialGoalsLogic.js) | Goal math — `fvGrowingPortfolio`, `yearlySeriesDeterministic`, `realFromNominal`, `monteCarloProfitProbability`, `buildRiskPaths`, MF aggregation |

The authoritative scoring spec is in [`docs/QUIZ_CALCULATIONS.md`](QUIZ_CALCULATIONS.md). When you change the math, also update that doc.

---

## 7. Optional on-chain layer (`blockchain/`)

The blockchain module is fully optional. The product never blocks on chain state. When configured, it adds a tamper-evident verification layer on top of the off-chain certificates so anyone (recruiters, peers, auditors) can independently confirm a Finvest certificate is authentic.

### 7.1 Contract

[`contracts/FinvestCertRegistry.sol`](../blockchain/contracts/FinvestCertRegistry.sol) is a minimal hash registry built on `@openzeppelin/contracts ^4.9.6 / Ownable`:

- `mapping(bytes32 => uint256) issuedAt` — certificate hash → unix timestamp (0 means "not issued").
- `mapping(bytes32 => bytes32) certKind` — opaque tag, e.g. `keccak256("portfolio")`.
- `issue(bytes32 certHash, bytes32 kind)` — owner-only; reverts on duplicate; emits `CertificateIssued`.
- `isValid(bytes32 certHash)` and `lookup(bytes32 certHash)` — public read-only views.

The certificate JSON itself never goes on-chain — only its 32-byte fingerprint does. This is privacy-preserving and gas-cheap.

### 7.2 Hardhat

[`hardhat.config.js`](../blockchain/hardhat.config.js) defines three networks:

- `hardhat` (in-process)
- `localhost` (`http://127.0.0.1:8545`, chainId 31337)
- `sepolia` (uses `SEPOLIA_RPC_URL || ALCHEMY_SEPOLIA_URL || rpc.sepolia.org`; signs from `DEPLOYER_PRIVATE_KEY`)

### 7.3 Scripts

- `scripts/deploy.js` — deploys the contract, writes `deployments/<network>.json` with `{ contractAddress, network, chainId, rpcUrl, deployer, deployedAt }`.
- `scripts/sync-frontend-env.js` — reads `deployments/<network>.json` and merges `VITE_CERT_REGISTRY_ADDRESS`, `VITE_CERT_REGISTRY_RPC_URL`, `CERT_REGISTRY_ADDRESS`, `CERT_REGISTRY_RPC_URL` into `FRONTEND/.env` (idempotent line replace/insert).
- `scripts/run-local-cert-stack.js` — one-shot: spawns `npx hardhat node` in the background, waits for port 8545, deploys, then syncs env. Cross-platform (Node ≥18).
- `scripts/issue-cert.js` — manual issue helper: hashes a JSON file (`CERT_FILE=...`) and publishes its hash via `issue()`. Useful for backfilling certificates outside the SPA.

### 7.4 Frontend + serverless integration

The verification flow is split across three files:

- [`lib/certificateData.js`](../FRONTEND/src/lib/certificateData.js) — turns the user's `dashboard_prefs` row into a canonical certificate object (versioned schema: `v`, `type`, `userId`, `recipient`, `issuedAt`, `payload`).
- [`lib/certificateHash.js`](../FRONTEND/src/lib/certificateHash.js) — pure-JS canonical JSON serializer (sorted keys, no whitespace) + `hashCertificate(cert) → keccak256` + `buildVerifyUrl(cert) → /verify?cert=<base64url>`. The same canonicalization is duplicated **byte-for-byte** in [`api/cert-issue.js`](../FRONTEND/api/cert-issue.js) and `blockchain/scripts/issue-cert.js` — this is the contract that makes the verification math work.
- [`lib/certRegistryClient.js`](../FRONTEND/src/lib/certRegistryClient.js) — read-only ethers v6 client (`JsonRpcProvider` + `Contract.lookup(hash)`); used by the public `/verify` page.

The serverless endpoint [`api/cert-issue.js`](../FRONTEND/api/cert-issue.js) is **idempotent**: it re-hashes the certificate server-side, checks `issuedAt(hash)` first, and only sends a transaction when the hash is new. Signing uses `CERT_ISSUER_PRIVATE_KEY` — that wallet must be the contract owner.

`<ProfileNftCertificates>` exposes a "Verify on chain" button per certificate. Clicking it POSTs to `/api/cert-issue`, then opens `/verify?cert=…` in a new tab. The verify page can also be reached by scanning the QR code embedded in the SVG certificate (rendered by `<FinvestCertificate verifyUrl=…>` via `qrcode.react`).

---

## 8. End-to-end flows (sequence diagrams)

### 8.1 Sign-in

```
User → AccountPage : enter email/password
AccountPage → AuthProvider.signInWithPassword()
AuthProvider → supabase.auth.signInWithPassword()
supabase  → Auth API : OAuth/JWT exchange
AuthProvider ← {session,user}
AuthProvider → onAuthStateChange listener fires
AuthProvider → ensureUserProfile(user)
   userProfileService.upsert(user_profiles, {user_id,email,display_name})  // RLS: auth.uid() = user_id
ProtectedRoute re-renders → /dashboard mounts
```

### 8.2 Decode Your Finance Self quiz

```
PersonalizedPortfolioHub → AssessmentQuiz.onComplete(result)
result = buildAssessmentResult(answers, hesitationMs)  // pure JS in personalizedPortfolioEngine.js
Hub → mergeDashboardPrefs(user.id, { assessment: result })
Hub → updateUserProfileFields(user.id, { fear_score, classification })
Hub shows <FinvestCertificate variant="decode"/>
```

### 8.3 Dashboard chat (LLM with profile context)

```
Dashboard → fetch POST /api/chat
   body = { message, userType, access_token: session.access_token, history }
[Vercel | Vite plugin] handler:
  supabaseForUserJwt(access_token).from('user_profiles').select(*).eq(user_id, …)
  buildAlphaVantageContext(message)
  generateChatReply([system, ...history, {user,message}]) → Groq | Gemini
Dashboard appends reply to local chat state
```

### 8.4 Contract-AI (RAG)

```
RagContracts (browser)
  ├─ extractPdfText(file)              # pdf.js loaded from jsDelivr
  ├─ splitText(text, {chunkSize:500, overlap:100})
  ├─ POST /api/rag-embed { texts:[…] } # server picks Gemini embed model on first text
  ├─ store = chunks.map((t,i) => ({ text:t, embedding: vec[i] }))
  ├─ user types question
  ├─ POST /api/rag-embed { texts:[question] }
  ├─ retrieveTopK(store, qVec, 4) via cosine similarity
  └─ POST /api/rag-chat { question, context, history }
                       → server prompts Groq/Gemini with risk-tag template
                       → reply streamed back; UI re-styles ⚠️/💰/⏳/🔒 tags
```

### 8.5 Voice assistant

```
VoiceAssistant
  ├─ MediaRecorder (browser) → WebM blob
  ├─ POST /api/voice-transcribe (raw bytes, x-language: en)
  │     → Groq Whisper → { text }
  ├─ if matches NAV_COMMANDS / SCROLL_COMMANDS → react-router useNavigate / window.scrollBy
  └─ else POST /api/voice { message } → 1-2 sentence reply via Groq/Gemini
```

### 8.6 Market data fan-out

```
Dashboard → marketDataHub.fetchQuoteFinnhubStyle(symbol, finnhubKey, alphaKey)
   if finnhubKey → finnhub.io/quote
   else if alphaKey → alphaVantage.avFinnhubStyleQuote (cached 4 min in sessionStorage)
RiskCandlestickChart → marketChartData.fetchYahooChartOHLCV(sym, range, interval, finnhubToken?)
   tries: dev /__yahoo (Vite proxy) →
          /api/market/yahoo-chart (Vercel serverless / Vite plugin) →
          finnhub.io/stock/candle (last resort)
```

---

## 9. Environment variables

| Var | Side | Purpose |
|-----|------|---------|
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | browser | Supabase client (or `SUPABASE_URL`/`SUPABASE_ANON_KEY` legacy) |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | server (`api/_lib/chatHelpers.js`) | Reads profile under RLS using the caller's JWT |
| `GROQ_API_KEY` | server | Groq chat & Whisper STT (server-only secret) |
| `GROQ_MODEL` | server | Override default `llama-3.3-70b-versatile` |
| `GROQ_STT_MODEL` | server | Override default `whisper-large-v3-turbo` |
| `GEMINI_API_KEY` / `GOOGLE_AI_API_KEY` / `VITE_GEMINI_API_KEY` | server (chat/embed); browser (`lib/gemini.js`) | Gemini chat + embeddings + Goal narrative |
| `GEMINI_CHAT_MODEL` | server | Override default `gemini-2.0-flash` |
| `GEMINI_EMBED_MODEL` | server | Force embedding model (else auto-resolves) |
| `LLM_PROVIDER` | server | `auto` (default) / `groq` / `gemini` |
| `ALPHA_VANTAGE_KEY` / `ALPHA_VANTAGE_API_KEY` | server | Server-side AV ticker enrichment for chat |
| `VITE_ALPHA_VANTAGE_API_KEY` | browser | Browser AV calls (dashboard, financial goals) |
| `VITE_FINNHUB_API_KEY` / `FINNHUB_API_KEY` | browser | Finnhub quotes/news/search (preferred over AV when set) |
| `VITE_CERT_REGISTRY_ADDRESS` / `VITE_CERT_REGISTRY_RPC_URL` | browser | Public `/verify` page reads `FinvestCertRegistry` |
| `CERT_REGISTRY_ADDRESS` / `CERT_REGISTRY_RPC_URL` | server | `/api/cert-issue` reads + writes `FinvestCertRegistry` |
| `CERT_ISSUER_PRIVATE_KEY` | server (FRONTEND/.env, never browser) | Signing key for `/api/cert-issue`; must own the contract |
| `SEPOLIA_RPC_URL` / `ALCHEMY_SEPOLIA_URL` / `DEPLOYER_PRIVATE_KEY` | hardhat | Sepolia deploy |
| `CERT_FILE` | hardhat scripts | Path to JSON for `scripts/issue-cert.js` |

The full annotated reference is in [`FRONTEND/.env.example`](../FRONTEND/.env.example).

---

## 10. Build, run, and deploy

### 10.1 Local development

```bash
cd FRONTEND
cp .env.example .env       # fill in Supabase + at least one LLM key
npm install
npm run dev                # http://localhost:5173
                           # /api/* served by vite-plugins/finvestLocalApi.js
                           # /__yahoo/* proxied to Yahoo
```

Optionally bring up the local certificate registry:

```bash
cd blockchain && npm install && npm run cert:auto-local
# spawns hardhat node :8545, deploys FinvestCertRegistry, writes FRONTEND/.env
# then paste a prefunded private key as CERT_ISSUER_PRIVATE_KEY in FRONTEND/.env
# restart Vite so VITE_CERT_REGISTRY_* take effect
```

### 10.2 Production (Vercel)

`vercel.json` handles everything. Push to the linked Git remote and Vercel will:

1. `cd FRONTEND && npm install && npm run build` → `FRONTEND/dist`.
2. Auto-detect functions in repo-root `api/`. Each function is a 1-line ESM re-export, but Vercel still treats the resolved file as the function source, so the underlying `FRONTEND/api/_lib/*` helpers are bundled correctly.
3. Apply the SPA rewrite for all non-`api/`, non-`assets/` paths so client-side routing works on hard refresh.

Set every server-side env var (`GROQ_API_KEY`, `GEMINI_API_KEY`, `LLM_PROVIDER`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `ALPHA_VANTAGE_KEY`, `GROQ_STT_MODEL` if any) in Project → Settings → Environment Variables. `VITE_*` browser vars must also be set there because Vite bakes them in at build time — redeploy after a change.

---

## 11. Security & compliance posture

- **Educational, not advice.** Every prompt and surface is labelled as a learning tool. No fiduciary claims; no real-time prices used as trade signals.
- **RLS-first.** Every browser-side read/write to `user_profiles` goes through the Supabase JS client; the only DB exception (`/api/chat`) creates a per-request user-scoped client from the caller's JWT, so policy is still applied. There is no `service_role` key anywhere in the frontend or in the production serverless functions.
- **Secrets never reach the browser.** `GROQ_API_KEY`, server-side `GEMINI_API_KEY`, `ALPHA_VANTAGE_KEY` are `process.env` only. The `VITE_GEMINI_API_KEY` accepted by `lib/gemini.js` is a deliberate browser-exposed key for the optional Goal narrative; it's understood that Gemini quota gets attributed to that key.
- **CORS / proxies.** Yahoo Finance is proxied (Vite dev or Vercel serverless function) so the browser never makes the cross-origin request that Yahoo would reject. `mfapi.in` and Finnhub are CORS-friendly and called directly.
- **Voice transcription** caps payloads at 24 MB and disables the body parser to keep raw bytes intact.
- **Smart contract** is owner-only mint, plain ERC-721; no royalties, no token approvals beyond ERC-721 defaults. The frontend only reads.

---

## 12. Notable conventions & gotchas

- **Two source-of-truth keys.** `supabaseClient.js` and the chat helpers accept *either* `VITE_*` or non-prefixed names so the same `.env` works in dev and in serverless. When both exist, the `VITE_*` value wins on the browser and the bare name wins on the server.
- **`react`/`react-dom` deduped** in `vite.config.js` — required because some transitive deps pull in older React copies and would otherwise crash hooks.
- **`tslib` is vendored**. Some Recharts/d3 chains import `tslib` as a CJS file that Vite won't pre-bundle; the alias to `vendor/tslib/tslib.es6.mjs` keeps tree-shaking healthy.
- **Dev API auto-reload** is mtime-keyed; if you're seeing stale handler logic in dev, check the `freshImport` URL has the latest `?v…` token.
- **Hesitation timing** is the only signal that lives strictly client-side and is forwarded with the quiz payload — there's no per-keystroke telemetry server-side.
- **Two Onboarding flows** coexist: the legacy `/onboarding` page (3 questions, writes `localStorage.fearScore`) and the canonical `PersonalizedPortfolioHub` 5-step roadmap. The dashboard prefers the latter when `dashboard_prefs.assessment` is present.
- **Floating VoiceAssistant** persists across all routes because it's mounted in `App.jsx` outside `<Routes>`.

---

## 13. Where to look when…

| You need to… | Open |
|---|---|
| Add a new SPA route | `FRONTEND/src/App.jsx`, plus a new file in `src/pages/` |
| Add a new server endpoint | `FRONTEND/api/<name>.js` and (optionally) a 1-line re-export in `api/<name>.js`; register the dev-mode route in `vite-plugins/finvestLocalApi.js` |
| Change quiz scoring | `FRONTEND/src/lib/personalizedPortfolioEngine.js` or `emotionInvestingMindset.js`, then update `docs/QUIZ_CALCULATIONS.md` |
| Add a Supabase column | New migration in `supabase/sql/00X_*.sql`, run in SQL Editor, update `services/userProfileService.js` shape |
| Add an asset to charts | `FRONTEND/src/lib/marketDataHub.js` or `marketChartData.js` |
| Add a smart-contract feature | `blockchain/contracts/FinvestCertRegistry.sol`, redeploy via `scripts/deploy.js`, sync env, update `lib/certRegistryAbi.js` and the ABI inside `api/cert-issue.js` |
| Change the certificate JSON schema | Bump `v` in `lib/certificateData.js`; the canonicalization in `lib/certificateHash.js`, `api/cert-issue.js` and `blockchain/scripts/issue-cert.js` must stay byte-identical |
| Tune the LLM contract review tags | `FRONTEND/api/rag-chat.js` (system prompt) and `FRONTEND/src/pages/RagContracts.jsx` (`renderTaggedText`) |

---

## 14. Per-folder docs

For deeper notes on each top-level folder, see [`docs/folders/`](folders/):

- [`folders/FRONTEND.md`](folders/FRONTEND.md) — SPA build + dev plumbing
- [`folders/FRONTEND-src.md`](folders/FRONTEND-src.md) — `src/` deep dive (pages, components, lib, services, context, hooks, styles)
- [`folders/api.md`](folders/api.md) — Vercel serverless functions
- [`folders/blockchain.md`](folders/blockchain.md) — Hardhat + `FinvestCertRegistry`
- [`folders/supabase.md`](folders/supabase.md) — SQL migrations and schema

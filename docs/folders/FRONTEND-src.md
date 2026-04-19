# `FRONTEND/src/`

The React 19 source tree. This document covers every subfolder and the loose top-level files.

## Top-level files

| File | Role |
|------|------|
| `main.jsx` | App bootstrap: `<StrictMode>` → `<BrowserRouter>` → `<AuthProvider>` → `<App/>` |
| `App.jsx` | Route table + global `<Cursor/>`, `<ScrollToTop/>`, `<VoiceAssistant/>` |
| `index.css` | Tailwind layer + global resets + landing/utility CSS (~55 KB) |
| `App.css` | Layout shell, scroll behavior |

## `pages/`

Every URL-bound view. Routing lives in `App.jsx`.

| File | Route | What it does |
|------|-------|--------------|
| `LandingPage.jsx` | `/` | Marketing landing: `Cursor`, one-shot `Intro` (gated by sessionStorage), `Navbar`, `Hero`, `Marquee`, `HackathonShowcase`, `TeamFooter`. Restores scroll Y across reloads. |
| `Onboarding.jsx` | `/onboarding` | Legacy 3-question quiz (goal/risk/salary). Writes a quick `fearScore` to localStorage and jumps to `/dashboard`. Kept for the marketing CTA. |
| `AccountPage.jsx` | `/account` | Tabbed sign-in/sign-up via `AuthLayout`. Once signed in: display name, avatar URL editor, links to dashboard tools, `<ProfileNftCertificates>` for off-chain + on-chain badges. |
| `LoginPage.jsx` / `SignupPage.jsx` | `/login`, `/signup` | Thin redirects to `AccountPage` with a `?mode=` param so external links keep working. |
| `Dashboard.jsx` | `/dashboard` | The main authenticated workspace. Sidebar nav (`risk-sandbox`, `live-stocks`, `news-feed`, `emotion-testing`, `portfolio-insights`), embedded chat using `/api/chat`, `RiskCandlestickChart`, live quotes/news/symbol search via `marketDataHub`. Persists every preference into Supabase `dashboard_prefs`. |
| `PersonalizedPortfolioHub.jsx` | `/personalized-portfolio` | 5-step roadmap (`overview → calculator → quiz → where → portfolio`) driven by `personalizedPortfolioRoadmap.js`. Renders `<AssessmentQuiz>` and shows `<FinvestCertificate variant="decode">` on completion. |
| `FinancialGoals.jsx` | `/financial-goals` | Goal-based planner. Mixes `financialGoalsLogic.js` (FV math + Monte Carlo) with `mfapi`, Alpha Vantage, and Gemini narrative copy. |
| `RagContracts.jsx` | `/rag-contracts` | PDF contract analyzer. Drives the full RAG loop in the browser via `lib/ragPdf.js`. |
| `personalized/AssessmentQuiz.jsx` | (used by Hub) | Timed quiz UI: records hesitation per question, calls `buildAssessmentResult` on completion. |

## `components/`

Reusable UI. The notable ones:

| File | Purpose |
|------|---------|
| `Navbar.jsx` | Sticky landing nav with scroll-spy pill, account dropdown, "Login as Guest" toggle |
| `Hero.jsx` | Hero section: looping coin video + canvas particle field + parallax |
| `Intro.jsx` | One-shot animated word reveal, fires `onComplete` when done |
| `Cursor.jsx` | Custom cursor with hover affordances |
| `Marquee.jsx`, `HackathonShowcase.jsx`, `TeamFooter.jsx`, `Footer.jsx`, `CtaBand.jsx`, `Stats.jsx`, `Process.jsx`, `WorkflowZigzag.jsx`, `LearnMore.jsx`, `GetStarted.jsx`, `VisualPanel.jsx` | Marketing page sections |
| `Modals.jsx` | Generic modal stack used by landing CTAs |
| `InvestingStoriesSlideshow.jsx` | Storyteller carousel for the landing page |
| `RiskCandlestickChart.jsx` | TradingView Lightweight Charts wrapper with timeframe switcher; fetches OHLCV via `lib/marketChartData.js` |
| `VoiceAssistant.jsx` | Floating mic + chat panel: browser SpeechRecognition or Groq Whisper STT (`/api/voice-transcribe`), navigation/scroll intents, free-form Q&A via `/api/voice` |
| `ProtectedRoute.jsx` | Auth/guest gate — waits for first `getSession()` then either renders or redirects to `/account` |
| `ScrollToTop.jsx` | Resets scroll on route change |
| `FinvestCertificate.jsx` | SVG certificate (variants `decode` / `emotion`) + portal-rendered `CertificateModal` |
| `ProfileNftCertificates.jsx` | Renders profile certificates with a "Verify on chain" button that POSTs to `/api/cert-issue` and opens `/verify?cert=…` |
| `auth/AuthLayout.jsx` | Two-column shell shared by sign-in/sign-up |

## `context/`

| File | Purpose |
|------|---------|
| `authContext.js` | The plain `React.createContext()` instance |
| `AuthProvider.jsx` | Wraps the app: hydrates `supabase.auth.getSession()`, subscribes to `onAuthStateChange`, calls `ensureUserProfile(user)` on every new id, exposes `signInWithPassword`, `signUpWithPassword`, `signOut`, `updateUserMetadata`, plus `loading`, `configured` flags |

## `hooks/`

| File | Purpose |
|------|---------|
| `useAuth.js` | `useContext(authContext)` thin wrapper; throws when used outside the provider |

## `services/`

| File | Purpose |
|------|---------|
| `userProfileService.js` | Read/write `public.user_profiles` under RLS: `fetchUserProfile`, `ensureUserProfile`, `updateUserProfileFields`, `mergeDashboardPrefs` (deep-merge JSONB with special handling for `nft_badges`), `classificationFromFearScore` (UI label band) |

## `lib/`

Pure-JS client logic. Subgrouped:

### Auth & infra
| File | Purpose |
|------|---------|
| `supabaseClient.js` | Singleton browser Supabase client. Accepts `VITE_*` or legacy bare names; warns on host/key mismatch; exposes `isSupabaseConfigured` |
| `appBaseUrl.js` | Builds same-origin `/api/...` URLs honouring Vite `BASE_URL` (subpath deploys) |
| `guestMode.js` | localStorage-backed `finvest_guest_session` toggle |

### Market data
| File | Purpose |
|------|---------|
| `marketDataHub.js` | Unified quote/news/search. Prefers Finnhub when key set, falls back to Alpha Vantage. Always returns Finnhub-shaped `{ c, d, dp, h, l }`. |
| `marketChartData.js` | OHLCV pipeline. Tries (in order) `/__yahoo` (dev proxy), `/api/market/yahoo-chart` (serverless / Vite plugin), Finnhub `stock/candle` fallback. Defines `RISK_CHART_TIMEFRAMES`. |
| `alphaVantage.js` | Direct AV calls with 4-min sessionStorage cache: `avGlobalQuote`, `avTimeSeriesStats` (annualized log returns), `avFinnhubStyleQuote`, `avSymbolSearch`, `avNewsArticles` |
| `mfapi.js` | India MF API (`api.mfapi.in`): scheme search, NAV history, weighted-stat aggregation |

### LLM (browser-side only)
| File | Purpose |
|------|---------|
| `gemini.js` | Direct browser Gemini call (`generateGoalNarrative`, `generateMfSuggestionQueries`) used by `FinancialGoals` only. (Server chat uses the server-side helper instead.) |

### Quizzes & scoring
| File | Purpose |
|------|---------|
| `personalizedPortfolioEngine.js` | The "Decode Your Finance Self" engine: `ASSESSMENT_QUESTIONS`, `aggregateTraits` (with hesitation), `assignClusterKey` (nearest centroid), `allocationFromFearScore`, `buildAssessmentResult` |
| `personalizedPortfolioRoadmap.js` | Derives roadmap completion booleans from a profile row |
| `emotionInvestingMindset.js` | "Emotional Readiness Test": pillars, questions, normalization, `evaluateEmotionMindset`, archetype + advice |
| `financialGoalsLogic.js` | Goal math: `fvGrowingPortfolio`, `yearlySeriesDeterministic`, `realFromNominal`, `monteCarloProfitProbability`, `buildRiskPaths`, MF stat aggregation, MF scheme heuristic classifier |

### RAG / Contract AI
| File | Purpose |
|------|---------|
| `ragPdf.js` | Lazy-loads pdf.js from jsDelivr, `extractPdfText`, `splitText` (recursive char splitter, configurable size/overlap), `embedTexts` (POSTs to `/api/rag-embed`), `cosineSimilarity`, `retrieveTopK`, `askContract` (POSTs to `/api/rag-chat`) |

### Blockchain
| File | Purpose |
|------|---------|
| `certRegistryAbi.js` | Minimal `FinvestCertRegistry` ABI (read-only methods) |
| `certRegistryClient.js` | ethers v6 `JsonRpcProvider` + `Contract` helper. Calls `lookup(hash)` and returns `{ valid, timestamp, kind }` for the verify page. |
| `certificateData.js` | Builds the canonical certificate object from `dashboard_prefs` + emotion localStorage |
| `certificateHash.js` | Canonical JSON + `keccak256` + base64url helpers; shared schema between client, server, and Hardhat scripts |

## `styles/`

Per-page CSS (loaded by the page that uses it). Tailwind utility classes still apply globally.

| File | Used by |
|------|---------|
| `account.css` | `AccountPage`, `auth/AuthLayout` |
| `auth.css` | Sign-in / sign-up forms |
| `dashboard.css` | `Dashboard` (38 KB — sidebar, sandbox, news, chat panel, quotes) |
| `financial-goals.css` | `FinancialGoals` |
| `pp-hub.css` | `PersonalizedPortfolioHub`, `personalized/AssessmentQuiz` |
| `rag-contracts.css` | `RagContracts` |
| `finvest-certificate.css` | `FinvestCertificate`, `ProfileNftCertificates` |
| `investing-stories.css` | `InvestingStoriesSlideshow` |

## `assets/`

Bundled assets (imported via ES modules). Currently the hero coin video, hero PNG, and the default Vite/React SVGs.

# `api/` (root) and `FRONTEND/api/`

These are the Vercel-style serverless functions that power the SPA. There are two physical locations but exactly one source of truth.

## Two locations, one source of truth

```
Finvest/
├── api/                       ← Discovered by Vercel when project root = repo root.
│   ├── chat.js                  Each file is a 1-line ESM re-export, e.g.
│   ├── rag-chat.js                export { default } from '../FRONTEND/api/chat.js'
│   ├── rag-embed.js
│   ├── voice.js
│   ├── voice-transcribe.js
│   ├── cert-issue.js
│   └── market/yahoo-chart.js
└── FRONTEND/
    └── api/                   ← Canonical handlers. Edit here.
        ├── _lib/
        │   ├── chatHelpers.js
        │   └── llmChat.js
        ├── chat.js
        ├── rag-chat.js
        ├── rag-embed.js
        ├── voice.js
        ├── voice-transcribe.js
        ├── cert-issue.js
        └── market/yahoo-chart.js
```

The same files run in two modes:

1. **Vercel** — discovered automatically from `api/` at deploy time.
2. **Local Vite** — `FRONTEND/vite-plugins/finvestLocalApi.js` mounts middleware that imports the matching file in `FRONTEND/api/` for every `/api/...` request and patches `res.status/json/send` so the handler signature is identical to Vercel's.

## `_lib/` (shared server helpers)

| File | Exports | Purpose |
|------|---------|---------|
| `chatHelpers.js` | `supabaseForUserJwt`, `compactProfileForPrompt`, `extractTickerCandidates`, `buildAlphaVantageContext`, `parseHistoryMessages` | Build the per-request Supabase client (forwards the user's JWT so RLS applies), strip noisy fields out of the profile JSON before stuffing it into a prompt, find candidate tickers in user input, fetch delayed Alpha Vantage quotes for those tickers, normalize chat history roles |
| `llmChat.js` | `resolveProvider`, `generateChatReply` | Provider abstraction. `resolveProvider()` reads `LLM_PROVIDER` (`auto`/`groq`/`gemini`) and the relevant API keys; `generateChatReply(messages, opts)` dispatches to Groq's OpenAI-compatible chat or Gemini's `models:generateContent` and returns `{ reply, provider, model }` |

## Routes

| Route | Method | Purpose | Source |
|-------|--------|---------|--------|
| `/api/chat` | POST | Decode Your Finance Self assistant. Pulls the caller's profile under RLS, optionally enriches with Alpha Vantage quotes, then asks the LLM. | `chat.js` |
| `/api/rag-chat` | POST | Contract AI. Builds a strict 5-rule prompt with risk-tag template (⚠️ Risk / 💰 Cost / ⏳ Deadline / 🔒 Restriction). | `rag-chat.js` |
| `/api/rag-embed` | POST | Returns Gemini text embeddings. Auto-resolves a working embed model on the first text, then embeds the rest with up to 4 parallel workers. | `rag-embed.js` |
| `/api/voice` | POST | 1-2 sentence answer for the floating voice assistant. | `voice.js` |
| `/api/voice-transcribe` | POST | Raw audio bytes in → Groq Whisper → `{ text }`. Body parser disabled. | `voice-transcribe.js` |
| `/api/cert-issue` | POST | Idempotent: canonicalizes the supplied certificate, hashes with `keccak256`, and (only if not already on-chain) calls `FinvestCertRegistry.issue(hash, kind)` from the issuer wallet. Returns `{ hash, kind, alreadyIssued, timestamp, txHash? }`. | `cert-issue.js` |
| `/api/market/yahoo-chart` | GET | CORS-free proxy for `query1.finance.yahoo.com/v8/finance/chart/<SYMBOL>`. | `market/yahoo-chart.js` |

## Server-only env vars used here

| Var | Used by |
|-----|---------|
| `LLM_PROVIDER` | `_lib/llmChat.js` (auto / groq / gemini) |
| `GROQ_API_KEY`, `GROQ_MODEL` | Groq chat |
| `GROQ_STT_MODEL` | `voice-transcribe.js` (default `whisper-large-v3-turbo`) |
| `GEMINI_API_KEY` (or `GOOGLE_AI_API_KEY` / `VITE_GEMINI_API_KEY`) | Gemini chat + embeddings |
| `GEMINI_CHAT_MODEL`, `GEMINI_EMBED_MODEL` | Gemini overrides |
| `ALPHA_VANTAGE_KEY` (or `ALPHA_VANTAGE_API_KEY`) | `chatHelpers.buildAlphaVantageContext` |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | `chatHelpers.supabaseForUserJwt` |
| `CERT_REGISTRY_ADDRESS` (fallback `VITE_CERT_REGISTRY_ADDRESS`) | `cert-issue.js` |
| `CERT_REGISTRY_RPC_URL` (fallback `VITE_CERT_REGISTRY_RPC_URL`) | `cert-issue.js` |
| `CERT_ISSUER_PRIVATE_KEY` | `cert-issue.js` (server-only signing key, must own the contract) |

None of these are `VITE_*` — they're never exposed to the browser bundle.

## Adding a new route

1. Create `FRONTEND/api/<name>.js` that exports `default async function handler(req, res)`.
2. Create a 1-line re-export at `api/<name>.js`:
   ```js
   export { default } from '../FRONTEND/api/<name>.js';
   ```
3. Register the dev mapping in `FRONTEND/vite-plugins/finvestLocalApi.js` (`ROUTES`).
4. Document the contract in [`architecture.md`](../architecture.md) §4 and update env tables if you added a new variable.

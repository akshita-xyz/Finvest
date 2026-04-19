# Finvest documentation

Authoritative docs for the Finvest monorepo. Start with the architecture and drill down via the per-folder pages.

## Top-level

| File | Read it for |
|------|-------------|
| [`architecture.md`](architecture.md) | Full system architecture: topology, runtime, data model, ML, deployment, env, gotchas |
| [`PRODUCT BRIEF.md`](PRODUCT%20BRIEF.md) | Why Finvest exists — problem, design principles, feature areas |
| [`QUIZ_CALCULATIONS.md`](QUIZ_CALCULATIONS.md) | Authoritative spec for the Emotional Readiness and Decode Your Finance Self quiz scoring |
| [`pitch.md`](pitch.md) | Hackathon-style talk track |

## Per-folder explanations

Each file in [`folders/`](folders/) explains what one top-level directory in the repo is for, what lives inside it, and how it interacts with the rest of the system.

| Folder | Doc |
|--------|-----|
| `FRONTEND/` | [`folders/FRONTEND.md`](folders/FRONTEND.md) |
| `FRONTEND/src/` (deep dive) | [`folders/FRONTEND-src.md`](folders/FRONTEND-src.md) |
| `FRONTEND/api/` and root `api/` | [`folders/api.md`](folders/api.md) |
| `blockchain/` | [`folders/blockchain.md`](folders/blockchain.md) |
| `supabase/` | [`folders/supabase.md`](folders/supabase.md) |

## Conventions

- Educational product. Nothing here is financial advice.
- Two JS ecosystems coexist: ESM (frontend, serverless) and CommonJS (`blockchain/` Hardhat workspace).
- Server secrets live under `process.env` without the `VITE_` prefix; browser-side keys are `VITE_*` and baked at build time.
- Source-of-truth for serverless logic is **`FRONTEND/api/`** — root `api/*.js` files exist only as Vercel re-exports.

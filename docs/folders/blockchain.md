# `blockchain/`

Optional Hardhat workspace for **`FinvestCertRegistry`** — a tamper-evident certificate registry. The product runs fine without it; when configured, the SPA can publish keccak256 fingerprints of completed certificates on-chain, and the public `/verify` page lets anyone re-hash a certificate and confirm Finvest issued it.

> The certificate JSON itself **never** goes on-chain — only its 32-byte fingerprint does. The contract is therefore privacy-preserving and very cheap to use.

## Layout

```
blockchain/
├── contracts/
│   └── FinvestCertRegistry.sol  # Owner-only issuance, public verification
├── deployments/                 # Outputs land here as <network>.json
├── scripts/
│   ├── deploy.js                # Compiles + deploys + writes deployments/<network>.json
│   ├── sync-frontend-env.js     # Pushes contract address + RPC URL into FRONTEND/.env
│   ├── run-local-cert-stack.js  # One-shot: hardhat node → deploy → env sync
│   └── issue-cert.js            # Manual issue helper (hashes a JSON file then issue())
├── hardhat.config.js            # Networks: hardhat, localhost (31337), sepolia
├── package.json
├── .env.example
└── .gitignore
```

## The contract

[`contracts/FinvestCertRegistry.sol`](../../blockchain/contracts/FinvestCertRegistry.sol) — built on `@openzeppelin/contracts ^4.9.6 / Ownable`:

- **State**
  - `mapping(bytes32 => uint256) issuedAt` — hash → unix timestamp (0 = never issued).
  - `mapping(bytes32 => bytes32) certKind` — opaque tag (e.g. `keccak256("portfolio")`).
  - `uint256 totalIssued` — running count.
- **Writes** (owner-only)
  - `issue(bytes32 certHash, bytes32 kind)` — reverts on duplicate; emits `CertificateIssued`.
- **Reads** (public)
  - `isValid(bytes32 certHash) → bool`
  - `lookup(bytes32 certHash) → (uint256 timestamp, bytes32 kind)` — one RPC call for the verify page.

There are no transfers, no approvals, no metadata server, no upgrade proxy. Everything else (ownership transfer, multiple issuers, revocation) is a future extension.

## Networks

`hardhat.config.js`:

| Network | When to use |
|---------|-------------|
| `hardhat` | In-process for unit work / scripted runs |
| `localhost` | Spun up by `npx hardhat node`; dev-time integration with the SPA |
| `sepolia`  | Public testnet (RPC from `SEPOLIA_RPC_URL` / `ALCHEMY_SEPOLIA_URL`, signer from `DEPLOYER_PRIVATE_KEY`) |

## Scripts

| Script | What it does |
|--------|--------------|
| `npm run compile` | `hardhat compile` |
| `npm run deploy:localhost` | Deploys to a running local node and writes `deployments/localhost.json` |
| `npm run deploy:sepolia` | Same for Sepolia |
| `npm run env:sync` | Reads `deployments/<network>.json` and merges `VITE_CERT_REGISTRY_ADDRESS`, `VITE_CERT_REGISTRY_RPC_URL`, `CERT_REGISTRY_ADDRESS`, `CERT_REGISTRY_RPC_URL` into `FRONTEND/.env` |
| `npm run cert:auto-local` | One-shot: spawns `hardhat node` in the background, waits for port 8545, deploys, syncs env. Cross-platform (Node ≥18). |
| `npm run cert:issue --network <net>` | Hashes a JSON file (`CERT_FILE=...`) and publishes its hash via `issue()` |

After running `cert:auto-local`, **paste a prefunded Hardhat private key** into `FRONTEND/.env` as `CERT_ISSUER_PRIVATE_KEY=0x...`. That's the wallet `/api/cert-issue` uses to sign issuance transactions. (On localhost, any of the 20 accounts that `npx hardhat node` prints will do — they each hold 10 000 fake ETH.)

## End-to-end issuance + verification flow

```
┌──────────────────────────┐       POST /api/cert-issue      ┌────────────────────────┐
│  Profile → Verify button │ ──────────────────────────────▶ │ FRONTEND/api/cert-issue │
│  (FinvestCertificate)    │      { certificate: {...} }     │   (Node serverless)     │
└──────────────────────────┘                                 └─────────┬───────────────┘
            │                                                          │ canonicalize → keccak256
            │                                                          ▼
            │                                              ┌──────────────────────────┐
            │                                              │ FinvestCertRegistry      │
            │                                              │ .issue(hash, kind)       │
            │                                              │ (signed by deployer key) │
            │                                              └─────────┬────────────────┘
            ▼                                                        │ event Issued
  /verify?cert=<base64url(canonicalJSON)>                            ▼
            │                                              On-chain registry now has the hash
            ▼
┌──────────────────────────┐    JsonRpcProvider.lookup(hash)
│ VerifyCertificate.jsx    │ ──────────────────────────────▶ FinvestCertRegistry (read-only)
│ • re-hashes locally      │ ◀──────────────────────────────  (timestamp, kind)
│ • renders ✅ / ❌         │
└──────────────────────────┘
```

The frontend uses **ethers v6** ([`certRegistryClient.js`](../../FRONTEND/src/lib/certRegistryClient.js)). The issuer endpoint also uses ethers v6 — but the Hardhat tooling itself is **ethers v5** under `@nomiclabs/hardhat-ethers`, which is why the two `package.json`s pin different majors. They never share a process so they don't conflict.

## Operational notes

- The contract owner is whoever deployed it. Only that wallet can call `issue`. The serverless endpoint must therefore know that wallet's private key (`CERT_ISSUER_PRIVATE_KEY`).
- Re-issuing an already-published hash reverts. `/api/cert-issue` checks `issuedAt(hash)` first and returns `{ alreadyIssued: true }` without sending a transaction — so the verify button is safe to spam.
- `deployments/*.json` is gitignored. To pin the address into git-tracked config, copy it into your hosting provider's environment instead.
- For mainnet you'd want a multi-sig owner, gas estimation, and probably a relayer in front of the issuer wallet — none of that is in scope here.

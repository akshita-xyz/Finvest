/**
 * POST /api/cert-issue
 *
 * Idempotent: hashes the supplied certificate (canonical JSON → keccak256), checks the
 * on-chain registry, and only sends an `issue(hash, kind)` transaction when the hash
 * is not already published. Returns the hash + on-chain timestamp + (if just minted)
 * the tx hash.
 *
 * Request:  { certificate: <object> }
 * Response: { hash, kind, alreadyIssued: boolean, timestamp: number, txHash?: string }
 *
 * Server env (all live in FRONTEND/.env or the host's env):
 *   CERT_REGISTRY_ADDRESS       (or fall back to VITE_CERT_REGISTRY_ADDRESS)
 *   CERT_REGISTRY_RPC_URL       (or fall back to VITE_CERT_REGISTRY_RPC_URL)
 *   CERT_ISSUER_PRIVATE_KEY     server-only — must be the contract owner's key
 */

import { Contract, JsonRpcProvider, Wallet, keccak256, toUtf8Bytes } from 'ethers';

const REGISTRY_ABI = [
  'function issue(bytes32 certHash, bytes32 kind)',
  'function issuedAt(bytes32 certHash) view returns (uint256)',
  'function lookup(bytes32 certHash) view returns (uint256 timestamp, bytes32 kind)',
];

const ZERO_BYTES32 = '0x' + '00'.repeat(32);

/** MUST match FRONTEND/src/lib/certificateHash.js#canonicalize byte-for-byte. */
function canonicalize(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalize).join(',') + ']';
  const keys = Object.keys(value).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalize(value[k])).join(',') + '}';
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  if (!chunks.length) return {};
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function envFirst(...names) {
  for (const n of names) {
    const v = process.env[n];
    if (v && String(v).trim()) return String(v).trim();
  }
  return '';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }

  const address = envFirst('CERT_REGISTRY_ADDRESS', 'VITE_CERT_REGISTRY_ADDRESS');
  const rpcUrl = envFirst('CERT_REGISTRY_RPC_URL', 'VITE_CERT_REGISTRY_RPC_URL');
  const issuerKey = envFirst('CERT_ISSUER_PRIVATE_KEY');

  if (!address || !rpcUrl) {
    res.status(503).json({
      error:
        'Certificate registry not configured. Set CERT_REGISTRY_ADDRESS and CERT_REGISTRY_RPC_URL in FRONTEND/.env (or run blockchain/scripts/sync-frontend-env.js).',
    });
    return;
  }

  const body = await readJsonBody(req);
  if (body === null) {
    res.status(400).json({ error: 'Invalid JSON body.' });
    return;
  }
  const certificate = body && typeof body === 'object' ? body.certificate : null;
  if (!certificate || typeof certificate !== 'object') {
    res.status(400).json({ error: 'Missing `certificate` object in request body.' });
    return;
  }

  let canonicalJson;
  try {
    canonicalJson = canonicalize(certificate);
  } catch (e) {
    res.status(400).json({ error: `Could not canonicalize certificate: ${e?.message || e}` });
    return;
  }

  const hash = keccak256(toUtf8Bytes(canonicalJson));
  const kindStr = String(certificate?.type || '').trim();
  const kind = kindStr ? keccak256(toUtf8Bytes(kindStr)) : ZERO_BYTES32;

  const provider = new JsonRpcProvider(rpcUrl);

  let registry;
  try {
    registry = new Contract(address, REGISTRY_ABI, provider);
    const existingTs = await registry.issuedAt(hash);
    const existingTsNum = Number(existingTs?.toString?.() ?? existingTs) || 0;
    if (existingTsNum > 0) {
      res.status(200).json({
        hash,
        kind,
        alreadyIssued: true,
        timestamp: existingTsNum,
      });
      return;
    }
  } catch (e) {
    res.status(502).json({ error: `Could not read registry at ${address}: ${e?.message || e}` });
    return;
  }

  if (!issuerKey) {
    res.status(503).json({
      error:
        'CERT_ISSUER_PRIVATE_KEY is not configured. Without it the server cannot publish new certificate hashes. (Already-issued certs can still be verified — read-only.)',
      hash,
    });
    return;
  }

  try {
    const wallet = new Wallet(issuerKey, provider);
    const writable = registry.connect(wallet);
    const tx = await writable.issue(hash, kind);
    const receipt = await tx.wait();
    const block = receipt?.blockNumber ? await provider.getBlock(receipt.blockNumber) : null;
    const timestamp = block?.timestamp ? Number(block.timestamp) : Math.floor(Date.now() / 1000);
    res.status(200).json({
      hash,
      kind,
      alreadyIssued: false,
      timestamp,
      txHash: tx.hash,
    });
  } catch (e) {
    const msg = e && typeof e === 'object' && 'message' in e ? String(e.message) : String(e);
    res.status(502).json({ error: `Issue transaction failed: ${msg}`, hash });
  }
}

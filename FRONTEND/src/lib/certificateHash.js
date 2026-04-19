import { keccak256, toUtf8Bytes } from 'ethers';

/**
 * Deterministic JSON: keys sorted lexicographically at every depth, no whitespace.
 * MUST match the canonicalize() in `blockchain/scripts/issue-cert.js` and
 * `FRONTEND/api/cert-issue.js` byte-for-byte — that's the entire point of pinning the hash.
 */
export function canonicalize(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalize).join(',') + ']';
  const keys = Object.keys(value).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalize(value[k])).join(',') + '}';
}

/** keccak256(canonicalJson(cert)) → 0x-prefixed hex (32 bytes). */
export function hashCertificate(cert) {
  return keccak256(toUtf8Bytes(canonicalize(cert)));
}

/** keccak256("portfolio") etc. → bytes32 tag stored alongside the hash on-chain. */
export function hashKind(kind) {
  const k = String(kind || '').trim();
  if (!k) return '0x' + '00'.repeat(32);
  return keccak256(toUtf8Bytes(k));
}

/** Browser-safe base64url for embedding the cert object in a URL. */
function base64UrlEncode(str) {
  if (typeof window === 'undefined') {
    return Buffer.from(str, 'utf8').toString('base64url');
  }
  const b64 = btoa(unescape(encodeURIComponent(str)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(s) {
  const norm = String(s || '').replace(/-/g, '+').replace(/_/g, '/');
  const pad = norm.length % 4 === 0 ? '' : '='.repeat(4 - (norm.length % 4));
  if (typeof window === 'undefined') {
    return Buffer.from(norm + pad, 'base64').toString('utf8');
  }
  return decodeURIComponent(escape(atob(norm + pad)));
}

/** `/verify?cert=<base64url(canonicalJson(cert))>` — same canonicalisation as the hash. */
export function buildVerifyUrl(cert, originOverride) {
  const json = canonicalize(cert);
  const enc = base64UrlEncode(json);
  const origin =
    originOverride ||
    (typeof window !== 'undefined' ? window.location.origin : '');
  return `${origin}/verify?cert=${enc}`;
}

/** Inverse of buildVerifyUrl — returns the parsed cert object (canonicalisation preserved). */
export function decodeCertParam(param) {
  if (!param) return null;
  try {
    const json = base64UrlDecode(param);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

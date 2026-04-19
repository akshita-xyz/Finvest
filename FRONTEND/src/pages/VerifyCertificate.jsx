import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, Copy, Loader2, ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react';
import { FinvestCertificate } from '../components/FinvestCertificate';
import { decodeCertParam, hashCertificate } from '../lib/certificateHash';
import { lookupCertificate } from '../lib/certRegistryClient';
import '../styles/verify-certificate.css';

const REGISTRY_ADDRESS = String(import.meta.env.VITE_CERT_REGISTRY_ADDRESS || '').trim();
const REGISTRY_RPC = String(import.meta.env.VITE_CERT_REGISTRY_RPC_URL || '').trim();

/** "2026-04-19 12:34 UTC" */
function formatTimestamp(unixSeconds) {
  if (!unixSeconds) return '';
  try {
    return new Date(unixSeconds * 1000).toLocaleString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return new Date(unixSeconds * 1000).toISOString();
  }
}

/** "0x4a7f…c9e1" — keep middle short for narrow layouts. */
function shortenHex(hex, lead = 10, tail = 6) {
  const s = String(hex || '');
  if (s.length <= lead + tail + 1) return s;
  return `${s.slice(0, lead)}…${s.slice(-tail)}`;
}

function statusFor(state, valid) {
  if (state === 'loading') return { tone: 'pending', icon: Loader2, label: 'Checking on-chain registry…' };
  if (state === 'error') return { tone: 'error', icon: ShieldAlert, label: 'Could not reach the registry' };
  if (state === 'unsupported') return { tone: 'error', icon: ShieldAlert, label: 'Verification not configured for this deployment' };
  if (state === 'idle') return { tone: 'pending', icon: ShieldQuestion, label: 'Awaiting certificate' };
  return valid
    ? { tone: 'ok', icon: ShieldCheck, label: 'Verified — issued by Finvest' }
    : { tone: 'fail', icon: ShieldAlert, label: 'Not found in registry' };
}

function deriveDetailLines(cert) {
  const lines = [];
  const p = cert?.payload || {};
  if (cert?.type === 'portfolio') {
    if (typeof p.fearScore === 'number') lines.push(`Modeled fear score: ${p.fearScore}/100`);
    if (p.allocation) {
      lines.push(
        `Suggested mix: ${p.allocation.stocks}% stocks · ${p.allocation.bonds}% bonds · ${p.allocation.cash}% cash${p.allocation.label ? ` (${p.allocation.label})` : ''}`,
      );
    }
  } else if (cert?.type === 'emotion') {
    if (typeof p.overallReadiness === 'number') {
      lines.push(`Readiness index: ${p.overallReadiness}/100 across six mindset pillars.`);
    }
    if (p.archetype) lines.push(`Archetype: ${p.archetype}`);
  }
  return lines;
}

function awardTitleFor(cert) {
  if (!cert) return '';
  if (cert.type === 'portfolio') return cert.payload?.clusterLabel || 'Investor profile';
  if (cert.type === 'emotion') return cert.payload?.archetype || 'Investing mindset';
  return 'Finvest certificate';
}

function variantFor(cert) {
  return cert?.type === 'emotion' ? 'emotion' : 'decode';
}

export default function VerifyCertificate() {
  const [params] = useSearchParams();
  const certParam = params.get('cert');
  const [pasted, setPasted] = useState('');
  const [parseError, setParseError] = useState('');

  const certificate = useMemo(() => decodeCertParam(certParam), [certParam]);

  // `mode` records whether the current result was derived from a full cert (we can render
  // it) or just a raw hash (we can only confirm authenticity, not display details).
  const [chain, setChain] = useState(
    /** @type {{ state: 'idle'|'loading'|'ok'|'error'|'unsupported'; valid?: boolean; timestamp?: number; error?: string; hash?: string; mode?: 'cert'|'hash' }} */ ({ state: 'idle' }),
  );

  const runHashCheck = useCallback(async (hash, mode) => {
    if (!REGISTRY_ADDRESS || !REGISTRY_RPC) {
      setChain({ state: 'unsupported', hash, mode });
      return;
    }
    setChain({ state: 'loading', hash, mode });
    try {
      const result = await lookupCertificate({
        rpcUrl: REGISTRY_RPC,
        contractAddress: REGISTRY_ADDRESS,
        certHash: hash,
      });
      setChain({
        state: 'ok',
        valid: result.valid,
        timestamp: result.timestamp,
        hash,
        mode,
      });
    } catch (e) {
      setChain({
        state: 'error',
        hash,
        mode,
        error: e instanceof Error ? e.message : 'Network failure reading the registry.',
      });
    }
  }, []);

  const runCheck = useCallback(
    async (cert) => {
      if (!cert) {
        setChain({ state: 'idle' });
        return;
      }
      let hash = '';
      try {
        hash = hashCertificate(cert);
      } catch (e) {
        setChain({ state: 'error', error: e instanceof Error ? e.message : 'Hash failed.' });
        return;
      }
      await runHashCheck(hash, 'cert');
    },
    [runHashCheck],
  );

  useEffect(() => {
    runCheck(certificate);
  }, [certificate, runCheck]);

  const handlePasteVerify = useCallback(() => {
    setParseError('');
    const trimmed = pasted.trim();
    if (!trimmed) {
      setParseError('Paste a certificate JSON, a /verify?cert=… URL, or a 0x… keccak256 fingerprint.');
      return;
    }
    // 1) Raw fingerprint (66 chars: "0x" + 64 hex). Verify by hash only.
    if (/^0x[0-9a-f]{64}$/i.test(trimmed)) {
      runHashCheck(trimmed.toLowerCase(), 'hash');
      return;
    }
    // 2) Full certificate JSON.
    let cert = null;
    try {
      const obj = JSON.parse(trimmed);
      if (obj && typeof obj === 'object') cert = obj;
    } catch {
      // 3) /verify?cert=… URL.
      try {
        const url = new URL(trimmed);
        const v = url.searchParams.get('cert');
        if (v) cert = decodeCertParam(v);
      } catch {
        cert = null;
      }
    }
    if (!cert) {
      setParseError(
        'Could not read that. Paste a certificate JSON, a /verify?cert=… URL, or a 0x… fingerprint.',
      );
      return;
    }
    runCheck(cert);
  }, [pasted, runCheck, runHashCheck]);

  const status = statusFor(chain.state, chain.valid);
  const StatusIcon = status.icon;
  const detailLines = deriveDetailLines(certificate);
  const verifyHash = chain.hash || (certificate ? hashCertificate(certificate) : '');
  // When the user pasted only a hash, we can confirm "yes/no on chain" but cannot render the cert.
  const isHashOnly = chain.mode === 'hash' && !certificate;

  return (
    <div className="verify-page">
      <header className="verify-header">
        <Link to="/" className="verify-back" aria-label="Back to Finvest">
          <ArrowLeft size={16} aria-hidden /> Finvest
        </Link>
        <div className="verify-brand">
          <BadgeCheck size={20} aria-hidden />
          <span>Certificate Verification</span>
        </div>
      </header>

      <main className="verify-main">
        <section className={`verify-status verify-status--${status.tone}`} aria-live="polite">
          <div className="verify-status-icon">
            <StatusIcon size={28} aria-hidden className={chain.state === 'loading' ? 'verify-spin' : ''} />
          </div>
          <div className="verify-status-body">
            <p className="verify-status-eyebrow">On-chain status</p>
            <p className="verify-status-label">{status.label}</p>
            {chain.state === 'ok' && chain.valid ? (
              <p className="verify-status-meta">
                Published on <strong>{formatTimestamp(chain.timestamp)}</strong>
              </p>
            ) : null}
            {chain.state === 'ok' && !chain.valid ? (
              <p className="verify-status-meta">
                The contract has no record of this certificate. It may have been altered or never issued.
              </p>
            ) : null}
            {chain.state === 'error' ? (
              <p className="verify-status-meta">{chain.error}</p>
            ) : null}
            {chain.state === 'unsupported' ? (
              <p className="verify-status-meta">
                Set <code>VITE_CERT_REGISTRY_ADDRESS</code> and <code>VITE_CERT_REGISTRY_RPC_URL</code> in
                <code> FRONTEND/.env</code> to enable verification.
              </p>
            ) : null}
          </div>
        </section>

        {certificate ? (
          <section className="verify-cert">
            <FinvestCertificate
              variant={variantFor(certificate)}
              recipientName={String(certificate.recipient || 'Finvest learner')}
              awardTitle={awardTitleFor(certificate)}
              detailLines={detailLines}
              issuedAtIso={String(certificate.issuedAt || '')}
              finePrint="Independently verifiable on-chain via Finvest Certificate Registry."
            />

            <div className="verify-meta-grid">
              <MetaRow label="Certificate type" value={certificate.type || '—'} />
              <MetaRow label="Recipient" value={certificate.recipient || '—'} />
              <MetaRow label="Issued (per certificate)" value={certificate.issuedAt ? new Date(certificate.issuedAt).toLocaleString() : '—'} />
              <MetaRow label="Schema version" value={`v${certificate.v ?? 1}`} />
              <MetaRow
                label="Certificate fingerprint (keccak256)"
                value={shortenHex(verifyHash)}
                copyValue={verifyHash}
                mono
              />
              {REGISTRY_ADDRESS ? (
                <MetaRow
                  label="Registry contract"
                  value={shortenHex(REGISTRY_ADDRESS)}
                  copyValue={REGISTRY_ADDRESS}
                  mono
                />
              ) : null}
              {REGISTRY_RPC ? <MetaRow label="RPC endpoint" value={REGISTRY_RPC} mono /> : null}
            </div>
          </section>
        ) : isHashOnly ? (
          <section className="verify-cert verify-cert--hash-only">
            <div className="verify-hashcard">
              <p className="verify-hashcard-eyebrow">Fingerprint-only verification</p>
              <p className="verify-hashcard-text">
                You verified by pasting a 32-byte <code>keccak256</code> fingerprint. The on-chain registry
                {chain.valid ? ' confirms ' : ' has no record of '} this hash, but the original certificate
                JSON wasn't supplied — so we can't render the recipient name, allocation, or other details.
              </p>
              <p className="verify-hashcard-text">
                To see the rendered certificate too, ask the holder for the full <code>/verify?cert=…</code>
                link or the raw certificate JSON, and paste that here instead.
              </p>
            </div>
            <div className="verify-meta-grid">
              <MetaRow
                label="Fingerprint (keccak256)"
                value={shortenHex(verifyHash)}
                copyValue={verifyHash}
                mono
              />
              {REGISTRY_ADDRESS ? (
                <MetaRow
                  label="Registry contract"
                  value={shortenHex(REGISTRY_ADDRESS)}
                  copyValue={REGISTRY_ADDRESS}
                  mono
                />
              ) : null}
              {REGISTRY_RPC ? <MetaRow label="RPC endpoint" value={REGISTRY_RPC} mono /> : null}
            </div>
            <button type="button" className="verify-cta verify-cta--ghost" onClick={() => setChain({ state: 'idle' })}>
              Verify another
            </button>
          </section>
        ) : (
          <section className="verify-empty">
            <p className="verify-empty-title">No certificate provided.</p>
            <p className="verify-empty-hint">
              Paste any of these:
            </p>
            <ul className="verify-empty-list">
              <li>The full certificate JSON object.</li>
              <li>
                A <code>/verify?cert=…</code> URL (what the QR code on the certificate encodes).
              </li>
              <li>
                Just the <code>keccak256</code> fingerprint — a <code>0x</code> followed by 64 hex chars.
                You'll get a yes/no, but the certificate body won't render.
              </li>
            </ul>
            <textarea
              className="verify-paste"
              rows={6}
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              placeholder='Paste JSON, a verify URL, or 0x… (32-byte hex fingerprint)'
            />
            {parseError ? <p className="verify-error">{parseError}</p> : null}
            <button type="button" className="verify-cta" onClick={handlePasteVerify}>
              Verify
            </button>
          </section>
        )}

        <details className="verify-howto">
          <summary>How does this work?</summary>
          <p>
            Each Finvest certificate is converted into a deterministic JSON string and hashed with{' '}
            <code>keccak256</code>. That 32-byte fingerprint is published on a public smart contract
            (<code>FinvestCertRegistry</code>) by the Finvest issuer wallet — but the certificate itself
            is never sent on-chain.
          </p>
          <p>
            To verify, this page either re-hashes the certificate you supplied or takes the fingerprint
            you pasted directly, then asks the contract whether that hash exists. A match proves the
            certificate was issued by Finvest and has not been altered since. A miss means either the
            certificate was tampered with or it was never issued.
          </p>
        </details>
      </main>
    </div>
  );
}

function MetaRow({ label, value, copyValue, mono }) {
  const [copied, setCopied] = useState(false);
  const onCopy = () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    navigator.clipboard.writeText(String(copyValue || value)).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      },
      () => {
        /* ignore */
      },
    );
  };
  return (
    <div className="verify-meta-row">
      <span className="verify-meta-label">{label}</span>
      <span className={`verify-meta-value${mono ? ' verify-meta-value--mono' : ''}`}>{value}</span>
      {copyValue ? (
        <button type="button" className="verify-copy" onClick={onCopy} aria-label={`Copy ${label}`}>
          <Copy size={14} aria-hidden /> {copied ? 'Copied' : 'Copy'}
        </button>
      ) : null}
    </div>
  );
}

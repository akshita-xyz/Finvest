import React, { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, BadgeCheck, ExternalLink, Loader2, Lock, ShieldAlert, Sparkles } from 'lucide-react';
import { CertificateModal, FinvestCertificate } from './FinvestCertificate';
import { buildEmotionCertificate, buildPortfolioCertificate } from '../lib/certificateData';
import { buildVerifyUrl } from '../lib/certificateHash';

const REGISTRY_CONFIGURED = Boolean(
  String(import.meta.env.VITE_CERT_REGISTRY_ADDRESS || '').trim() &&
    String(import.meta.env.VITE_CERT_REGISTRY_RPC_URL || '').trim(),
);

/**
 * @param {{
 *   dashboardPrefs: Record<string, unknown> | null | undefined;
 *   userId?: string;
 *   recipientName: string;
 * }} props
 */
export default function ProfileNftCertificates({ dashboardPrefs, userId, recipientName }) {
  const displayName = recipientName?.trim() || 'Finvest learner';

  const portfolioCert = buildPortfolioCertificate({
    userId,
    recipient: displayName,
    dashboardPrefs,
  });
  const emotionCert = buildEmotionCertificate({
    userId,
    recipient: displayName,
    dashboardPrefs,
  });
  const portfolioEarned = Boolean(portfolioCert);
  const emotionEarned = Boolean(emotionCert);

  const [certModal, setCertModal] = useState(/** @type {null | 'portfolio' | 'emotion'} */ (null));
  const [verifyState, setVerifyState] = useState(
    /** @type {Record<string, { state: 'idle'|'issuing'|'error'; error?: string }>} */ ({}),
  );

  const setRowState = useCallback((key, patch) => {
    setVerifyState((s) => ({ ...s, [key]: { ...(s[key] || { state: 'idle' }), ...patch } }));
  }, []);

  const onVerify = useCallback(
    async (key, cert) => {
      if (!cert) return;
      const verifyUrl = buildVerifyUrl(cert);
      if (!REGISTRY_CONFIGURED) {
        // Verification not wired up — open the page anyway, it'll explain what's missing.
        window.open(verifyUrl, '_blank', 'noopener,noreferrer');
        return;
      }
      setRowState(key, { state: 'issuing', error: '' });
      try {
        const res = await fetch('/api/cert-issue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ certificate: cert }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setRowState(key, {
            state: 'error',
            error: String(data?.error || `Issuer returned ${res.status}.`),
          });
          // Still open the verify page — it'll show the on-chain miss / unsupported state.
          window.open(verifyUrl, '_blank', 'noopener,noreferrer');
          return;
        }
        setRowState(key, { state: 'idle', error: '' });
        window.open(verifyUrl, '_blank', 'noopener,noreferrer');
      } catch (e) {
        setRowState(key, {
          state: 'error',
          error: e instanceof Error ? e.message : 'Network error.',
        });
        window.open(verifyUrl, '_blank', 'noopener,noreferrer');
      }
    },
    [setRowState],
  );

  const portfolioRow = verifyState.portfolio || { state: 'idle' };
  const emotionRow = verifyState.emotion || { state: 'idle' };
  const portfolioVerifyUrl = portfolioCert ? buildVerifyUrl(portfolioCert) : '';
  const emotionVerifyUrl = emotionCert ? buildVerifyUrl(emotionCert) : '';

  return (
    <section className="account-nft" aria-labelledby="account-nft-title">
      <h2 id="account-nft-title" className="account-nft-title">
        <Sparkles size={18} aria-hidden />
        Certificates &amp; badges
      </h2>
      <p className="account-nft-lead">
        Complete each learning flow to unlock a certificate. Hit <strong>Verify on chain</strong> to publish a
        tamper-evident fingerprint of your certificate to the Finvest registry — anyone with the link can
        independently confirm it was issued by Finvest.
      </p>

      <div className="account-nft-grid">
        <article
          className={`account-nft-card${portfolioEarned ? ' account-nft-card--open' : ' account-nft-card--locked'}`}
        >
          <div className="account-nft-card-head">
            {portfolioEarned ? <Award size={22} aria-hidden /> : <Lock size={22} aria-hidden />}
            <h3>Decode Your Finance Self</h3>
          </div>
          <p className="account-nft-card-desc">
            Timed personality quiz: your investor cluster, fear score, and suggested allocation are saved to
            your account.
          </p>
          {portfolioEarned ? (
            <>
              <p className="account-nft-meta">
                Unlocked{' '}
                {portfolioCert?.issuedAt ? new Date(portfolioCert.issuedAt).toLocaleString() : ''}
              </p>
              <div className="account-nft-cert-wrap">
                <FinvestCertificate
                  variant="decode"
                  recipientName={displayName}
                  awardTitle={portfolioCert?.payload?.clusterLabel || 'Investor profile'}
                  detailLines={detailLinesFor(portfolioCert)}
                  issuedAtIso={portfolioCert?.issuedAt}
                  finePrint="Profile record on Finvest. Verify on-chain via the button below."
                  verifyUrl={portfolioVerifyUrl}
                  compact
                />
                <div className="account-nft-actions">
                  <button
                    type="button"
                    className="account-nft-cert-btn"
                    onClick={() => setCertModal('portfolio')}
                  >
                    View full certificate
                  </button>
                  <button
                    type="button"
                    className="account-nft-verify-btn"
                    onClick={() => onVerify('portfolio', portfolioCert)}
                    disabled={portfolioRow.state === 'issuing'}
                  >
                    {portfolioRow.state === 'issuing' ? (
                      <>
                        <Loader2 className="account-nft-spin" size={14} aria-hidden /> Publishing…
                      </>
                    ) : (
                      <>
                        <BadgeCheck size={14} aria-hidden /> Verify on chain
                        <ExternalLink size={12} aria-hidden />
                      </>
                    )}
                  </button>
                </div>
                {portfolioRow.error ? (
                  <p className="account-nft-verify-error" role="alert">
                    <ShieldAlert size={12} aria-hidden /> {portfolioRow.error}
                  </p>
                ) : null}
              </div>
            </>
          ) : (
            <div className="account-nft-locked-block">
              <p className="account-nft-lock-label">Locked</p>
              <p className="account-nft-locked">Take the quiz to unlock your certificate.</p>
              <Link to="/personalized-portfolio?tab=quiz" className="account-nft-cta">
                Open Decode Your Finance Self quiz
              </Link>
            </div>
          )}
        </article>

        <article
          className={`account-nft-card${emotionEarned ? ' account-nft-card--open' : ' account-nft-card--locked'}`}
        >
          <div className="account-nft-card-head">
            {emotionEarned ? <Award size={22} aria-hidden /> : <Lock size={22} aria-hidden />}
            <h3>Investing mindset</h3>
          </div>
          <p className="account-nft-card-desc">
            Emotional Readiness Test on your dashboard: strengths, growth areas, and a readiness index before
            you take risk.
          </p>
          {emotionEarned ? (
            <>
              <p className="account-nft-meta">
                Unlocked{' '}
                {emotionCert?.issuedAt ? new Date(emotionCert.issuedAt).toLocaleString() : '(this device)'}
                {emotionCert?.payload?.archetype ? (
                  <span className="account-nft-pill">{emotionCert.payload.archetype}</span>
                ) : null}
              </p>
              <div className="account-nft-cert-wrap">
                <FinvestCertificate
                  variant="emotion"
                  recipientName={displayName}
                  awardTitle={emotionCert?.payload?.archetype || 'Investing mindset'}
                  detailLines={detailLinesFor(emotionCert)}
                  issuedAtIso={emotionCert?.issuedAt}
                  finePrint="Profile record on Finvest. Verify on-chain via the button below."
                  verifyUrl={emotionVerifyUrl}
                  compact
                />
                <div className="account-nft-actions">
                  <button
                    type="button"
                    className="account-nft-cert-btn"
                    onClick={() => setCertModal('emotion')}
                  >
                    View full certificate
                  </button>
                  <button
                    type="button"
                    className="account-nft-verify-btn"
                    onClick={() => onVerify('emotion', emotionCert)}
                    disabled={emotionRow.state === 'issuing'}
                  >
                    {emotionRow.state === 'issuing' ? (
                      <>
                        <Loader2 className="account-nft-spin" size={14} aria-hidden /> Publishing…
                      </>
                    ) : (
                      <>
                        <BadgeCheck size={14} aria-hidden /> Verify on chain
                        <ExternalLink size={12} aria-hidden />
                      </>
                    )}
                  </button>
                </div>
                {emotionRow.error ? (
                  <p className="account-nft-verify-error" role="alert">
                    <ShieldAlert size={12} aria-hidden /> {emotionRow.error}
                  </p>
                ) : null}
              </div>
            </>
          ) : (
            <div className="account-nft-locked-block">
              <p className="account-nft-lock-label">Locked</p>
              <p className="account-nft-locked">Take the Emotional Readiness Test to unlock.</p>
              <Link to="/dashboard#emotion-testing" className="account-nft-cta">
                Go to Dashboard — Emotional Readiness
              </Link>
            </div>
          )}
        </article>
      </div>

      <CertificateModal
        open={certModal === 'portfolio' && portfolioEarned}
        onClose={() => setCertModal(null)}
        title="Decode Your Finance Self"
        actions={
          <>
            <button
              type="button"
              className="finvest-cert-modal-btn"
              onClick={() => onVerify('portfolio', portfolioCert)}
              disabled={portfolioRow.state === 'issuing'}
            >
              {portfolioRow.state === 'issuing' ? 'Publishing…' : 'Verify on chain'}
            </button>
            <button
              type="button"
              className="finvest-cert-modal-btn finvest-cert-modal-btn--ghost"
              onClick={() => window.print()}
            >
              Print / save as PDF
            </button>
          </>
        }
      >
        {portfolioEarned ? (
          <FinvestCertificate
            variant="decode"
            recipientName={displayName}
            awardTitle={portfolioCert?.payload?.clusterLabel || 'Investor profile'}
            detailLines={detailLinesFor(portfolioCert)}
            issuedAtIso={portfolioCert?.issuedAt}
            finePrint="Saved to your Finvest profile. Independently verifiable via the QR code."
            verifyUrl={portfolioVerifyUrl}
          />
        ) : null}
      </CertificateModal>

      <CertificateModal
        open={certModal === 'emotion' && emotionEarned}
        onClose={() => setCertModal(null)}
        title="Investing mindset"
        actions={
          <>
            <button
              type="button"
              className="finvest-cert-modal-btn"
              onClick={() => onVerify('emotion', emotionCert)}
              disabled={emotionRow.state === 'issuing'}
            >
              {emotionRow.state === 'issuing' ? 'Publishing…' : 'Verify on chain'}
            </button>
            <button
              type="button"
              className="finvest-cert-modal-btn finvest-cert-modal-btn--ghost"
              onClick={() => window.print()}
            >
              Print / save as PDF
            </button>
          </>
        }
      >
        {emotionEarned ? (
          <FinvestCertificate
            variant="emotion"
            recipientName={displayName}
            awardTitle={emotionCert?.payload?.archetype || 'Investing mindset'}
            detailLines={detailLinesFor(emotionCert)}
            issuedAtIso={emotionCert?.issuedAt}
            finePrint="Saved to your Finvest profile. Independently verifiable via the QR code."
            verifyUrl={emotionVerifyUrl}
          />
        ) : null}
      </CertificateModal>

      {!REGISTRY_CONFIGURED ? (
        <p className="account-nft-chain-hint">
          The on-chain verification registry is not configured for this deployment. Verify buttons still open the
          public verify page so anyone can re-hash the certificate, but it will show <em>Not found</em> until an
          admin deploys <code>FinvestCertRegistry</code> and sets <code>VITE_CERT_REGISTRY_ADDRESS</code> +{' '}
          <code>VITE_CERT_REGISTRY_RPC_URL</code> in <code>FRONTEND/.env</code>.
        </p>
      ) : null}
    </section>
  );
}

function detailLinesFor(cert) {
  if (!cert) return [];
  const lines = [];
  const p = cert.payload || {};
  if (cert.type === 'portfolio') {
    if (typeof p.fearScore === 'number') lines.push(`Modeled fear score: ${p.fearScore}/100`);
    if (p.allocation) {
      lines.push(
        `Suggested mix: ${p.allocation.stocks}% stocks · ${p.allocation.bonds}% bonds · ${p.allocation.cash}% cash${p.allocation.label ? ` (${p.allocation.label})` : ''}`,
      );
    }
  } else if (cert.type === 'emotion') {
    if (typeof p.overallReadiness === 'number') {
      lines.push(`Readiness index: ${p.overallReadiness}/100 across six mindset pillars.`);
    }
  }
  return lines.length ? lines : ['Completed the Finvest learning flow.'];
}

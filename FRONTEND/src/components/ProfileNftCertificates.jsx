import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, Link2, Loader2, Lock, Sparkles } from 'lucide-react';
import { CertificateModal, FinvestCertificate } from './FinvestCertificate';

const EMOTION_STORAGE_KEY = 'finvest_emotion_mindset_v1';

function readEmotionLocalDone() {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage.getItem(EMOTION_STORAGE_KEY);
    if (!raw) return false;
    const o = JSON.parse(raw);
    return Boolean(o?.at);
  } catch {
    return false;
  }
}

/**
 * @param {{
 *   dashboardPrefs: Record<string, unknown> | null | undefined;
 *   walletFromMetadata: string;
 *   recipientName: string;
 * }} props
 */
export default function ProfileNftCertificates({ dashboardPrefs, walletFromMetadata, recipientName }) {
  const nft = dashboardPrefs?.nft_badges && typeof dashboardPrefs.nft_badges === 'object' ? dashboardPrefs.nft_badges : {};
  const assessment = dashboardPrefs?.assessment;
  const portfolioEarned = Boolean(nft.portfolioCertificate || assessment?.completedAt);
  const emotionEarned = Boolean(nft.emotionCertificate || readEmotionLocalDone());

  const contract = String(import.meta.env.VITE_BADGE_NFT_CONTRACT_ADDRESS || '').trim();
  const rpc = String(import.meta.env.VITE_NFT_RPC_URL || '').trim();

  const [chainBadges, setChainBadges] = useState(/** @type {{ id: string; tokenURI: string }[]} */ ([]));
  const [chainLoading, setChainLoading] = useState(false);
  const [chainErr, setChainErr] = useState('');
  const [certModal, setCertModal] = useState(/** @type {null | 'portfolio' | 'emotion'} */ (null));

  const displayName = recipientName?.trim() || 'Finvest learner';

  const loadChain = useCallback(async () => {
    const w = String(walletFromMetadata || '').trim();
    if (!contract || !rpc || !w) {
      setChainBadges([]);
      setChainErr('');
      return;
    }
    setChainLoading(true);
    setChainErr('');
    try {
      const { fetchOnChainBadges } = await import('../lib/badgeNftClient');
      const rows = await fetchOnChainBadges({
        rpcUrl: rpc, contractAddress: contract, walletAddress: w, });
      setChainBadges(rows);
    } catch (e) {
      setChainErr(e instanceof Error ? e.message : 'Could not read chain');
      setChainBadges([]);
    } finally {
      setChainLoading(false);
    }
  }, [contract, rpc, walletFromMetadata]);

  useEffect(() => {
    loadChain();
  }, [loadChain]);

  const portfolioIssued =
    nft.portfolioCertificateAt ||
    assessment?.completedAt ||
    new Date().toISOString();
  const portfolioTitle = String(nft.portfolioClusterLabel || assessment?.clusterLabel || 'Investor profile');
  const portfolioLines = [
    typeof nft.portfolioFearScore === 'number' || typeof assessment?.traits?.fearScore === 'number'
      ? `Modeled fear score: ${nft.portfolioFearScore ?? assessment?.traits?.fearScore}/100`
      : '',
    assessment?.allocation
      ? `Suggested mix: ${assessment.allocation.stocks}% stocks · ${assessment.allocation.bonds}% bonds · ${assessment.allocation.cash}% cash (${nft.portfolioAllocationLabel || assessment.allocation.label || ''})`
      : '',
  ].filter(Boolean);

  const emotionIssued = (() => {
    if (nft.emotionCertificateAt) return String(nft.emotionCertificateAt);
    try {
      const raw = localStorage.getItem(EMOTION_STORAGE_KEY);
      if (raw) {
        const o = JSON.parse(raw);
        if (o?.at) return new Date(o.at).toISOString();
      }
    } catch {
      /* ignore */
    }
    return new Date().toISOString();
  })();
  const emotionTitle = String(nft.emotionArchetype || 'Investing mindset');
  let emotionReadiness = nft.emotionReadiness;
  if (typeof emotionReadiness !== 'number') {
    try {
      const raw = localStorage.getItem(EMOTION_STORAGE_KEY);
      if (raw) {
        const o = JSON.parse(raw);
        if (typeof o.overallReadiness === 'number') emotionReadiness = o.overallReadiness;
      }
    } catch {
      /* ignore */
    }
  }
  const emotionLines = [
    typeof emotionReadiness === 'number' ? `Readiness index: ${emotionReadiness}/100 across six mindset pillars.` : '',
  ].filter(Boolean);

  return (
    <section className="account-nft" aria-labelledby="account-nft-title">
      <h2 id="account-nft-title" className="account-nft-title">
        <Sparkles size={18} aria-hidden />
        Certificates &amp; badges
      </h2>
      <p className="account-nft-lead">
        Complete each learning flow to unlock a certificate stored on your profile. On-chain badges are minted from the
        deployer wallet; see the note below when the contract is configured.
      </p>

      <div className="account-nft-grid">
        <article className={`account-nft-card${portfolioEarned ? ' account-nft-card--open' : ' account-nft-card--locked'}`}>
          <div className="account-nft-card-head">
            {portfolioEarned ? <Award size={22} aria-hidden /> : <Lock size={22} aria-hidden />}
            <h3>Decode Your Finance Self</h3>
          </div>
          <p className="account-nft-card-desc">
            Timed personality quiz: your investor cluster, fear score, and suggested allocation are saved to your account.
          </p>
          {portfolioEarned ? (
            <>
              <p className="account-nft-meta">
                Unlocked{' '}
                {nft.portfolioCertificateAt
                  ? new Date(nft.portfolioCertificateAt).toLocaleString()
                  : assessment?.completedAt
                    ? new Date(assessment.completedAt).toLocaleString()
                    : ''}
              </p>
              <div className="account-nft-cert-wrap">
                <FinvestCertificate
                  variant="decode"
                  recipientName={displayName}
                  awardTitle={portfolioTitle}
                  detailLines={portfolioLines}
                  issuedAtIso={String(portfolioIssued)}
                  finePrint="Profile record on Finvest. Optional on-chain badge via deployer mint."
                  compact
                />
                <button type="button" className="account-nft-cert-btn" onClick={() => setCertModal('portfolio')}>
                  View full certificate
                </button>
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

        <article className={`account-nft-card${emotionEarned ? ' account-nft-card--open' : ' account-nft-card--locked'}`}>
          <div className="account-nft-card-head">
            {emotionEarned ? <Award size={22} aria-hidden /> : <Lock size={22} aria-hidden />}
            <h3>Investing mindset</h3>
          </div>
          <p className="account-nft-card-desc">
            Emotional Readiness Test on your dashboard: strengths, growth areas, and a readiness index before you take
            risk.
          </p>
          {emotionEarned ? (
            <>
              <p className="account-nft-meta">
                Unlocked{' '}
                {nft.emotionCertificateAt ? new Date(nft.emotionCertificateAt).toLocaleString() : '(this device)'}
                {nft.emotionArchetype ? <span className="account-nft-pill">{String(nft.emotionArchetype)}</span> : null}
              </p>
              <div className="account-nft-cert-wrap">
                <FinvestCertificate
                  variant="emotion"
                  recipientName={displayName}
                  awardTitle={emotionTitle}
                  detailLines={emotionLines.length ? emotionLines : ['Completed the Emotional Readiness Test.']}
                  issuedAtIso={String(emotionIssued)}
                  finePrint="Profile record on Finvest when signed in. Optional on-chain badge via deployer mint."
                  compact
                />
                <button type="button" className="account-nft-cert-btn" onClick={() => setCertModal('emotion')}>
                  View full certificate
                </button>
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
          <button type="button" className="finvest-cert-modal-btn finvest-cert-modal-btn--ghost" onClick={() => window.print()}>
            Print / save as PDF
          </button>
        }
      >
        {portfolioEarned ? (
          <FinvestCertificate
            variant="decode"
            recipientName={displayName}
            awardTitle={portfolioTitle}
            detailLines={portfolioLines}
            issuedAtIso={String(portfolioIssued)}
            finePrint="Saved to your Finvest profile. On-chain NFT badges are optional when a wallet and badge contract are configured."
          />
        ) : null}
      </CertificateModal>

      <CertificateModal
        open={certModal === 'emotion' && emotionEarned}
        onClose={() => setCertModal(null)}
        title="Investing mindset"
        actions={
          <button type="button" className="finvest-cert-modal-btn finvest-cert-modal-btn--ghost" onClick={() => window.print()}>
            Print / save as PDF
          </button>
        }
      >
        {emotionEarned ? (
          <FinvestCertificate
            variant="emotion"
            recipientName={displayName}
            awardTitle={emotionTitle}
            detailLines={emotionLines.length ? emotionLines : ['Completed the Emotional Readiness Test.']}
            issuedAtIso={String(emotionIssued)}
            finePrint="Saved to your Finvest profile when signed in. On-chain NFT badges are optional when a wallet and badge contract are configured."
          />
        ) : null}
      </CertificateModal>

      {contract && rpc ? (
        <div className="account-nft-chain">
          <h3 className="account-nft-sub">
            <Link2 size={16} aria-hidden />
            On-chain badges
          </h3>
          <p className="account-nft-hint">
            Contract and RPC are configured. Mint from the deployer wallet (see <code className="account-code">blockchain/scripts/mint-badge.js</code>) — efficient use of chain is batch mint + one URI template per badge type.
          </p>
          {String(walletFromMetadata || '').trim() ? (
            <>
              {chainLoading ? (
                <p className="account-nft-status">
                  <Loader2 className="account-nft-spin" size={16} aria-hidden /> Reading chain…
                </p>
              ) : null}
              {chainErr ? (
                <p className="auth-banner auth-banner--error" role="alert">
                  {chainErr}
                </p>
              ) : null}
              {chainBadges.length > 0 ? (
                <ul className="account-nft-chain-list">
                  {chainBadges.map((b) => (
                    <li key={b.id} className="account-nft-chain-item">
                      <span className="account-nft-token">#{b.id}</span>
                      <span className="account-nft-uri" title={b.tokenURI}>
                        {b.tokenURI || '…'}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : !chainLoading && !chainErr ? (
                <p className="account-nft-muted">No badge tokens found for this address.</p>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

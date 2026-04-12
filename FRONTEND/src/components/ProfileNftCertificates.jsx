import React, { useCallback, useEffect, useState } from 'react';
import { Award, Link2, Loader2, Lock, Sparkles } from 'lucide-react';

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
 *   onSaveWallet: (address: string) => Promise<{ error?: Error | null }>;
 * }} props
 */
export default function ProfileNftCertificates({ dashboardPrefs, walletFromMetadata, onSaveWallet }) {
  const nft = dashboardPrefs?.nft_badges && typeof dashboardPrefs.nft_badges === 'object' ? dashboardPrefs.nft_badges : {};
  const assessment = dashboardPrefs?.assessment;
  const portfolioEarned = Boolean(nft.portfolioCertificate || assessment?.completedAt);
  const emotionEarned = Boolean(nft.emotionCertificate || readEmotionLocalDone());

  const contract = String(import.meta.env.VITE_BADGE_NFT_CONTRACT_ADDRESS || '').trim();
  const rpc = String(import.meta.env.VITE_NFT_RPC_URL || '').trim();

  const [walletDraft, setWalletDraft] = useState(walletFromMetadata || '');
  const [chainBadges, setChainBadges] = useState(/** @type {{ id: string; tokenURI: string }[]} */ ([]));
  const [chainLoading, setChainLoading] = useState(false);
  const [chainErr, setChainErr] = useState('');
  const [walletSaving, setWalletSaving] = useState(false);

  useEffect(() => {
    setWalletDraft(walletFromMetadata || '');
  }, [walletFromMetadata]);

  const loadChain = useCallback(async () => {
    const w = walletDraft.trim();
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
        rpcUrl: rpc,
        contractAddress: contract,
        walletAddress: w,
      });
      setChainBadges(rows);
    } catch (e) {
      setChainErr(e instanceof Error ? e.message : 'Could not read chain');
      setChainBadges([]);
    } finally {
      setChainLoading(false);
    }
  }, [contract, rpc, walletDraft]);

  useEffect(() => {
    loadChain();
  }, [loadChain]);

  const saveWallet = async () => {
    setWalletSaving(true);
    setChainErr('');
    try {
      const { error } = await onSaveWallet(walletDraft.trim());
      if (error) setChainErr(error.message || 'Could not save wallet');
      else await loadChain();
    } finally {
      setWalletSaving(false);
    }
  };

  const connectInjected = async () => {
    const eth = window.ethereum;
    if (!eth?.request) {
      setChainErr('No wallet found (install MetaMask or similar).');
      return;
    }
    try {
      const accounts = await eth.request({ method: 'eth_requestAccounts' });
      const a = Array.isArray(accounts) ? accounts[0] : '';
      if (!a) return;
      setWalletDraft(a);
      setWalletSaving(true);
      const { error } = await onSaveWallet(a);
      if (error) setChainErr(error.message || 'Could not save wallet');
      else await loadChain();
    } catch (e) {
      setChainErr(e instanceof Error ? e.message : 'Wallet connection failed');
    } finally {
      setWalletSaving(false);
    }
  };

  return (
    <section className="account-nft" aria-labelledby="account-nft-title">
      <h2 id="account-nft-title" className="account-nft-title">
        <Sparkles size={18} aria-hidden />
        Certificates &amp; badges
      </h2>
      <p className="account-nft-lead">
        Unlock proof when you finish learning flows. On-chain NFTs are optional — connect a wallet to show badges
        minted by the contract owner.
      </p>

      <div className="account-nft-grid">
        <article className={`account-nft-card${portfolioEarned ? ' account-nft-card--open' : ''}`}>
          <div className="account-nft-card-head">
            {portfolioEarned ? <Award size={22} aria-hidden /> : <Lock size={22} aria-hidden />}
            <h3>Decode Your Finance Self</h3>
          </div>
          <p className="account-nft-card-desc">
            Complete the timed <strong>Decode Your Finance Self</strong> personality quiz — your cluster and allocation are saved
            to your profile.
          </p>
          {portfolioEarned ? (
            <p className="account-nft-meta">
              Unlocked{' '}
              {nft.portfolioCertificateAt
                ? new Date(nft.portfolioCertificateAt).toLocaleString()
                : assessment?.completedAt
                  ? new Date(assessment.completedAt).toLocaleString()
                  : ''}
            </p>
          ) : (
            <p className="account-nft-locked">Locked — finish the quiz in Decode Your Finance Self.</p>
          )}
        </article>

        <article className={`account-nft-card${emotionEarned ? ' account-nft-card--open' : ''}`}>
          <div className="account-nft-card-head">
            {emotionEarned ? <Award size={22} aria-hidden /> : <Lock size={22} aria-hidden />}
            <h3>Investing mindset</h3>
          </div>
          <p className="account-nft-card-desc">
            Finish the <strong>Emotional Readiness Test</strong> flow on your dashboard — we save a certificate flag to your
            account when you are signed in.
          </p>
          {emotionEarned ? (
            <p className="account-nft-meta">
              Unlocked{' '}
              {nft.emotionCertificateAt ? new Date(nft.emotionCertificateAt).toLocaleString() : '(this device)'}{' '}
              {nft.emotionArchetype ? <span className="account-nft-pill">{String(nft.emotionArchetype)}</span> : null}
            </p>
          ) : (
            <p className="account-nft-locked">Locked — complete the Emotional Readiness Test on the Dashboard.</p>
          )}
        </article>
      </div>

      {contract && rpc ? (
        <div className="account-nft-chain">
          <h3 className="account-nft-sub">
            <Link2 size={16} aria-hidden />
            On-chain badges
          </h3>
          <p className="account-nft-hint">
            Contract and RPC are configured — mint from the deployer wallet (see <code className="account-code">blockchain/scripts/mint-badge.js</code>).
          </p>
          <div className="account-nft-wallet-row">
            <input
              type="text"
              className="auth-input account-nft-input"
              placeholder="0x… wallet address"
              value={walletDraft}
              onChange={(e) => setWalletDraft(e.target.value)}
              spellCheck={false}
              autoComplete="off"
            />
            <button type="button" className="auth-submit account-nft-btn" onClick={saveWallet} disabled={walletSaving}>
              {walletSaving ? 'Saving…' : 'Save'}
            </button>
            <button type="button" className="account-nft-secondary" onClick={connectInjected} disabled={walletSaving}>
              Connect wallet
            </button>
          </div>
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
                    {b.tokenURI || '—'}
                  </span>
                </li>
              ))}
            </ul>
          ) : contract && rpc && walletDraft.trim() && !chainLoading && !chainErr ? (
            <p className="account-nft-muted">No badge tokens found for this address.</p>
          ) : null}
        </div>
      ) : (
        <p className="account-nft-muted">
          Optional: deploy the Finvest badge contract from the <code className="account-code">blockchain/</code> folder,
          then add RPC + contract env vars to show NFTs here.
        </p>
      )}
    </section>
  );
}

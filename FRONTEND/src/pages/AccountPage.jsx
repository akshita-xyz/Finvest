/**
 * @fileoverview Single account hub: sign-in + sign-up (toggle), and when signed in —
 * links to Dashboard & Portfolio AI, profile photo (URL), display name, sign out.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import AuthLayout from '../components/auth/AuthLayout';
import { ensureUserProfile, fetchUserProfile, mergeDashboardPrefs } from '../services/userProfileService';
import ProfileNftCertificates from '../components/ProfileNftCertificates';
import { getPersonalizedPortfolioResumePath } from '../lib/personalizedPortfolioRoadmap';
import '../styles/auth.css';
import '../styles/account.css';

function displayNameFromUser(user) {
  if (!user) return 'Account';
  return user.user_metadata?.full_name || user.email?.split('@')[0] || 'Account';
}

export default function AccountPage() {
  const { user, loading, configured, signInWithPassword, signUpWithPassword, signOut, updateUserMetadata } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const mode = searchParams.get('mode') === 'signup' ? 'signup' : 'signin';
  const setMode = (m) => setSearchParams(m === 'signup' ? { mode: 'signup' } : { mode: 'signin' });

  /** When redirected from a protected route, we land on `/account` after auth and offer “continue”. */
  const continueTo =
    typeof location.state?.continueTo === 'string' && location.state.continueTo.startsWith('/')
      ? location.state.continueTo
      : null;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(/** @type {string | null} */ (null));
  const [successInfo, setSuccessInfo] = useState(/** @type {string | null} */ (null));

  const [avatarUrlDraft, setAvatarUrlDraft] = useState('');
  const [nameDraft, setNameDraft] = useState('');
  const [profileMsg, setProfileMsg] = useState(/** @type {string | null} */ (null));
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileRow, setProfileRow] = useState(/** @type {Record<string, unknown> | null} */ (null));

  useEffect(() => {
    if (!user) return;
    setAvatarUrlDraft(user.user_metadata?.avatar_url || '');
    setNameDraft(user.user_metadata?.full_name || '');
  }, [user]);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    fetchUserProfile(user.id).then(({ data, error }) => {
      if (cancelled || error || !data) return;
      setProfileRow(data);
      const prefs = data.dashboard_prefs;
      const nb = prefs?.nft_badges;
      const hasEmotionCert = nb && typeof nb === 'object' && nb.emotionCertificate;
      if (hasEmotionCert) return;
      try {
        const raw = window.localStorage.getItem('finvest_emotion_mindset_v1');
        if (!raw) return;
        const o = JSON.parse(raw);
        if (!o?.at) return;
        mergeDashboardPrefs(user.id, {
          nft_badges: {
            emotionCertificate: true,
            emotionCertificateAt: new Date(o.at).toISOString(),
            emotionArchetype: o.archetype,
          },
        }).then(({ data: d }) => {
          if (!cancelled && d) setProfileRow(d);
        });
      } catch {
        /* ignore */
      }
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const afterAuthSuccess = useCallback(() => {
    const fromPath = location.state?.from?.pathname;
    const cont =
      typeof fromPath === 'string' && fromPath.startsWith('/') ? fromPath : null;
    navigate('/account', { replace: true, state: cont ? { continueTo: cont } : {} });
  }, [location.state?.from?.pathname, navigate]);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);
    try {
      const { error } = await signInWithPassword(email.trim(), password);
      if (error) {
        setMessage(error.message);
        return;
      }
      afterAuthSuccess();
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setMessage(null);
    setSuccessInfo(null);
    setSubmitting(true);
    try {
      const meta = {};
      if (displayName.trim()) meta.full_name = displayName.trim();
      const { error, needsEmailConfirmation } = await signUpWithPassword(email.trim(), password, meta);
      if (error) {
        setMessage(error.message);
        return;
      }
      if (needsEmailConfirmation) {
        setSuccessInfo('Check your inbox to confirm your email, then return here to sign in.');
        return;
      }
      afterAuthSuccess();
    } finally {
      setSubmitting(false);
    }
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    if (!user) return;
    setProfileMsg(null);
    setProfileSaving(true);
    try {
      const patch = {};
      const url = avatarUrlDraft.trim();
      if (url) patch.avatar_url = url;
      else patch.avatar_url = '';
      const nm = nameDraft.trim();
      patch.full_name = nm;
      const { error, user: updated } = await updateUserMetadata(patch);
      if (error) {
        setProfileMsg(error.message);
        return;
      }
      if (updated) await ensureUserProfile(updated);
      setProfileMsg('Profile saved.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleAvatarFile = (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    if (file.size > 400 * 1024) {
      setProfileMsg('Image too large — use a URL instead, or pick a file under 400KB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const r = String(reader.result || '');
      if (r.length > 500000) {
        setProfileMsg('Encoded image too large. Use an image URL instead.');
        return;
      }
      setAvatarUrlDraft(r);
    };
    reader.readAsDataURL(file);
  };

  if (!loading && user) {
    const name = displayNameFromUser(user);
    const avatar = user.user_metadata?.avatar_url;

    return (
      <AuthLayout title={`${name}'s account`} subtitle="Dashboard, Portfolio AI, and your profile in one place.">
        <div className="account-hub">
          {continueTo ? (
            <p className="auth-banner auth-banner--ok" role="status">
              Next: <Link to={continueTo}>Continue to the page you tried to open</Link>
            </p>
          ) : null}
          <div className="account-avatar-block">
            <div className="account-avatar-wrap">
              {avatar ? (
                <img src={avatar} alt="" className="account-avatar-img" />
              ) : (
                <span className="account-avatar-fallback" aria-hidden>
                  {name.slice(0, 1).toUpperCase()}
                </span>
              )}
            </div>
            <form className="account-profile-form" onSubmit={saveProfile}>
              <label className="auth-label" htmlFor="acc-display-name">
                Display name
              </label>
              <input
                id="acc-display-name"
                className="auth-input"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                autoComplete="name"
              />
              <label className="auth-label" htmlFor="acc-avatar-url">
                Profile picture
              </label>
              <p className="auth-hint">Paste an image URL, or choose a small file (under ~400KB).</p>
              <input
                id="acc-avatar-url"
                className="auth-input"
                value={avatarUrlDraft}
                onChange={(e) => setAvatarUrlDraft(e.target.value)}
                placeholder="https://…"
              />
              <label className="auth-label" htmlFor="acc-avatar-file">
                Or upload
              </label>
              <input id="acc-avatar-file" type="file" accept="image/*" className="account-file-input" onChange={handleAvatarFile} />
              {profileMsg ? (
                <p className={profileMsg.includes('saved') ? 'auth-banner auth-banner--ok' : 'auth-banner auth-banner--error'} role="status">
                  {profileMsg}
                </p>
              ) : null}
              <button type="submit" className="auth-submit" disabled={profileSaving || !configured}>
                {profileSaving ? 'Saving…' : 'Save profile'}
              </button>
            </form>
          </div>

          <div className="account-links">
            <Link to="/dashboard" className="account-link-card">
              <strong>Dashboard</strong>
              <span>Live markets, fear score cockpit, and tools.</span>
            </Link>
            <Link to={getPersonalizedPortfolioResumePath()} className="account-link-card account-link-card--accent">
              <strong>Portfolio AI</strong>
              <span>Timed quiz, investor cluster, and personalized allocation — part of your account.</span>
            </Link>
          </div>

          <ProfileNftCertificates
            dashboardPrefs={profileRow?.dashboard_prefs}
            walletFromMetadata={String(user.user_metadata?.wallet_address || '')}
            onSaveWallet={async (address) => {
              const { error, user: u } = await updateUserMetadata({ wallet_address: address });
              if (error) return { error };
              if (u) await ensureUserProfile(u);
              if (user?.id) {
                const { data } = await fetchUserProfile(user.id);
                if (data) setProfileRow(data);
              }
              return { error: null };
            }}
          />

          <div className="account-actions">
            <Link to="/" className="account-text-link">
              ← Back to home
            </Link>
            <button
              type="button"
              className="account-signout"
              onClick={async () => {
                await signOut();
                navigate('/', { replace: true });
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  if (loading) {
    return (
      <div className="auth-page" role="status">
        <div className="auth-card auth-card--narrow">
          <p className="auth-muted">Loading…</p>
        </div>
      </div>
    );
  }

  if (!configured) {
    return (
      <AuthLayout title="Account" subtitle="Configure Supabase to use this page.">
        <p className="auth-banner auth-banner--warn" role="alert">
          Add <code className="auth-code">VITE_SUPABASE_URL</code> and <code className="auth-code">VITE_SUPABASE_ANON_KEY</code> to{' '}
          <code className="auth-code">FRONTEND/.env</code>.
        </p>
        <Link to="/" className="auth-muted">
          ← Home
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Account"
      subtitle="Sign in if you already have access, or create a new account."
      footer={
        <p className="auth-muted">
          <Link to="/">← Back to home</Link>
        </p>
      }
    >
      <div className="account-mode-toggle" role="tablist" aria-label="Account mode">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'signin'}
          className={mode === 'signin' ? 'is-active' : ''}
          onClick={() => setMode('signin')}
        >
          Sign in
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'signup'}
          className={mode === 'signup' ? 'is-active' : ''}
          onClick={() => setMode('signup')}
        >
          New account
        </button>
      </div>

      {mode === 'signin' ? (
        <form className="auth-form" onSubmit={handleSignIn} noValidate>
          <label className="auth-label" htmlFor="acc-email-in">Email</label>
          <input
            id="acc-email-in"
            type="email"
            autoComplete="email"
            className="auth-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <label className="auth-label" htmlFor="acc-pass-in">Password</label>
          <input
            id="acc-pass-in"
            type="password"
            autoComplete="current-password"
            className="auth-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {message ? (
            <p className="auth-banner auth-banner--error" role="alert">
              {message}
            </p>
          ) : null}
          <button type="submit" className="auth-submit" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      ) : (
        <form className="auth-form" onSubmit={handleSignUp} noValidate>
          <label className="auth-label" htmlFor="acc-name-up">Display name <span className="auth-optional">(optional)</span></label>
          <input
            id="acc-name-up"
            className="auth-input"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            autoComplete="name"
          />
          <label className="auth-label" htmlFor="acc-email-up">Email</label>
          <input
            id="acc-email-up"
            type="email"
            autoComplete="email"
            className="auth-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <label className="auth-label" htmlFor="acc-pass-up">Password</label>
          <input
            id="acc-pass-up"
            type="password"
            autoComplete="new-password"
            className="auth-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
          <p className="auth-hint">At least 6 characters.</p>
          {successInfo ? (
            <p className="auth-banner auth-banner--ok" role="status">
              {successInfo}
            </p>
          ) : null}
          {message ? (
            <p className="auth-banner auth-banner--error" role="alert">
              {message}
            </p>
          ) : null}
          <button type="submit" className="auth-submit" disabled={submitting || !!successInfo}>
            {submitting ? 'Creating…' : 'Create account'}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}

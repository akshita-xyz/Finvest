/**
 * @fileoverview Logged-in “Personalized Portfolio” area: sub-nav + fear calculator,
 * timed assessment quiz, suitability copy, and AI-style allocation summary (persisted in Supabase `dashboard_prefs`).
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  fetchUserProfile,
  mergeDashboardPrefs,
  updateUserProfileFields,
  classificationFromFearScore,
} from '../services/userProfileService';
import { allocationFromFearScore } from '../lib/personalizedPortfolioEngine';
import AssessmentQuiz from './personalized/AssessmentQuiz';
import '../styles/pp-hub.css';

const TABS = ['overview', 'calculator', 'quiz', 'where', 'portfolio'];

export default function PersonalizedPortfolioHub() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = useMemo(() => {
    const t = searchParams.get('tab') || 'overview';
    return TABS.includes(t) ? t : 'overview';
  }, [searchParams]);

  const [profile, setProfile] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const [fearDraft, setFearDraft] = useState(50);
  const [fearSaved, setFearSaved] = useState(false);
  const [quizBusy, setQuizBusy] = useState(false);
  const [quizKey, setQuizKey] = useState(0);

  const assessment = profile?.dashboard_prefs?.assessment;

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    fetchUserProfile(user.id).then(({ data, error }) => {
      if (cancelled || error || !data) return;
      setProfile(data);
      if (data.fear_score != null && Number.isFinite(Number(data.fear_score))) {
        setFearDraft(Math.min(100, Math.max(1, Number(data.fear_score))));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const setTab = useCallback(
    (next) => {
      const current = searchParams.get('tab') || 'overview';
      if (next === 'quiz' && next !== current) setQuizKey((k) => k + 1);
      setSearchParams({ tab: next });
    },
    [searchParams, setSearchParams]
  );

  const saveFearScore = async () => {
    if (!user?.id) return;
    const n = Math.min(100, Math.max(1, Math.round(fearDraft)));
    const { data, error } = await updateUserProfileFields(user.id, {
      fear_score: n,
      classification: classificationFromFearScore(n),
    });
    if (!error && data) setProfile(data);
    setFearSaved(true);
    setTimeout(() => setFearSaved(false), 2000);
  };

  const handleQuizComplete = async (result) => {
    if (!user?.id) return;
    await mergeDashboardPrefs(user.id, { assessment: result });
    const fs = result.traits?.fearScore;
    if (fs != null && Number.isFinite(fs)) {
      await updateUserProfileFields(user.id, {
        fear_score: Math.round(fs),
        classification: classificationFromFearScore(fs),
      });
      setFearDraft(Math.min(100, Math.max(1, Math.round(fs))));
    }
    const { data } = await fetchUserProfile(user.id);
    if (data) setProfile(data);
    setTab('portfolio');
  };

  const subLink = (id, label) => (
    <button
      type="button"
      key={id}
      className={tab === id ? 'pp-subnav--active' : ''}
      onClick={() => setTab(id)}
    >
      {label}
    </button>
  );

  return (
    <div className="pp-hub">
      <nav className="pp-subnav" aria-label="Personalized portfolio sections">
        {subLink('overview', 'Overview')}
        {subLink('calculator', 'Fear score')}
        {subLink('quiz', 'Personality quiz')}
        {subLink('where', 'Where to invest')}
        {subLink('portfolio', 'My portfolio')}
      </nav>

      <main className="pp-hub-main">
        <Link to="/" className="pp-back">
          ← Back to home
        </Link>
        <header className="pp-hub-header">
          <h1 className="pp-hub-title">Personalized portfolio</h1>
          <p className="pp-hub-lead">
            Timed questions, hesitation signals, and a simple ML-style cluster model shape your fear score (1–100),
            investor persona, and a suggested allocation — saved to your account for this Finvest prototype.
          </p>
        </header>

        {tab === 'overview' && (
          <section className="pp-card">
            <p className="pp-eyebrow">Welcome</p>
            <h2 className="pp-card-title">Built for {user?.user_metadata?.full_name || user?.email || 'you'}</h2>
            <p className="pp-card-desc">
              Use the sub-navigation above: calibrate fear score manually, take the personality quiz (we time each
              answer), then review where you might fit — trading vs long-term vs loans — and your generated portfolio
              mix.
            </p>
            {assessment?.completedAt ? (
              <p className="pp-muted">
                Last assessment: {new Date(assessment.completedAt).toLocaleString()} · Cluster:{' '}
                <strong>{assessment.clusterLabel}</strong> · Fear score: <strong>{assessment.traits?.fearScore}</strong>
              </p>
            ) : (
              <p className="pp-muted">You have not completed the quiz yet — start with “Personality quiz”.</p>
            )}
            <button type="button" className="pp-btn-primary" style={{ marginTop: 16 }} onClick={() => setTab('quiz')}>
              Start or retake quiz
            </button>
          </section>
        )}

        {tab === 'calculator' && (
          <section className="pp-card">
            <p className="pp-eyebrow">Fear score calculator</p>
            <h2 className="pp-card-title">Fear score (1 – 100)</h2>
            <p className="pp-card-desc">
              Higher = more cautious / sensitive to loss; lower = more comfortable with volatility. This syncs with
              your main dashboard and Supabase profile.
            </p>
            <div className="pp-stat">
              <span>Current value</span>
              <strong>{fearDraft}</strong>
            </div>
            <input
              type="range"
              min={1}
              max={100}
              value={fearDraft}
              onChange={(e) => setFearDraft(Number(e.target.value))}
              className="pp-slider"
              aria-label="Fear score"
            />
            <button type="button" className="pp-btn-primary" onClick={saveFearScore}>
              Save to profile
            </button>
            {fearSaved ? <p className="pp-muted" style={{ marginTop: 10 }}>Saved.</p> : null}
          </section>
        )}

        {tab === 'quiz' && (
          <section>
            {quizBusy ? <p className="pp-muted">Saving your results…</p> : null}
            <AssessmentQuiz key={quizKey} onComplete={handleQuizComplete} onBusyChange={setQuizBusy} />
          </section>
        )}

        {tab === 'where' && (
          <section className="pp-card">
            <p className="pp-eyebrow">Suitability (educational, not advice)</p>
            <h2 className="pp-card-title">Where should you focus?</h2>
            {!assessment ? (
              <p className="pp-muted">Complete the quiz first — we personalize this section from your answers and timing.</p>
            ) : (
              <>
                <p className="pp-card-desc">{assessment.suitability?.tradingStyle}</p>
                <p className="pp-card-desc">{assessment.suitability?.loansAndPolicies}</p>
                <div className="pp-quote">{assessment.messages?.hint}</div>
                <p className="pp-muted">{assessment.messages?.trading}</p>
                <p className="pp-muted" style={{ marginTop: 12 }}>
                  {assessment.messages?.loans}
                </p>
              </>
            )}
          </section>
        )}

        {tab === 'portfolio' && (
          <section className="pp-card">
            <p className="pp-eyebrow">AI-style personalized mix</p>
            <h2 className="pp-card-title">Your suggested allocation</h2>
            {!assessment ? (
              <p className="pp-muted">Run the quiz to generate a portfolio snapshot stored on your profile.</p>
            ) : (
              <>
                <p className="pp-card-desc">
                  Cluster: <strong>{assessment.clusterLabel}</strong> · Modeled fear score:{' '}
                  <strong>{assessment.traits?.fearScore}</strong> · Avg response time:{' '}
                  <strong>{Math.round(assessment.traits?.avgHesitationMs || 0)} ms</strong>
                </p>
                <div className="pp-stat-grid">
                  <div className="pp-stat">
                    <span>Stocks</span>
                    <strong>{assessment.allocation?.stocks}%</strong>
                  </div>
                  <div className="pp-stat">
                    <span>Bonds</span>
                    <strong>{assessment.allocation?.bonds}%</strong>
                  </div>
                  <div className="pp-stat">
                    <span>Cash</span>
                    <strong>{assessment.allocation?.cash}%</strong>
                  </div>
                </div>
                <p className="pp-muted" style={{ marginTop: 12 }}>
                  {assessment.allocation?.label}
                </p>
                <div className="pp-bar-row">
                  <span>Equity</span>
                  <div className="pp-bar">
                    <i style={{ width: `${assessment.allocation?.stocks}%` }} />
                  </div>
                </div>
                <div className="pp-bar-row">
                  <span>Fixed income</span>
                  <div className="pp-bar">
                    <i style={{ width: `${assessment.allocation?.bonds}%` }} />
                  </div>
                </div>
                <div className="pp-quote">{assessment.messages?.panic}</div>
                <p className="pp-muted">
                  Traits (internal): patient {Number(assessment.traits?.patient).toFixed(2)} · impulsive{' '}
                  {Number(assessment.traits?.impulsive).toFixed(2)} · planning{' '}
                  {Number(assessment.traits?.planning).toFixed(2)}
                </p>
              </>
            )}
            {assessment ? (
              <p className="pp-muted" style={{ marginTop: 16 }}>
                Static check: same fear score via calculator →{' '}
                {allocationFromFearScore(assessment.traits?.fearScore ?? 50).label}
              </p>
            ) : null}
          </section>
        )}
      </main>
    </div>
  );
}

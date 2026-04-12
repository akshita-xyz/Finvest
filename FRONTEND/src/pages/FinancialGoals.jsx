import React, { useEffect, useLayoutEffect, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const MotionSection = motion.section;
import {
  ArrowLeft,
  ClipboardList,
  Sparkles,
  TrendingUp,
  Shield,
  Zap,
  Search,
  Loader2,
  Plus,
  Trash2,
  X,
  Info,
  Home,
  Car,
  Plane,
  GraduationCap,
  Umbrella,
  Target,
  Wallet,
  PiggyBank,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  DEFAULT_INFLATION,
  aggregateWeightedMfStats,
  buildRiskPaths,
  classifySuggestedMfScheme,
  fvGrowingPortfolio,
  monteCarloProfitProbability,
  realFromNominal,
  yearlySeriesDeterministic,
} from '../lib/financialGoalsLogic';
import { mfSearch, mfSchemeHistory, mfSuggestionsFromQueries, statsFromNavRows } from '../lib/mfapi';
import { avTimeSeriesStats } from '../lib/alphaVantage';
import { generateGoalNarrative, generateMfSuggestionQueries } from '../lib/gemini';
import '../styles/financial-goals.css';

const PRESET_GOALS = [
  { id: 'car', label: 'Buy a car', isCustom: false },
  { id: 'travel', label: 'Travel', isCustom: false },
  { id: 'retirement', label: 'Retirement', isCustom: false },
  { id: 'home', label: 'Home / house', isCustom: false },
  { id: 'education', label: 'Education', isCustom: false },
  { id: 'emergency', label: 'Emergency fund', isCustom: false },
];

const fmtInr = (n) =>
  Number.isFinite(n) ? `₹${Math.round(n).toLocaleString('en-IN')}` : '—';

function ExplainSection({ title, children }) {
  return (
    <section className="fg-explain-section">
      <h4 className="fg-explain-section-h">{title}</h4>
      <div className="fg-explain-section-body">{children}</div>
    </section>
  );
}

const PATH_EXPLAIN = {
  safe: {
    title: 'Safe path',
    body: (
      <>
        <ExplainSection title="What it is">
          <p>
            A <strong>stylized low-risk</strong> scenario: we assume lower expected return and lower volatility, similar
            to leaning heavily on debt and high-quality bonds rather than equities.
          </p>
        </ExplainSection>
        <ExplainSection title="Why we show it">
          <p>
            So you can compare a steadier, lower-upside story against moderate and high-growth paths using the same
            savings inputs. It is an illustration, not a product recommendation.
          </p>
        </ExplainSection>
        <ExplainSection title="How the number is built">
          <p>
            The ending balance uses your monthly amount and starting lump sum, compounded monthly at this path’s
            assumed annual return (see drift/vol on the card). The grey line on the chart shows contributions without
            growth for contrast.
          </p>
        </ExplainSection>
      </>
    ),
  },
  moderate: {
    title: 'Moderate path',
    body: (
      <>
        <ExplainSection title="What it is">
          <p>
            A <strong>balanced</strong> scenario between safe and high growth: middling assumed return and volatility,
            like a mixed debt–equity posture.
          </p>
        </ExplainSection>
        <ExplainSection title="Why we show it">
          <p>
            Many real portfolios sit in the middle. When you link Indian mutual funds, we try to infer return and
            volatility from NAV history; if not, we fall back to built-in balanced-style assumptions.
          </p>
        </ExplainSection>
        <ExplainSection title="How the number is built">
          <p>
            Same contribution math as the other paths, but drift/vol come from your linked schemes when possible, else
            defaults. Check the drift/vol row on this card for the exact inputs used.
          </p>
        </ExplainSection>
      </>
    ),
  },
  aggressive: {
    title: 'High-growth path',
    body: (
      <>
        <ExplainSection title="What it is">
          <p>
            A <strong>more equity-like</strong> scenario: higher assumed return and higher volatility—closer to a
            stock-heavy portfolio than the safe path.
          </p>
        </ExplainSection>
        <ExplainSection title="Why we show it">
          <p>
            To stress-test ambition: more growth potential, but wider swings in the Monte Carlo view. With an equity
            symbol and Alpha Vantage data, we calibrate from that; otherwise we use a default equity-style profile.
          </p>
        </ExplainSection>
        <ExplainSection title="How the number is built">
          <p>
            Identical savings inputs as the other paths; only the assumed return path (drift) and volatility differ.
            Past data does not predict the future—these are teaching numbers.
          </p>
        </ExplainSection>
      </>
    ),
  },
};

function FgExplainModal({ open, title, children, onClose }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fg-explain-backdrop" role="presentation" onClick={onClose}>
      <div
        className="fg-explain-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fg-explain-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="fg-explain-dialog-head">
          <h3 id="fg-explain-dialog-title">{title}</h3>
          <button type="button" className="fg-explain-dialog-x" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="fg-explain-dialog-body">{children}</div>
        <button type="button" className="fg-explain-dialog-done" onClick={onClose}>
          Got it
        </button>
      </div>
    </div>
  );
}

function FgExplainIcon({ label, title, children, onOpen }) {
  return (
    <button
      type="button"
      className="fg-explain-icon"
      aria-label={label || `Explain: ${title}`}
      title={label || 'Learn more'}
      onClick={() => onOpen({ title, content: children })}
    >
      <Info size={16} strokeWidth={2.25} aria-hidden />
    </button>
  );
}

function FgExplainLink({ text, title, children, onOpen }) {
  return (
    <button type="button" className="fg-explain-link" onClick={() => onOpen({ title, content: children })}>
      {text}
    </button>
  );
}

function goalDreamPhrase(label) {
  const t = String(label || '').toLowerCase();
  if (/retire|retirement|pension/.test(t)) return 'a more comfortable retirement';
  if (/home|house|property|flat/.test(t)) return 'a home or major property step';
  if (/car|vehicle|bike/.test(t)) return 'a car or vehicle';
  if (/travel|trip|vacation|holiday/.test(t)) return 'travel and experiences';
  if (/education|college|study|school/.test(t)) return 'education and learning';
  if (/emergency|rainy|backup|buffer/.test(t)) return 'a strong emergency buffer';
  const trimmed = String(label || '').trim();
  return trimmed ? `"${trimmed}"` : 'your ambitions';
}

function joinGoalDreams(labels) {
  const phrases = [...new Set((labels || []).map(goalDreamPhrase))];
  if (phrases.length === 0) return 'building long-term wealth';
  if (phrases.length === 1) return phrases[0];
  if (phrases.length === 2) return `${phrases[0]} and ${phrases[1]}`;
  return `${phrases.slice(0, -1).join(', ')}, and ${phrases[phrases.length - 1]}`;
}

function goalIconForLabel(label) {
  const t = String(label || '').toLowerCase();
  if (/retire|retirement|pension/.test(t)) return PiggyBank;
  if (/home|house|property|flat/.test(t)) return Home;
  if (/car|vehicle|bike/.test(t)) return Car;
  if (/travel|trip|vacation|holiday/.test(t)) return Plane;
  if (/education|college|study|school/.test(t)) return GraduationCap;
  if (/emergency|rainy|backup|buffer/.test(t)) return Umbrella;
  return Target;
}

function FutureYouSection({ result, moderate, inflationPct }) {
  const goals = result.snapshotGoals?.length ? result.snapshotGoals : [];
  const totalTargets = Number(result.totalTargets) || 0;
  const moderateReal = moderate?.fvReal ?? 0;
  const moderateNominal = moderate?.fvNominal ?? 0;
  const surplusReal = moderateReal - totalTargets;
  const dreamLine = joinGoalDreams(goals.map((g) => g.label));
  const safeP = result.paths?.find((p) => p.id === 'safe');
  const aggP = result.paths?.find((p) => p.id === 'aggressive');
  const lump = Number(result.startingCorpus) || 0;
  const monthly = Number(result.monthlyContrib) || 0;

  const lumpBit =
    lump > 0
      ? `starting with about ${fmtInr(lump)} already invested and `
      : '';

  return (
    <section className="fg-card fg-wide fg-future fg-future-v2">
      <div className="fg-future-hero">
        <div className="fg-future-hero-text">
          <p className="fg-future-kicker">
            <Sparkles size={18} className="fg-future-kicker-ico" aria-hidden />
            Future You simulator
          </p>
          <h2>Life in {result.years} years — if you stay on the plan</h2>
          <p className="fg-future-hero-sub">
            Story below uses your <strong>moderate</strong> path (same as the blue line on the chart). Numbers are
            illustrative; goals are summed simply and may mature at different times in real life.
          </p>
        </div>
        <div className="fg-future-hero-badge">
          <span className="fg-future-badge-top">Plan horizon</span>
          <strong>{result.years}</strong>
          <span className="fg-future-badge-bottom">years</span>
        </div>
      </div>

      <div className="fg-future-simulator">
        <div className="fg-future-panel fg-future-panel--story">
          <h3 className="fg-future-panel-title">The journey (moderate path)</h3>
          <p className="fg-future-story">
            In <strong>{result.years} years</strong>, {lumpBit}
            keeping roughly <strong>{fmtInr(monthly)}</strong> going in every month, your portfolio on the{' '}
            <strong>moderate</strong> path could grow to about <strong>{fmtInr(moderateNominal)}</strong> in{' '}
            <strong>nominal</strong> rupees — the number you might see on a statement if assumptions held.
          </p>
          <p className="fg-future-story fg-future-story--accent">
            With <strong>{inflationPct}%</strong> inflation a year (our fixed teaching rate), that feels closer to{' '}
            <strong>{fmtInr(moderateReal)}</strong> in <strong>today&apos;s purchasing power</strong> — how far that pot
            might go for {dreamLine}.
          </p>
        </div>

        <div className="fg-future-panel fg-future-panel--compare">
          <h3 className="fg-future-panel-title">Same discipline, three risk styles (real-ish ₹)</h3>
          <p className="fg-future-panel-hint">Ending purchasing-power snapshot for each path — not advice to pick one.</p>
          <div className="fg-future-path-compare">
            <div className="fg-future-path-chip fg-future-path-chip--safe">
              <Shield size={16} aria-hidden />
              <span>Safe</span>
              <strong>{fmtInr(safeP?.fvReal)}</strong>
            </div>
            <div className="fg-future-path-chip fg-future-path-chip--mod">
              <TrendingUp size={16} aria-hidden />
              <span>Moderate</span>
              <strong>{fmtInr(moderateReal)}</strong>
            </div>
            <div className="fg-future-path-chip fg-future-path-chip--agg">
              <Zap size={16} aria-hidden />
              <span>High growth</span>
              <strong>{fmtInr(aggP?.fvReal)}</strong>
            </div>
          </div>
        </div>
      </div>

      {goals.length > 0 ? (
        <div className="fg-future-goals-block">
          <h3 className="fg-future-panel-title">What you told us you want</h3>
          <ul className="fg-future-goal-cards">
            {goals.map((g) => {
              const Ico = goalIconForLabel(g.label);
              return (
                <li key={g.id} className="fg-future-goal-card">
                  <span className="fg-future-goal-ico" aria-hidden>
                    <Ico size={20} />
                  </span>
                  <div className="fg-future-goal-body">
                    <span className="fg-future-goal-name">{g.label || 'Goal'}</span>
                    <span className="fg-future-goal-meta">
                      Target <strong>{fmtInr(g.targetAmount)}</strong> · horizon ~{g.years}y
                    </span>
                    <span className="fg-future-goal-dream">{goalDreamPhrase(g.label)}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div className="fg-future-goals-block fg-future-goals-block--empty">
          <Wallet size={22} className="fg-future-empty-ico" aria-hidden />
          <p>
            No goals were ticked when you generated this plan — we&apos;re showing pure wealth build. Turn goals on
            above and generate again to map this pot to specific dreams.
          </p>
        </div>
      )}

      {totalTargets > 0 && (
        <div
          className={`fg-future-surplus ${surplusReal >= 0 ? 'fg-future-surplus--ahead' : 'fg-future-surplus--behind'}`}
        >
          <div className="fg-future-surplus-head">
            <h3 className="fg-future-panel-title">Goals vs this &quot;Future You&quot; pot</h3>
            <p className="fg-future-surplus-note">
              We add up every enabled goal&apos;s target ({fmtInr(totalTargets)}) and compare to your{' '}
              <strong>moderate</strong> ending balance after inflation ({fmtInr(moderateReal)}). Timing is simplified:
              real goals pay out at different years.
            </p>
          </div>
          {surplusReal >= 0 ? (
            <p className="fg-future-surplus-msg">
              In this rough view you could cover those targets and still have about{' '}
              <strong>{fmtInr(surplusReal)}</strong> left in today&apos;s rupee terms — headroom for extras, taxes,
              inflation surprises, or goals you add later.
            </p>
          ) : (
            <p className="fg-future-surplus-msg">
              In this rough view you&apos;re about <strong>{fmtInr(Math.abs(surplusReal))}</strong> short of the sum of
              those targets (in today&apos;s rupee terms). Try nudging savings %, horizon, or targets — or explore the
              higher-growth path with open eyes to volatility.
            </p>
          )}
        </div>
      )}

      <p className="fg-future-disclaimer">
        Educational simulation only — not financial advice. Markets, taxes, and your actual spending won&apos;t match
        this script.
      </p>
    </section>
  );
}

function newHoldingId() {
  return `mf-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`}`;
}

function buildDefaultMfQueries(enabledGoals) {
  const base = ['nifty 50 index fund direct growth', 'large cap fund direct growth'];
  const blob = enabledGoals.map((g) => `${g.label || ''}`).join(' ').toLowerCase();
  const extra = [];
  if (/emergency/.test(blob)) extra.push('liquid fund growth direct');
  if (/retire/.test(blob)) extra.push('flexi cap fund direct growth');
  if (/travel|car|home|house/.test(blob)) extra.push('balanced advantage fund direct');
  if (/education/.test(blob)) extra.push('elss tax saver direct');
  return [...new Set([...base, ...extra])];
}

function MfHoldingRow({ holding, onChange, onRemove }) {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState([]);

  useEffect(() => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setHits([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const h = await mfSearch(trimmed);
        setHits(h);
      } catch {
        setHits([]);
      }
    }, 320);
    return () => clearTimeout(t);
  }, [q]);

  const pick = (h) => {
    onChange({ ...holding, schemeCode: h.schemeCode, schemeName: h.schemeName });
    setQ('');
    setHits([]);
  };

  const clearScheme = () => {
    onChange({ ...holding, schemeCode: '', schemeName: '' });
    setHits([]);
  };

  return (
    <div className="fg-holding-row">
      <div className="fg-holding-top">
        <div className="fg-field fg-holding-search">
          <label>Find scheme (optional)</label>
          <div className="fg-search-wrap">
            <Search size={16} className="fg-search-ico" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="HDFC, Parag Parikh, Nifty…"
              autoComplete="off"
            />
          </div>
        </div>
        <button type="button" className="fg-icon-btn" onClick={onRemove} aria-label="Remove scheme row">
          <Trash2 size={18} />
        </button>
      </div>
      {hits.length > 0 && (
        <ul className="fg-hit-list fg-hit-list--compact">
          {hits.map((h) => (
            <li key={h.schemeCode}>
              <button type="button" className={holding.schemeCode === h.schemeCode ? 'active' : ''} onClick={() => pick(h)}>
                <span className="fg-hit-code">{h.schemeCode}</span>
                <span className="fg-hit-name">{h.schemeName}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {holding.schemeCode ? (
        <div className="fg-row-actions">
          <p className="fg-selected" style={{ margin: 0, flex: 1 }}>
            Linked: <strong>{holding.schemeName}</strong> ({holding.schemeCode})
          </p>
          <button type="button" className="fg-text-btn" onClick={clearScheme}>
            Clear scheme
          </button>
        </div>
      ) : null}
      <div className="fg-field" style={{ marginBottom: 0 }}>
        <label>Already invested here (₹, optional)</label>
        <input
          type="number"
          min="0"
          value={holding.currentAmount === 0 ? '' : holding.currentAmount}
          placeholder="0"
          onChange={(e) =>
            onChange({
              ...holding,
              currentAmount: Math.max(0, Number(e.target.value) || 0),
            })
          }
        />
      </div>
    </div>
  );
}

const SUGGEST_PREVIEW_COUNT = 3;

const HORIZON_LABELS = { short: 'Short term', medium: 'Medium term', long: 'Long term' };
const RISK_LABELS = { low: 'Lower risk', moderate: 'Moderate risk', high: 'Higher risk' };

function SuggestedSchemesPanel({ schemes, onAddFromSuggestion }) {
  const [riskFilter, setRiskFilter] = useState('all');
  const [horizonFilter, setHorizonFilter] = useState('all');
  const [nameQuery, setNameQuery] = useState('');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setRiskFilter('all');
    setHorizonFilter('all');
    setNameQuery('');
    setExpanded(false);
  }, [schemes]);

  useEffect(() => {
    setExpanded(false);
  }, [riskFilter, horizonFilter, nameQuery]);

  const filtered = useMemo(() => {
    const q = nameQuery.trim().toLowerCase();
    return schemes.filter((s) => {
      if (riskFilter !== 'all' && s.risk !== riskFilter) return false;
      if (horizonFilter !== 'all' && s.horizon !== horizonFilter) return false;
      if (q) {
        const name = String(s.schemeName || '').toLowerCase();
        const code = String(s.schemeCode || '');
        if (!name.includes(q) && !code.includes(q)) return false;
      }
      return true;
    });
  }, [schemes, riskFilter, horizonFilter, nameQuery]);

  const visible = expanded ? filtered : filtered.slice(0, SUGGEST_PREVIEW_COUNT);
  const hasMore = filtered.length > SUGGEST_PREVIEW_COUNT;

  const filterBtn = (active, onClick, children) => (
    <button
      type="button"
      className={`fg-filter-chip ${active ? 'fg-filter-chip--on' : ''}`}
      onClick={onClick}
    >
      {children}
    </button>
  );

  return (
    <div className="fg-suggestions">
      <h3>Suggested schemes to explore (from your goals + AI)</h3>
      <p className="fg-hint">
        Pulled via mfapi.in search. Labels are heuristic (name + search phrase). Educational only — verify before
        investing.
      </p>

      <div className="fg-suggest-filters">
        <div className="fg-suggest-filter-group">
          <span className="fg-suggest-filter-label">Horizon</span>
          <div className="fg-suggest-filter-chips">
            {filterBtn(horizonFilter === 'all', () => setHorizonFilter('all'), 'All')}
            {filterBtn(horizonFilter === 'short', () => setHorizonFilter('short'), HORIZON_LABELS.short)}
            {filterBtn(horizonFilter === 'medium', () => setHorizonFilter('medium'), HORIZON_LABELS.medium)}
            {filterBtn(horizonFilter === 'long', () => setHorizonFilter('long'), HORIZON_LABELS.long)}
          </div>
        </div>
        <div className="fg-suggest-filter-group">
          <span className="fg-suggest-filter-label">Risk</span>
          <div className="fg-suggest-filter-chips">
            {filterBtn(riskFilter === 'all', () => setRiskFilter('all'), 'All')}
            {filterBtn(riskFilter === 'low', () => setRiskFilter('low'), RISK_LABELS.low)}
            {filterBtn(riskFilter === 'moderate', () => setRiskFilter('moderate'), RISK_LABELS.moderate)}
            {filterBtn(riskFilter === 'high', () => setRiskFilter('high'), RISK_LABELS.high)}
          </div>
        </div>
        <div className="fg-suggest-filter-search">
          <span className="fg-suggest-filter-label">Search</span>
          <div className="fg-search-wrap fg-suggest-search-wrap">
            <Search size={16} className="fg-search-ico" />
            <input
              type="search"
              value={nameQuery}
              onChange={(e) => setNameQuery(e.target.value)}
              placeholder="Filter by scheme name or code…"
              autoComplete="off"
              aria-label="Filter suggestions by name or code"
            />
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="fg-hint fg-suggest-empty">No schemes match these filters. Try &quot;All&quot; or clear search.</p>
      ) : (
        <>
          <p className="fg-suggest-count">
            Showing {visible.length} of {filtered.length}
            {filtered.length < schemes.length ? ` (${schemes.length} total before filters)` : ''}
          </p>
          <div className="fg-suggest-grid">
            {visible.map((s) => (
              <div key={s.schemeCode} className="fg-suggest-card">
                <div className="fg-suggest-card-main">
                  <div className="fg-suggest-name">{s.schemeName}</div>
                  <div className="fg-suggest-tags">
                    <span className={`fg-suggest-tag fg-suggest-tag--horizon-${s.horizon}`}>
                      {HORIZON_LABELS[s.horizon] || s.horizon}
                    </span>
                    <span className={`fg-suggest-tag fg-suggest-tag--risk-${s.risk}`}>
                      {RISK_LABELS[s.risk] || s.risk}
                    </span>
                  </div>
                  <span className="fg-suggest-via">
                    Code {s.schemeCode} · matched: {s.suggestedVia}
                  </span>
                </div>
                <button type="button" className="fg-chip-btn" onClick={() => onAddFromSuggestion(s)}>
                  Add to my list
                </button>
              </div>
            ))}
          </div>
          {hasMore && !expanded && (
            <button type="button" className="fg-suggest-more" onClick={() => setExpanded(true)}>
              Show more ({filtered.length - SUGGEST_PREVIEW_COUNT} more)
            </button>
          )}
          {hasMore && expanded && (
            <button type="button" className="fg-suggest-more fg-suggest-more--ghost" onClick={() => setExpanded(false)}>
              Show less
            </button>
          )}
        </>
      )}
    </div>
  );
}

function FinancialGoals() {
  const alphaKey = import.meta.env.VITE_ALPHA_VANTAGE_API_KEY || '';
  const geminiKey = import.meta.env.VITE_GEMINI_API_KEY || '';

  const [monthlySalary, setMonthlySalary] = useState(85000);
  const [savingsPercent, setSavingsPercent] = useState(25);
  const [startingCorpus, setStartingCorpus] = useState(0);
  const [horizonYears, setHorizonYears] = useState(30);
  const [goalState, setGoalState] = useState(() =>
    PRESET_GOALS.map((g) => ({
      ...g,
      enabled: g.id === 'retirement' || g.id === 'emergency',
      targetAmount: g.id === 'retirement' ? 2500000 : g.id === 'car' ? 900000 : 500000,
      years: g.id === 'retirement' ? 30 : g.id === 'car' ? 4 : 3,
    }))
  );
  const [stockSymbol, setStockSymbol] = useState('');
  const [holdings, setHoldings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [aiNarrative, setAiNarrative] = useState('');
  const [explain, setExplain] = useState(null);
  const openExplain = useCallback((payload) => setExplain(payload), []);
  const closeExplain = useCallback(() => setExplain(null), []);

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);

  useEffect(() => {
    document.body.classList.add('dashboard-mode');
    return () => document.body.classList.remove('dashboard-mode');
  }, []);

  const enabledGoals = useMemo(
    () => goalState.filter((g) => g.enabled && (g.isCustom ? String(g.label || '').trim() : true)),
    [goalState]
  );

  const toggleGoal = (id) => {
    setGoalState((prev) =>
      prev.map((g) => (g.id === id ? { ...g, enabled: !g.enabled } : g))
    );
  };

  const updateGoal = (id, field, value) => {
    setGoalState((prev) =>
      prev.map((g) => (g.id === id ? { ...g, [field]: value } : g))
    );
  };

  const addCustomGoal = () => {
    setGoalState((prev) => [
      ...prev,
      {
        id: `custom-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`,
        label: '',
        enabled: true,
        targetAmount: 300000,
        years: 5,
        isCustom: true,
      },
    ]);
  };

  const removeGoal = (id) => {
    setGoalState((prev) => prev.filter((g) => g.id !== id));
  };

  const addHoldingRow = useCallback(() => {
    setHoldings((prev) => [
      ...prev,
      { id: newHoldingId(), schemeCode: '', schemeName: '', currentAmount: 0 },
    ]);
  }, []);

  const addHoldingFromSuggestion = useCallback((s) => {
    setHoldings((prev) => [
      ...prev,
      {
        id: newHoldingId(),
        schemeCode: s.schemeCode,
        schemeName: s.schemeName,
        currentAmount: 0,
      },
    ]);
  }, []);

  const updateHolding = useCallback((id, patch) => {
    setHoldings((prev) => prev.map((h) => (h.id === id ? { ...h, ...patch } : h)));
  }, []);

  const removeHolding = useCallback((id) => {
    setHoldings((prev) => prev.filter((h) => h.id !== id));
  }, []);

  const handleGenerate = async () => {
    setError('');
    setResult(null);
    setAiNarrative('');
    setLoading(true);
    setAiLoading(!!geminiKey);

    try {
      const holdingsLinked = holdings.filter((h) => h.schemeCode);
      let mfStats = null;
      let mfBreakdown = [];

      if (holdingsLinked.length > 0) {
        const entries = await Promise.all(
          holdingsLinked.map(async (h) => {
            try {
              const hist = await mfSchemeHistory(h.schemeCode);
              const stats = statsFromNavRows(hist.data);
              return { holding: h, stats };
            } catch {
              return { holding: h, stats: null };
            }
          })
        );
        mfBreakdown = entries.map((e) => ({
          schemeName: e.holding.schemeName,
          schemeCode: e.holding.schemeCode,
          stats: e.stats,
          weight: Number(e.holding.currentAmount) || 0,
        }));
        mfStats = aggregateWeightedMfStats(
          entries.map((e) => ({
            stats: e.stats,
            weight: Number(e.holding.currentAmount) || 0,
          }))
        );
      }

      let stockStats = null;
      const sym = stockSymbol.trim().toUpperCase();
      if (alphaKey && sym) {
        try {
          stockStats = await avTimeSeriesStats(alphaKey, sym);
        } catch {
          stockStats = null;
        }
      }

      const paths = buildRiskPaths({
        mfAnnualReturn: mfStats?.meanAnnual,
        mfVol: mfStats?.volAnnual,
        stockAnnualReturn: stockStats?.meanAnnual,
        stockVol: stockStats?.volAnnual,
      });

      const monthly = monthlySalary * (savingsPercent / 100);
      const years = Math.min(45, Math.max(3, horizonYears));

      const enriched = paths.map((p) => {
        const fvNominal = fvGrowingPortfolio({
          monthlyContrib: monthly,
          lumpSum: startingCorpus,
          meanAnnual: p.meanAnnual,
          years,
        });
        const fvReal = realFromNominal(fvNominal, years, DEFAULT_INFLATION);
        const probProfit = monteCarloProfitProbability({
          monthlyContrib: monthly,
          lumpSum: startingCorpus,
          years,
          meanAnnual: p.meanAnnual,
          volAnnual: p.volAnnual,
        });
        const series = yearlySeriesDeterministic({
          monthlyContrib: monthly,
          lumpSum: startingCorpus,
          meanAnnual: p.meanAnnual,
          years,
        });
        return { ...p, fvNominal, fvReal, probProfit, series };
      });

      const chartData = enriched[0].series.map((row, idx) => ({
        year: row.year,
        contributed: row.contributed,
        safe: enriched[0].series[idx].nominal,
        moderate: enriched[1].series[idx].nominal,
        aggressive: enriched[2].series[idx].nominal,
      }));

      const totalTargets = enabledGoals.reduce((s, g) => s + (Number(g.targetAmount) || 0), 0);
      const targetLine = enabledGoals.length
        ? enabledGoals.map((g) => `${g.label || 'Goal'}: ${fmtInr(g.targetAmount)} in ${g.years}y`).join('; ')
        : 'No specific goals ticked — using long-term wealth build.';

      const defaultQueries = buildDefaultMfQueries(enabledGoals);
      let aiQueries = [];
      if (geminiKey) {
        try {
          aiQueries = await generateMfSuggestionQueries(geminiKey, {
            monthlySalary,
            savingsPercent,
            horizonYears: years,
            goals: enabledGoals.map((g) => ({
              label: g.label,
              target: g.targetAmount,
              years: g.years,
            })),
            linkedSchemes: holdingsLinked.map((h) => h.schemeName),
            note: 'Suggest diverse Indian MF search phrases only.',
          });
        } catch {
          aiQueries = [];
        }
      }
      const mergedQueries = [...new Set([...aiQueries, ...defaultQueries].map((q) => String(q).trim()).filter(Boolean))];
      let suggestedSchemes = await mfSuggestionsFromQueries(mergedQueries, { perQuery: 6, maxTotal: 42 });
      const heldCodes = new Set(holdingsLinked.map((h) => h.schemeCode));
      suggestedSchemes = suggestedSchemes
        .filter((s) => !heldCodes.has(s.schemeCode))
        .map((s) => {
          const { horizon, risk } = classifySuggestedMfScheme(s.schemeName, s.suggestedVia);
          return { ...s, horizon, risk };
        });

      const mfNote =
        holdingsLinked.length === 0
          ? 'No schemes linked — moderate path uses default balanced-fund assumptions. Add schemes anytime to calibrate from NAV history.'
          : mfStats
            ? `Moderate path weighted by your linked scheme(s) and optional ₹ amounts (${mfBreakdown
                .filter((b) => b.stats)
                .map((b) => b.schemeName)
                .join(', ') || 'NAV data'}).`
            : 'Linked schemes did not return enough NAV history — using defaults for the moderate path.';

      const dataNote = !alphaKey
        ? 'Add VITE_ALPHA_VANTAGE_API_KEY and an equity symbol to calibrate the high-growth path from Alpha Vantage.'
        : !sym
          ? 'No equity symbol — high-growth path uses default equity assumptions.'
          : stockStats
            ? `Equity stats from ~${stockStats.points} trading days (${sym}).`
            : 'Equity stats fell back to defaults (API limit or symbol issue).';

      setResult({
        paths: enriched,
        chartData,
        monthlyContrib: monthly,
        years,
        mfStats,
        mfBreakdown,
        stockStats,
        dataNote,
        mfNote,
        targetLine,
        totalTargets,
        snapshotGoals: enabledGoals.map((g) => ({
          id: g.id,
          label: g.isCustom ? String(g.label || '').trim() || 'Custom goal' : g.label,
          targetAmount: Number(g.targetAmount) || 0,
          years: Math.max(1, Number(g.years) || 1),
          isCustom: !!g.isCustom,
        })),
        startingCorpus: Math.max(0, Number(startingCorpus) || 0),
        suggestedSchemes,
        equitySymbolUsed: sym || null,
      });

      if (geminiKey) {
        const payload = {
          salaryMonthly: monthlySalary,
          savingsPercent,
          horizonYears: years,
          monthlyInvest: monthly,
          startingCorpus,
          inflation: DEFAULT_INFLATION,
          mfHoldings: holdingsLinked.map((h) => ({
            name: h.schemeName,
            code: h.schemeCode,
            invested: h.currentAmount,
          })),
          equitySymbol: sym || null,
          goals: enabledGoals.map((g) => ({
            goal: g.label,
            target: g.targetAmount,
            years: g.years,
          })),
          paths: enriched.map((p) => ({
            name: p.label,
            expectedNominalEnd: Math.round(p.fvNominal),
            expectedRealEnd: Math.round(p.fvReal),
            probProfitPct: Math.round(p.probProfit * 10) / 10,
            assumedReturnPct: Math.round(p.meanAnnual * 1000) / 10,
          })),
          note: 'Use INR. Educational only — not personal financial advice.',
        };
        const prompt = `You are a supportive financial coach. Given this JSON about a young investor's goals and three simulated paths (safe, moderate, high growth), write:
(1) A vivid "Future You" paragraph for year ${years} — what life could look like if they stay disciplined (house, travel, retirement cushion) in plain English.
(2) One short paragraph comparing the three paths and how probability of profit relates to volatility.

Data:\n${JSON.stringify(payload, null, 2)}

Keep total under 220 words. No bullet lists.`;

        try {
          const text = await generateGoalNarrative(geminiKey, prompt);
          setAiNarrative(text);
        } catch {
          setAiNarrative('');
        }
      }
      setAiLoading(false);
    } catch (e) {
      setError(e.message || 'Could not build your plan.');
    } finally {
      setLoading(false);
      setAiLoading(false);
    }
  };

  const exampleFuture = result?.paths.find((p) => p.id === 'moderate');

  const inflationPct = (DEFAULT_INFLATION * 100).toFixed(0);
  const chartYearTicks = result
    ? (() => {
        const y = result.years;
        const steps = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45].filter((t) => t <= y);
        if (steps[steps.length - 1] !== y) steps.push(y);
        return steps;
      })()
    : [];

  return (
    <div className="fg-page">
      <FgExplainModal
        open={!!explain}
        title={explain?.title ?? ''}
        onClose={closeExplain}
      >
        {explain?.content}
      </FgExplainModal>
      <header className="fg-header">
        <Link to="/dashboard" className="fg-back">
          <ArrowLeft size={18} />
          Back to dashboard
        </Link>
        <div className="fg-header-brand">
          <span className="fg-logo">FINVEST</span>
          <h1>Financial Goals &amp; Future You</h1>
          <p>
            Salary, ambitions, and time — mapped to three risk paths. Mutual funds and equity symbols are optional
            refinements for the math.
          </p>
        </div>
      </header>

      <main className="fg-main">
        {(!alphaKey || !geminiKey) && (
          <div className="fg-banner">
            <strong>API keys:</strong> Add <code>VITE_ALPHA_VANTAGE_API_KEY</code> and{' '}
            <code>VITE_GEMINI_API_KEY</code> in <code>FRONTEND/.env</code> (see <code>.env.example</code>). Mutual fund
            data uses{' '}
            <a href="https://api.mfapi.in" target="_blank" rel="noreferrer">
              mfapi.in
            </a>{' '}
            with no key. Stock analytics follow{' '}
            <a href="https://www.alphavantage.co/" target="_blank" rel="noreferrer">
              Alpha Vantage
            </a>
            .
          </div>
        )}

        <div className="fg-grid">
          <MotionSection className="fg-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <h2>
              <ClipboardList size={22} /> Your situation
            </h2>
            <div className="fg-field">
              <label>Monthly salary (₹)</label>
              <input
                type="number"
                min="0"
                value={monthlySalary}
                onChange={(e) => setMonthlySalary(Number(e.target.value))}
              />
            </div>
            <div className="fg-field">
              <label>Saved each month (% of salary)</label>
              <input
                type="number"
                min="1"
                max="80"
                value={savingsPercent}
                onChange={(e) => setSavingsPercent(Number(e.target.value))}
              />
            </div>
            <div className="fg-field">
              <label>Starting investments (₹ lump, optional)</label>
              <input
                type="number"
                min="0"
                value={startingCorpus}
                onChange={(e) => setStartingCorpus(Number(e.target.value))}
              />
            </div>
            <div className="fg-field">
              <label>Main planning horizon (years)</label>
              <input
                type="number"
                min="3"
                max="45"
                value={horizonYears}
                onChange={(e) => setHorizonYears(Number(e.target.value))}
              />
            </div>

            <h3 className="fg-sub">Goals &amp; ambitions</h3>
            <p className="fg-hint">
              Tick what matters, set a target and timeline. Add your own goals with the button below.
            </p>
            <div className="fg-goals">
              {goalState.map((g) => (
                <div key={g.id} className={`fg-goal-row ${g.enabled ? 'on' : ''}`}>
                  <div className="fg-goal-head">
                    <label className="fg-check">
                      <input type="checkbox" checked={g.enabled} onChange={() => toggleGoal(g.id)} />
                      {!g.isCustom ? <span>{g.label}</span> : null}
                    </label>
                    {g.isCustom ? (
                      <input
                        className="fg-custom-label"
                        style={{ flex: 1, minWidth: 0 }}
                        value={g.label}
                        onChange={(e) => updateGoal(g.id, 'label', e.target.value)}
                        placeholder="Name your goal"
                      />
                    ) : null}
                    {g.isCustom && (
                      <button
                        type="button"
                        className="fg-goal-remove"
                        aria-label="Remove goal"
                        onClick={() => removeGoal(g.id)}
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  {g.enabled && (
                    <div className="fg-goal-inputs">
                      <input
                        type="number"
                        placeholder="Target ₹"
                        value={g.targetAmount}
                        onChange={(e) => updateGoal(g.id, 'targetAmount', Number(e.target.value))}
                      />
                      <input
                        type="number"
                        placeholder="Years"
                        min="1"
                        max="40"
                        value={g.years}
                        onChange={(e) => updateGoal(g.id, 'years', Number(e.target.value))}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <button type="button" className="fg-add-row" onClick={addCustomGoal}>
              <Plus size={18} /> Add custom goal
            </button>
          </MotionSection>

          <MotionSection
            className="fg-card"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <h2>
              <TrendingUp size={22} /> Market anchors (optional)
            </h2>
            <p className="fg-hint">
              <strong>All optional.</strong> Add equity ticker and/or Indian MF schemes to tune expected return and
              volatility. Leave blank and we still build the three paths with sensible defaults. After you generate,
              we suggest more schemes you can add with one click.
            </p>
            <div className="fg-field">
              <label>Equity symbol (Alpha Vantage)</label>
              <input
                value={stockSymbol}
                onChange={(e) => setStockSymbol(e.target.value.toUpperCase())}
                placeholder="e.g. SPY — leave empty to skip"
              />
            </div>

            <h3 className="fg-sub">Mutual fund schemes you use (0 or many)</h3>
            <p className="fg-hint">Each row: search and link a scheme if you want; ₹ already invested helps weight NAV statistics.</p>
            {holdings.map((h) => (
              <MfHoldingRow
                key={h.id}
                holding={h}
                onChange={(next) => updateHolding(h.id, next)}
                onRemove={() => removeHolding(h.id)}
              />
            ))}
            <button type="button" className="fg-add-row" onClick={addHoldingRow}>
              <Plus size={18} /> Add mutual fund row
            </button>

            <button type="button" className="fg-primary" onClick={handleGenerate} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 size={18} className="spin" /> Building plan…
                </>
              ) : (
                <>
                  <Sparkles size={18} /> Generate paths &amp; Future You
                </>
              )}
            </button>
            {error && <p className="fg-error">{error}</p>}
          </MotionSection>
        </div>

        {result && (
          <>
            <section className="fg-card fg-wide">
              <div className="fg-section-title-row">
                <h2>The three paths</h2>
                <FgExplainIcon
                  label="Explain the three paths"
                  title="The three paths — overview"
                  onOpen={openExplain}
                >
                  <>
                    <ExplainSection title="What this is">
                      <p>
                        Three <strong>illustrative</strong> scenarios, not fund recommendations. Each path uses the same
                        your savings inputs but different assumed annual return and volatility so you can compare how
                        risk style changes the story.
                      </p>
                    </ExplainSection>
                    <ExplainSection title="Why we calculate three numbers">
                      <p>
                        People often wonder: “If I keep saving, what might I have under calmer vs. bolder assumptions?”
                        Showing safe, moderate, and high-growth side by side answers that in one glance—while reminding
                        you that all of it is modeled, not predicted.
                      </p>
                    </ExplainSection>
                    <ExplainSection title="The grey lines above the cards">
                      <p>
                        Those short sentences report <strong>what data we actually used</strong>: Alpha Vantage for your
                        equity symbol when present, NAV history from mfapi.in for linked mutual funds, or built-in
                        defaults when something is missing or rate-limited. They are transparency notes, not advice.
                      </p>
                    </ExplainSection>
                  </>
                </FgExplainIcon>
              </div>
              <p className="fg-meta fg-meta-tight">{result.dataNote}</p>
              <p className="fg-meta fg-meta-tight">{result.mfNote}</p>
              <p className="fg-paths-sip-line">
                <FgExplainLink
                  text="Monthly SIP (calculation)"
                  title="Monthly SIP — what it is and how we use it"
                  onOpen={openExplain}
                >
                  <>
                    <ExplainSection title="What it is">
                      <p>
                        The rupee amount we assume you invest <strong>every month</strong> for the whole planning
                        horizon.
                      </p>
                    </ExplainSection>
                    <ExplainSection title="How we calculate it">
                      <p>
                        <strong>Monthly SIP = monthly salary × (savings % ÷ 100).</strong> Example: ₹80,000 salary and
                        25% saved → ₹20,000 per month. Your starting lump sum is added once at the beginning; the SIP
                        adds the same amount each month thereafter in the projection.
                      </p>
                    </ExplainSection>
                    <ExplainSection title="Why we hold it constant">
                      <p>
                        So the chart and ending balances stay easy to interpret. Real life varies; this is a clean
                        baseline you can adjust by changing salary or savings % and generating again.
                      </p>
                    </ExplainSection>
                  </>
                </FgExplainLink>
                <span className="fg-paths-sip-value">
                  <strong>{fmtInr(result.monthlyContrib)}</strong>/mo
                </span>
              </p>
              <p className="fg-meta-hint fg-meta-hint-compact">
                Use <span className="fg-meta-hint-ico">ⓘ</span> or <span className="fg-underline-hint">underlined</span>{' '}
                labels on each card for full definitions (e.g. inflation &amp; “real-ish”, nominal balance, Monte Carlo).
              </p>
              <div className="fg-path-grid">
                {result.paths.map((p) => (
                  <div key={p.id} className={`fg-path-card fg-path-${p.id}`}>
                    <div className="fg-path-head">
                      {p.id === 'safe' && <Shield size={20} />}
                      {p.id === 'moderate' && <TrendingUp size={20} />}
                      {p.id === 'aggressive' && <Zap size={20} />}
                      <div className="fg-path-head-text">
                        <div className="fg-path-title-row">
                          <h3>{p.label}</h3>
                          <FgExplainIcon
                            label={`About ${p.label}`}
                            title={PATH_EXPLAIN[p.id].title}
                            onOpen={openExplain}
                          >
                            {PATH_EXPLAIN[p.id].body}
                          </FgExplainIcon>
                        </div>
                        <p className="fg-path-subtitle">{p.subtitle}</p>
                      </div>
                    </div>
                    <div className="fg-stat">
                      <FgExplainLink
                        text="End balance (nominal)"
                        title="End balance (nominal)"
                        onOpen={openExplain}
                      >
                        <>
                          <ExplainSection title="What it is">
                            <p>
                              The <strong>rupee amount</strong> the model says you could have at the <strong>end of year</strong>{' '}
                              {result.years} on this path, before adjusting for inflation.
                            </p>
                          </ExplainSection>
                          <ExplainSection title="Why we calculate it">
                            <p>
                              It answers: “If returns behaved like this path’s <em>assumed</em> steady rate every year,
                              where would my balance land?” That isolates the effect of return assumptions from inflation.
                            </p>
                          </ExplainSection>
                          <ExplainSection title="What we assume">
                            <p>
                              Constant expected annual return for this path (see drift on this card), with your monthly
                              SIP and starting corpus compounded <strong>monthly</strong>. Markets are not this smooth in
                              real life—this is a teaching projection.
                            </p>
                          </ExplainSection>
                          <ExplainSection title="Formula and how we calculate">
                            <p>
                              We use future value of a monthly annuity plus a lump sum at the path’s mean annual return,
                              converted to a monthly rate: <code className="fg-explain-code">fvGrowingPortfolio</code> in
                              code. Conceptually: each month the balance grows by r/12, then your SIP is added, repeated
                              for {result.years * 12} months.
                            </p>
                          </ExplainSection>
                        </>
                      </FgExplainLink>
                      <strong>{fmtInr(p.fvNominal)}</strong>
                    </div>
                    <div className="fg-stat">
                      <FgExplainLink
                        text="After inflation (real-ish)"
                        title="Inflation and the “real-ish” balance"
                        onOpen={openExplain}
                      >
                        <>
                          <ExplainSection title="What inflation is">
                            <p>
                              <strong>Inflation</strong> is the tendency for prices in the economy to rise over time.
                              When inflation is positive, each rupee buys <em>less</em> in the future than today—even if
                              your account statement shows a bigger number.
                            </p>
                          </ExplainSection>
                          <ExplainSection title="Why we calculate a “real-ish” figure">
                            <p>
                              The <strong>nominal</strong> ending balance can look huge after decades. Dividing out a
                              simple inflation assumption gives a rough idea of <strong>purchasing power</strong> in terms
                              of today’s rupee—so you can sanity-check whether that pot might feel “as rich” as it sounds.
                            </p>
                          </ExplainSection>
                          <ExplainSection title="What inflation rate we use — and why">
                            <p>
                              We use a fixed <strong>{inflationPct}% per year</strong>, <strong>compounded</strong>{' '}
                              (the same idea year after year). In code this is <code className="fg-explain-code">
                                DEFAULT_INFLATION = {DEFAULT_INFLATION}
                              </code>{' '}
                              (i.e. {(DEFAULT_INFLATION * 100).toFixed(0)}%).
                            </p>
                            <p>
                              <strong>Why a single flat rate?</strong> Real CPI in India (and your personal basket of
                              goods) jumps around. A constant rate keeps the math transparent and comparable across all
                              three paths. Treat it as a <strong>plausible long-run teaching guess</strong>, not a
                              forecast of next year’s inflation.
                            </p>
                          </ExplainSection>
                          <ExplainSection title="Formula">
                            <p>
                              We deflate the nominal ending balance with compound inflation over your horizon (
                              {result.years} years), same as function <code className="fg-explain-code">realFromNominal</code>:
                            </p>
                            <p>
                              <code className="fg-explain-code">
                                real ≈ nominal ÷ (1 + {DEFAULT_INFLATION.toFixed(2)})^{result.years}
                              </code>
                            </p>
                          </ExplainSection>
                          <ExplainSection title="How we calculate it (step by step)">
                            <p>
                              <strong>1.</strong> Take this path’s nominal ending balance (shown on the row above in the
                              card).<br />
                              <strong>2.</strong> Compute the cumulative inflation factor: (1 +{' '}
                              {DEFAULT_INFLATION.toFixed(2)}) raised to the power {result.years} ≈{' '}
                              <strong>{(Math.pow(1 + DEFAULT_INFLATION, result.years)).toFixed(3)}</strong>.<br />
                              <strong>3.</strong> Divide nominal by that factor to get the “real-ish” value on this row.
                            </p>
                            <p>
                              We say <strong>“real-ish”</strong> because your real inflation depends on what you spend on
                              (rent, food, healthcare, etc.); one number cannot capture everyone.
                            </p>
                          </ExplainSection>
                        </>
                      </FgExplainLink>
                      <strong>{fmtInr(p.fvReal)}</strong>
                    </div>
                    <div className="fg-stat">
                      <FgExplainLink
                        text="Monte Carlo P(profit vs contributions)"
                        title="Monte Carlo: probability of profit"
                        onOpen={openExplain}
                      >
                        <>
                          <ExplainSection title="What it is">
                            <p>
                              A <strong>Monte Carlo</strong> exercise: we simulate many possible future paths for your
                              wealth using random shocks drawn from this path’s assumed volatility, month by month.
                            </p>
                          </ExplainSection>
                          <ExplainSection title="Why we calculate it">
                            <p>
                              The nominal ending balance uses one smooth assumed return. Monte Carlo adds a sense of{' '}
                              <strong>spread</strong>: with volatility, some futures look better and some worse. The
                              percentage summarizes how often a simple “did I beat my own deposits?” test passes.
                            </p>
                          </ExplainSection>
                          <ExplainSection title="What we assume">
                            <p>
                              <strong>600</strong> simulation runs (see <code className="fg-explain-code">
                                monteCarloProfitProbability
                              </code>
                              ), monthly time steps, geometric Brownian–style evolution using this path’s drift (expected
                              return) and annual volatility.
                            </p>
                          </ExplainSection>
                          <ExplainSection title="How “profit” is defined">
                            <p>
                              For each run we compare ending wealth to <strong>total cash contributed</strong> (starting
                              lump + every monthly SIP). If ending wealth is higher, that run counts as a “profit” for this
                              metric.
                            </p>
                          </ExplainSection>
                          <ExplainSection title="How to read the percentage">
                            <p>
                              It is the fraction of simulations that met that test, times 100. It is{' '}
                              <strong>not</strong> a guarantee of future results—only a stylized illustration of how
                              volatility interacts with steady saving.
                            </p>
                          </ExplainSection>
                        </>
                      </FgExplainLink>
                      <strong>{p.probProfit.toFixed(1)}%</strong>
                    </div>
                    <div className="fg-stat muted">
                      <FgExplainLink
                        text="Assumed drift / vol (annual)"
                        title="Assumed return (drift) and volatility"
                        onOpen={openExplain}
                      >
                        <>
                          <ExplainSection title="What drift and volatility are">
                            <p>
                              <strong>Drift</strong> (here: mean annual return) is the central tendency we plug into the
                              model—how fast we expect wealth to grow on average if nothing random happened.
                            </p>
                            <p>
                              <strong>Volatility</strong> is how much returns bounce around (annualized standard deviation).
                              Higher vol means bigger ups and downs in the Monte Carlo simulations.
                            </p>
                          </ExplainSection>
                          <ExplainSection title="Why we need both">
                            <p>
                              The <strong>deterministic</strong> ending balance uses mainly the expected return path. The{' '}
                              <strong>Monte Carlo</strong> probability uses both return and volatility so uncertainty shows
                              up in the spread of outcomes.
                            </p>
                          </ExplainSection>
                          <ExplainSection title="Values used on this card">
                            <p>
                              For <strong>{p.label}</strong>: drift ≈{' '}
                              <strong>{(p.meanAnnual * 100).toFixed(2)}%</strong> per year, volatility ≈{' '}
                              <strong>{(p.volAnnual * 100).toFixed(2)}%</strong> per year (after model clamps). They may
                              come from linked mutual fund NAVs, your equity symbol, or built-in defaults—see the grey
                              notes under “The three paths.”
                            </p>
                          </ExplainSection>
                          <ExplainSection title="How they feed the math (short)">
                            <p>
                              Monthly rate ≈ annual drift ÷ 12 for the smooth projection; simulations add a random shock
                              each month scaled by volatility. This is a textbook-style model, not a map of next month’s
                              market.
                            </p>
                          </ExplainSection>
                        </>
                      </FgExplainLink>
                      <strong>
                        {(p.meanAnnual * 100).toFixed(2)}% / {(p.volAnnual * 100).toFixed(2)}%
                      </strong>
                    </div>
                    <p className="fg-allocation">
                      <FgExplainLink
                        text="Typical mix (hint)"
                        title="Allocation hint"
                        onOpen={openExplain}
                      >
                        <>
                          <ExplainSection title="What it is">
                            <p>
                              A short, plain-English sketch of how money might be split between broad asset types in this{' '}
                              <strong>fictional</strong> path—not a buy list.
                            </p>
                          </ExplainSection>
                          <ExplainSection title="Why we show it">
                            <p>
                              It connects the abstract “safe / moderate / aggressive” labels to something intuitive
                              (e.g. more debt vs more equity) without naming specific schemes.
                            </p>
                          </ExplainSection>
                          <ExplainSection title="For this path">
                            <p>{p.allocationHint}</p>
                          </ExplainSection>
                        </>
                      </FgExplainLink>
                      <span className="fg-allocation-sep"> — </span>
                      {p.allocationHint}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {result.suggestedSchemes?.length > 0 && (
              <section className="fg-card fg-wide">
                <SuggestedSchemesPanel schemes={result.suggestedSchemes} onAddFromSuggestion={addHoldingFromSuggestion} />
              </section>
            )}

            <section className="fg-card fg-wide">
              <div className="fg-section-title-row">
                <h2>Wealth projection (nominal ₹)</h2>
                <FgExplainIcon
                  label="How to read this chart"
                  title="Reading the wealth projection"
                  onOpen={openExplain}
                >
                  <>
                    <ExplainSection title="What the chart shows">
                      <p>
                        How total portfolio value in <strong>nominal ₹</strong> could grow over your planning horizon
                        under three return assumptions, plus a <strong>no-growth</strong> baseline of what you simply
                        saved.
                      </p>
                    </ExplainSection>
                    <ExplainSection title="Horizontal axis (years)">
                      <p>
                        Years from the start. Year 0 includes your starting lump; each later year adds twelve monthly SIPs
                        and compounds growth for that path.
                      </p>
                    </ExplainSection>
                    <ExplainSection title="Vertical axis (₹ millions)">
                      <p>
                        Total portfolio value. Tick labels are in <strong>millions of rupees</strong> (e.g. 15.0M = ₹1.5
                        crore) to keep long horizons readable.
                      </p>
                    </ExplainSection>
                    <ExplainSection title="Coloured bands vs grey">
                      <p>
                        Coloured series use each path’s <strong>steady assumed return</strong> (deterministic). Grey is
                        cumulative contributions only—no return—so you can see how much growth added versus deposits.
                      </p>
                    </ExplainSection>
                  </>
                </FgExplainIcon>
              </div>
              <p className="fg-hint fg-hint-chart">
                Nominal ₹ over time. Legend is above the plot; axis titles sit outside so they don’t overlap the curve or
                legend.
              </p>
              <div className="fg-chart fg-chart--spaced">
                <div className="fg-chart-y-label" aria-hidden="true">
                  <span>Portfolio value</span>
                  <span className="fg-chart-y-sub">₹ millions (nominal)</span>
                </div>
                <div className="fg-chart-chart-col">
                  <div className="fg-chart-inner">
                    <ResponsiveContainer width="100%" height={360}>
                    <AreaChart data={result.chartData} margin={{ top: 52, right: 14, left: 2, bottom: 4 }}>
                      <defs>
                        <linearGradient id="safeG" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#16a34a" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#16a34a" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="modG" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2563eb" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="aggG" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#c026d3" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#c026d3" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis
                        dataKey="year"
                        ticks={chartYearTicks}
                        tick={{ fill: '#64748b', fontSize: 11 }}
                        tickMargin={10}
                        axisLine={{ stroke: '#cbd5e1' }}
                        tickLine={{ stroke: '#cbd5e1' }}
                      />
                      <YAxis
                        width={52}
                        tickFormatter={(v) => `${(v / 1e6).toFixed(1)}M`}
                        tick={{ fill: '#64748b', fontSize: 11 }}
                        tickMargin={8}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        formatter={(v) => fmtInr(v)}
                        contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }}
                        labelFormatter={(y) => `Year ${y}`}
                      />
                      <Legend
                        verticalAlign="top"
                        align="center"
                        wrapperStyle={{ top: 4, fontSize: 12, lineHeight: 1.5 }}
                        iconType="circle"
                      />
                      <Area
                      type="monotone"
                      dataKey="contributed"
                      name="Contributed (no growth)"
                      stroke="#94a3b8"
                      fill="#f1f5f9"
                      fillOpacity={0.9}
                    />
                    <Area type="monotone" dataKey="safe" name="Safe" stroke="#16a34a" fill="url(#safeG)" strokeWidth={2} />
                    <Area type="monotone" dataKey="moderate" name="Moderate" stroke="#2563eb" fill="url(#modG)" strokeWidth={2} />
                    <Area type="monotone" dataKey="aggressive" name="High growth" stroke="#a21caf" fill="url(#aggG)" strokeWidth={2} />
                    </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="fg-chart-x-label">Years from start of plan →</p>
                </div>
              </div>
            </section>

            {exampleFuture && (
              <FutureYouSection result={result} moderate={exampleFuture} inflationPct={inflationPct} />
            )}

            {(aiLoading || aiNarrative) && (
              <section className="fg-card fg-wide fg-ai">
                <h2>
                  <Sparkles size={22} /> Gemini perspective
                </h2>
                {aiLoading && (
                  <p className="fg-hint">
                    <Loader2 size={16} className="spin" /> Composing narrative…
                  </p>
                )}
                {aiNarrative && <div className="fg-ai-text">{aiNarrative}</div>}
                {!geminiKey && (
                  <p className="fg-hint">Set VITE_GEMINI_API_KEY to unlock AI storytelling for your numbers.</p>
                )}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default FinancialGoals;
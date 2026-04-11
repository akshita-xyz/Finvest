/**
 * @fileoverview Client-side “ML-style” assessment for Personalized Portfolio.
 *
 * Mirrors concepts from `Finvest/ML` (fear score, persona clusters, allocation hints)
 * without bundling Node `require()` modules into Vite.
 *
 * - **Hesitation time** per question → patience vs impulsive signal.
 * - **Answer meta** → overconfidence / risk-averse lean.
 * - **Feature vector** → nearest archetype centroid (k-means style assignment for 1 user).
 */

/** @typedef {{ id: string; label: string; traits?: Record<string, number>; fearDelta?: number }} QuizOption */
/** @typedef {{ id: string; title: string; description: string; options: QuizOption[] }} QuizQuestion */

/** @type {QuizQuestion[]} */
export const ASSESSMENT_QUESTIONS = [
  {
    id: 'decision_style',
    title: 'Before you act on a new investment idea…',
    description: 'Which option sounds most like you?',
    options: [
      {
        id: 'read_first',
        label: 'I read documentation and fine print before deciding.',
        traits: { patient: 1, impulsive: -0.8, planning: 1 },
        fearDelta: 8,
      },
      {
        id: 'facts_first',
        label: 'I want a few key facts, then I decide.',
        traits: { patient: 0.5, impulsive: -0.3, planning: 0.6 },
        fearDelta: 3,
      },
      {
        id: 'immediate',
        label: 'I respond right away — I trust my gut.',
        traits: { patient: -0.9, impulsive: 1, overconfident: 0.7, planning: -0.4 },
        fearDelta: -10,
      },
    ],
  },
  {
    id: 'holding_period',
    title: 'Your natural holding period for money you invest is…',
    description: 'There is no wrong answer — we map this to time horizon and volatility comfort.',
    options: [
      {
        id: 'intraday',
        label: 'Days to weeks (active trading style)',
        traits: { impulsive: 0.6, overconfident: 0.3 },
        fearDelta: -12,
      },
      {
        id: 'months',
        label: 'Several months — I rebalance occasionally',
        traits: { patient: 0.3, balanced: 0.5 },
        fearDelta: 2,
      },
      {
        id: 'years',
        label: 'Years or decades — I think long term',
        traits: { patient: 1, planning: 0.8 },
        fearDelta: 10,
      },
    ],
  },
  {
    id: 'market_drop',
    title: 'If your portfolio dropped 20% in a month, your first move would be…',
    description: 'Classic behavioral prompt (aligned with ML onboarding risk question).',
    options: [
      { id: 'sell', label: 'Sell or reduce exposure quickly', traits: {}, fearDelta: 22 },
      { id: 'wait', label: 'Wait it out — no panic trades', traits: { patient: 0.5 }, fearDelta: -4 },
      { id: 'buy', label: 'Buy more while prices are lower', traits: { overconfident: 0.4 }, fearDelta: -14 },
      { id: 'advisor', label: 'Consult an advisor or read more before acting', traits: { planning: 0.7 }, fearDelta: 6 },
    ],
  },
  {
    id: 'credit_comfort',
    title: 'Loans, credit lines, and bank policies (mortgages, insurance-linked plans)…',
    description: 'Helps separate “leveraged / policy” suitability from pure equity trading.',
    options: [
      {
        id: 'prefer_loans',
        label: 'I’m comfortable comparing loan terms and using credit when it makes sense',
        traits: { leverage_comfort: 1 },
        fearDelta: -5,
      },
      {
        id: 'neutral_credit',
        label: 'I use credit rarely and prefer to keep things simple',
        traits: { leverage_comfort: 0.3 },
        fearDelta: 4,
      },
      {
        id: 'avoid_debt',
        label: 'I avoid debt and prefer savings / pay-in-full products',
        traits: { leverage_comfort: -0.8, patient: 0.3 },
        fearDelta: 12,
      },
    ],
  },
];

/** Archetype centroids in [0,1]^4: [fearNorm, patience, impulsivity, planning] — for nearest-centroid “clustering”. */
const ARCHETYPE_CENTROIDS = {
  risk_averse: [0.78, 0.72, 0.22, 0.7],
  balanced: [0.5, 0.5, 0.45, 0.5],
  growth_seeker: [0.38, 0.42, 0.55, 0.42],
  overconfident: [0.22, 0.28, 0.88, 0.25],
};

function euclidean(a, b) {
  return Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0));
}

/**
 * @param {Record<string, string>} answers - questionId -> optionId
 * @param {number[]} hesitationMs - per question, same order as ASSESSMENT_QUESTIONS
 */
export function aggregateTraits(answers, hesitationMs) {
  let patient = 0;
  let impulsive = 0;
  let overconfident = 0;
  let planning = 0;
  let leverage_comfort = 0;
  let fear = 50;

  ASSESSMENT_QUESTIONS.forEach((q) => {
    const optId = answers[q.id];
    const opt = q.options.find((o) => o.id === optId);
    if (!opt) return;
    if (opt.traits) {
      Object.entries(opt.traits).forEach(([k, v]) => {
        if (k === 'patient') patient += v;
        if (k === 'impulsive') impulsive += v;
        if (k === 'overconfident') overconfident += v;
        if (k === 'planning') planning += v;
        if (k === 'leverage_comfort') leverage_comfort += v;
      });
    }
    if (typeof opt.fearDelta === 'number') fear += opt.fearDelta;
  });

  const avgHes =
    hesitationMs.length > 0
      ? hesitationMs.reduce((a, b) => a + b, 0) / hesitationMs.length
      : 4000;
  // Slower average response → more patience signal; very fast → impulsive signal
  const hesitationPatience = Math.min(1, avgHes / 28000);
  patient += hesitationPatience * 0.9;
  impulsive += (1 - hesitationPatience) * 0.55;

  fear += Math.min(18, avgHes / 900);
  fear -= Math.min(12, 3000 / Math.max(avgHes, 400));

  return {
    patient: Math.max(-2, Math.min(4, patient)),
    impulsive: Math.max(-2, Math.min(4, impulsive)),
    overconfident: Math.max(-2, Math.min(4, overconfident)),
    planning: Math.max(-2, Math.min(4, planning)),
    leverage_comfort: Math.max(-2, Math.min(4, leverage_comfort)),
    fearScore: Math.max(1, Math.min(100, Math.round(fear))),
    avgHesitationMs: Math.round(avgHes),
  };
}

/**
 * Nearest archetype in centroid space (same idea as k-means assignment step for k=4).
 * @param {ReturnType<typeof aggregateTraits>} traits
 */
export function assignClusterKey(traits) {
  const fearN = traits.fearScore / 100;
  const patienceN = (traits.patient + 2) / 6;
  const impulseN = (traits.impulsive + 2) / 6;
  const planN = (traits.planning + 2) / 6;
  const v = [fearN, patienceN, impulseN, planN];

  let best = 'balanced';
  let bestD = Infinity;
  Object.entries(ARCHETYPE_CENTROIDS).forEach(([key, c]) => {
    const d = euclidean(v, c);
    if (d < bestD) {
      bestD = d;
      best = key;
    }
  });
  return best;
}

/** Human-readable cluster + coaching copy (personalized nudges). */
export const CLUSTER_PLAYBOOK = {
  risk_averse: {
    label: 'Risk-averse',
    hint: 'Peers with similar patience often prefer FD ladders, short-duration debt funds, and clear insurance buffers before equities.',
    panic: 'Historically, broad equity markets have often recovered major drawdowns within 18–36 months — but past performance is not a guarantee.',
    trading: 'Intraday and high-turnover strategies rarely match your profile; consider SIPs and goal-based buckets instead.',
    loans: 'You may be well suited to conservative loan structures (e.g. fixed-rate mortgages) where predictability matters more than leverage.',
  },
  balanced: {
    label: 'Balanced',
    hint: 'Most users like you diversify across index funds + bonds and revisit allocation once or twice a year.',
    panic: 'Avoid panic selling after single-month drops — rebalancing beats timing for many balanced investors.',
    trading: 'A small “play” sleeve can satisfy curiosity while the core stays long-term index-focused.',
    loans: 'Compare term insurance + separate investments vs bundled products; clarity beats complexity.',
  },
  growth_seeker: {
    label: 'Growth-oriented',
    hint: 'Users in this cluster often tilt equities higher but still keep an emergency fund outside the market.',
    panic: 'Volatility is the price of growth — plan position sizes so a 30% drawdown does not force a fire sale.',
    trading: 'Swing or position trading may fit part of your style if rules-based; keep core long-term.',
    loans: 'Use leverage only when cashflows are stable and worst-case rates are modeled.',
  },
  overconfident: {
    label: 'Overconfident / fast-decision',
    hint: 'Most users like you who moved fast benefited from autopilot rules: caps per trade, max single-stock %, and scheduled rebalancing.',
    panic: 'Avoid panic selling after headlines — historically recoveries follow sharp drops, but concentration risk is real.',
    trading: 'Intraday can fit, but underperformance vs indices is common — keep a strict risk budget per session.',
    loans: 'Watch teaser rates and policy fine print; overconfidence + leverage is a common pain point.',
  },
};

/**
 * Simplified allocation (stocks / bonds / cash) from fear score — aligned with ML portfolio bands.
 * @param {number} fearScore
 */
export function allocationFromFearScore(fearScore) {
  if (fearScore < 28) {
    return { stocks: 78, bonds: 17, cash: 5, label: 'Aggressive growth mix' };
  }
  if (fearScore < 45) {
    return { stocks: 62, bonds: 28, cash: 10, label: 'Growth tilt' };
  }
  if (fearScore < 62) {
    return { stocks: 48, bonds: 38, cash: 14, label: 'Balanced' };
  }
  if (fearScore < 78) {
    return { stocks: 32, bonds: 48, cash: 20, label: 'Conservative' };
  }
  return { stocks: 18, bonds: 55, cash: 27, label: 'Capital preservation' };
}

/**
 * Build full assessment result for UI + persistence.
 * @param {Record<string, string>} answers
 * @param {number[]} hesitationMs
 */
export function buildAssessmentResult(answers, hesitationMs) {
  const traits = aggregateTraits(answers, hesitationMs);
  const clusterKey = assignClusterKey(traits);
  const cluster = CLUSTER_PLAYBOOK[clusterKey] || CLUSTER_PLAYBOOK.balanced;
  const allocation = allocationFromFearScore(traits.fearScore);

  const suitability = {
    tradingStyle:
      traits.impulsive > traits.patient + 0.3
        ? 'Higher fit for active / shorter-horizon trading — if you use rules, position sizing, and hard stops.'
        : 'Higher fit for longer holding periods, dollar-cost averaging, and fewer trades.',
    loansAndPolicies:
      traits.leverage_comfort > 0.4
        ? 'You may be more comfortable evaluating loans and bank-led products — still compare total cost and flexibility.'
        : 'You may prefer minimal leverage and simpler bank products; build liquidity before risk assets.',
  };

  return {
    version: 1,
    completedAt: new Date().toISOString(),
    answers,
    hesitationMs,
    traits,
    clusterKey,
    clusterLabel: cluster.label,
    messages: cluster,
    allocation,
    suitability,
  };
}

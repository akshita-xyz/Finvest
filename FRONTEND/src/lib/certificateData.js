/**
 * Build canonical certificate objects from the data the SPA already has on hand
 * (Supabase `dashboard_prefs`, the auth user, and — for emotion — localStorage).
 *
 * The shape MUST stay stable: every field becomes part of the keccak256 fingerprint
 * pinned on-chain. Bumping `v` is the only safe way to change the schema.
 */

const EMOTION_STORAGE_KEY = 'finvest_emotion_mindset_v1';

/** Strip undefined / null fields so canonicalize() produces stable output. */
function compact(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    if (typeof v === 'string' && v.trim() === '') continue;
    out[k] = v;
  }
  return out;
}

function readEmotionLocal() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(EMOTION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * @param {{
 *   userId?: string;
 *   recipient: string;
 *   dashboardPrefs?: Record<string, unknown> | null;
 * }} input
 * @returns {object | null} canonical cert object or null if the user hasn't earned it yet.
 */
export function buildPortfolioCertificate(input) {
  const prefs = input?.dashboardPrefs || {};
  const nft = prefs?.nft_badges && typeof prefs.nft_badges === 'object' ? prefs.nft_badges : {};
  const assessment = prefs?.assessment;
  const earned = Boolean(nft.portfolioCertificate || assessment?.completedAt);
  if (!earned) return null;

  const issuedAt =
    nft.portfolioCertificateAt ||
    assessment?.completedAt ||
    new Date().toISOString();

  const fearScore =
    typeof nft.portfolioFearScore === 'number'
      ? nft.portfolioFearScore
      : typeof assessment?.traits?.fearScore === 'number'
        ? assessment.traits.fearScore
        : null;

  const allocation =
    assessment?.allocation && typeof assessment.allocation === 'object'
      ? compact({
          stocks: Number(assessment.allocation.stocks) || 0,
          bonds: Number(assessment.allocation.bonds) || 0,
          cash: Number(assessment.allocation.cash) || 0,
          label: String(assessment.allocation.label || nft.portfolioAllocationLabel || ''),
        })
      : null;

  return compact({
    v: 1,
    type: 'portfolio',
    userId: input?.userId || null,
    recipient: String(input?.recipient || 'Finvest learner'),
    issuedAt: new Date(issuedAt).toISOString(),
    payload: compact({
      clusterLabel: String(nft.portfolioClusterLabel || assessment?.clusterLabel || ''),
      fearScore,
      allocation,
    }),
  });
}

export function buildEmotionCertificate(input) {
  const prefs = input?.dashboardPrefs || {};
  const nft = prefs?.nft_badges && typeof prefs.nft_badges === 'object' ? prefs.nft_badges : {};
  const local = readEmotionLocal();
  const earned = Boolean(nft.emotionCertificate || (local && local.at));
  if (!earned) return null;

  const issuedAt =
    nft.emotionCertificateAt ||
    (local?.at ? new Date(local.at).toISOString() : null) ||
    new Date().toISOString();

  const overallReadiness =
    typeof nft.emotionReadiness === 'number'
      ? nft.emotionReadiness
      : typeof local?.overallReadiness === 'number'
        ? local.overallReadiness
        : null;

  const archetype = String(nft.emotionArchetype || local?.archetype || '');

  return compact({
    v: 1,
    type: 'emotion',
    userId: input?.userId || null,
    recipient: String(input?.recipient || 'Finvest learner'),
    issuedAt: new Date(issuedAt).toISOString(),
    payload: compact({
      archetype,
      overallReadiness,
    }),
  });
}

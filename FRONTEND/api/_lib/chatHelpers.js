import { createClient } from '@supabase/supabase-js';

const AV_BASE = 'https://www.alphavantage.co/query';

const TICKER_STOPWORDS = new Set([
  'THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 'CAN', 'HER', 'WAS', 'ONE', 'OUR', 'OUT', 'DAY', 'GET',
  'HAS', 'HIM', 'HIS', 'HOW', 'ITS', 'MAY', 'NEW', 'NOW', 'OLD', 'SEE', 'TWO', 'WHO', 'BOY', 'DID', 'LET', 'PUT',
  'SAY', 'SHE', 'TOO', 'USE', 'THAT', 'THIS', 'WITH', 'HAVE', 'FROM', 'WHAT', 'WHEN', 'YOUR', 'WILL', 'JUST', 'LIKE',
  'BEEN', 'ALSO', 'BACK', 'THAN', 'THEN', 'HERE', 'SOME', 'VERY', 'WHY', 'HELP', 'EACH', 'MOST', 'MORE', 'ONLY',
  'OVER', 'SUCH', 'READ', 'TELL', 'WELL', 'WORK', 'YEAR', 'CAME', 'COME', 'EVEN', 'GOOD', 'JUST', 'KEEP', 'LAST',
  'LONG', 'LOOK', 'MADE', 'MAKE', 'MANY', 'MUCH', 'MUST', 'NEED', 'NEXT', 'OPEN', 'PART', 'SEEM', 'SHOW', 'STAY',
  'STOP', 'SURE', 'TAKE', 'THEM', 'THEY', 'TIME', 'VERY', 'WANT', 'WAYS', 'WENT', 'WERE', 'WHAT', 'WHEN', 'WITH',
]);

function supabaseUrl() {
  return String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim().replace(/\/+$/, '');
}

function supabaseAnonKey() {
  return String(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();
}

/** User-scoped client so RLS applies when loading `user_profiles` for /api/chat. */
export function supabaseForUserJwt(accessToken) {
  const url = supabaseUrl();
  const key = supabaseAnonKey();
  if (!url || !key || !accessToken || typeof accessToken !== 'string') return null;
  return createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

/**
 * @param {Record<string, unknown> | null | undefined} profile
 */
export function compactProfileForPrompt(profile) {
  if (!profile || typeof profile !== 'object') return {};
  const prefs =
    profile.dashboard_prefs && typeof profile.dashboard_prefs === 'object' && !Array.isArray(profile.dashboard_prefs)
      ? profile.dashboard_prefs
      : {};
  const assessment = prefs.assessment && typeof prefs.assessment === 'object' ? prefs.assessment : null;
  return {
    display_name: profile.display_name || '',
    email: profile.email || '',
    fear_score: profile.fear_score ?? null,
    classification: profile.classification || '',
    assessment_completed_at: assessment?.completedAt || null,
    cluster_label: assessment?.clusterLabel || '',
    suitability: assessment?.suitability || null,
    allocation: assessment?.allocation || null,
    quiz_answers: assessment?.answers || null,
  };
}

function alphaVantageKey() {
  return String(process.env.ALPHA_VANTAGE_KEY || process.env.ALPHA_VANTAGE_API_KEY || '').trim();
}

/**
 * @param {string} text
 * @returns {string[]}
 */
export function extractTickerCandidates(text) {
  const upper = String(text || '').toUpperCase();
  const raw = upper.match(/\$?[A-Z][A-Z0-9]{0,4}\b/g) || [];
  const out = [];
  for (const t of raw) {
    const s = t.replace(/^\$/, '');
    if (s.length >= 2 && s.length <= 5 && !TICKER_STOPWORDS.has(s)) out.push(s);
  }
  return [...new Set(out)].slice(0, 3);
}

/**
 * @param {string} symbol
 */
async function fetchAlphaVantageGlobalQuote(symbol) {
  const key = alphaVantageKey();
  if (!key) return null;
  const sym = String(symbol || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9.-]/g, '');
  if (!sym || sym.length > 12) return null;
  const url = `${AV_BASE}?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(sym)}&apikey=${encodeURIComponent(key)}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = await res.json();
  if (json.Note || json.Information) return null;
  const q = json['Global Quote'];
  if (!q || !q['05. price']) return null;
  return {
    symbol: String(q['01. symbol'] || sym),
    price: String(q['05. price']),
    change: String(q['09. change'] ?? ''),
    changePercent: String(q['10. change percent'] ?? ''),
  };
}

/**
 * @param {string} userMessage
 * @returns {Promise<string>}
 */
export async function buildAlphaVantageContext(userMessage) {
  const key = alphaVantageKey();
  if (!key) return '';
  const candidates = extractTickerCandidates(userMessage);
  const lines = [];
  for (const sym of candidates) {
    if (lines.length >= 2) break;
    const q = await fetchAlphaVantageGlobalQuote(sym);
    if (q) {
      lines.push(`${q.symbol}: ~$${q.price} (chg ${q.change}, ${q.changePercent}, Alpha Vantage, delayed)`);
    }
  }
  return lines.length ? lines.join('\n') : '';
}

const MF_BASE = 'https://api.mfapi.in';

/**
 * @param {string} query
 * @returns {Promise<Array<{ schemeCode: string, schemeName: string }>>}
 */
export async function mfSearch(query) {
  const q = (query || '').trim();
  if (q.length < 2) return [];
  const res = await fetch(`${MF_BASE}/mf/search?q=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error('MF search failed');
  const data = await res.json();
  return Array.isArray(data) ? data.slice(0, 12) : [];
}

/**
 * NAV history — { meta, data: [[date, nav], ...] }
 */
export async function mfSchemeHistory(schemeCode) {
  const code = String(schemeCode).trim();
  if (!code) throw new Error('Missing scheme code');
  const res = await fetch(`${MF_BASE}/mf/${encodeURIComponent(code)}`);
  if (!res.ok) throw new Error('MF history failed');
  return res.json();
}

/**
 * Annualized return & volatility from NAV series (weekly-ish daily spacing ok).
 */
/**
 * Run several search queries and merge unique schemes (order preserved).
 * @param {string[]} queries
 * @param {{ perQuery?: number, maxTotal?: number }} opts
 */
export async function mfSuggestionsFromQueries(queries, opts = {}) {
  const perQuery = opts.perQuery ?? 5;
  const maxTotal = opts.maxTotal ?? 14;
  const uniq = [...new Set((queries || []).map((q) => String(q).trim()).filter((q) => q.length >= 2))];
  const merged = [];
  const seen = new Set();
  for (const q of uniq) {
    try {
      const hits = await mfSearch(q);
      for (const h of hits.slice(0, perQuery)) {
        if (!h?.schemeCode || seen.has(h.schemeCode)) continue;
        seen.add(h.schemeCode);
        merged.push({ ...h, suggestedVia: q });
        if (merged.length >= maxTotal) return merged;
      }
    } catch {
      /* rate limit / network — skip query */
    }
  }
  return merged;
}

export function statsFromNavRows(dataRows) {
  if (!Array.isArray(dataRows) || dataRows.length < 40) return null;
  const navs = dataRows
    .map((row) => parseFloat(row[1]))
    .filter((n) => Number.isFinite(n) && n > 0)
    .reverse();
  if (navs.length < 40) return null;
  const logRet = [];
  for (let i = 1; i < navs.length; i++) {
    logRet.push(Math.log(navs[i] / navs[i - 1]));
  }
  const mean =
    logRet.reduce((a, b) => a + b, 0) / logRet.length;
  const variance =
    logRet.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, logRet.length - 1);
  const sigmaDaily = Math.sqrt(Math.max(variance, 1e-12));
  const muAnnual = mean * 252;
  const sigmaAnnual = sigmaDaily * Math.sqrt(252);
  return {
    meanAnnual: Math.min(0.25, Math.max(-0.15, muAnnual)),
    volAnnual: Math.min(0.5, Math.max(0.05, sigmaAnnual)),
    days: navs.length,
  };
}

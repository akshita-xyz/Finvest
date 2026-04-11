const AV_BASE = 'https://www.alphavantage.co/query';

function cacheKey(fn, symbol) {
  return `av_${fn}_${symbol}`;
}

function getCached(key) {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const { t, payload } = JSON.parse(raw);
    if (Date.now() - t > 4 * 60 * 1000) {
      sessionStorage.removeItem(key);
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function setCached(key, payload) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), payload }));
  } catch {
    /* ignore */
  }
}

/**
 * @param {string} apiKey
 * @param {string} symbol
 */
export async function avGlobalQuote(apiKey, symbol) {
  if (!apiKey) return null;
  const sym = (symbol || 'SPY').trim().toUpperCase();
  const key = cacheKey('quote', sym);
  const hit = getCached(key);
  if (hit) return hit;

  const url = `${AV_BASE}?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(sym)}&apikey=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = await res.json();
  const q = json['Global Quote'];
  if (!q || !q['05. price']) return null;
  const changePct = parseFloat(String(q['10. change percent'] || '0').replace('%', ''));
  const price = parseFloat(q['05. price']);
  const out = { symbol: sym, price, changePercent: changePct };
  setCached(key, out);
  return out;
}

/**
 * Daily closes → annualized mean log return & vol (252 trading days).
 */
export async function avTimeSeriesStats(apiKey, symbol) {
  if (!apiKey) return null;
  const sym = (symbol || 'SPY').trim().toUpperCase();
  const key = cacheKey('daily', sym);
  const hit = getCached(key);
  if (hit) return hit;

  const url = `${AV_BASE}?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(sym)}&outputsize=compact&apikey=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = await res.json();
  const note = json.Note || json.Information;
  if (note) {
    console.warn('Alpha Vantage:', note);
    return null;
  }
  const series = json['Time Series (Daily)'];
  if (!series) return null;
  const dates = Object.keys(series).sort();
  const closes = dates
    .slice(-120)
    .map((d) => parseFloat(series[d]['4. close']))
    .filter((c) => Number.isFinite(c) && c > 0);
  if (closes.length < 60) return null;
  const logRet = [];
  for (let i = 1; i < closes.length; i++) {
    logRet.push(Math.log(closes[i] / closes[i - 1]));
  }
  const mean = logRet.reduce((a, b) => a + b, 0) / logRet.length;
  const variance = logRet.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, logRet.length - 1);
  const sigmaDaily = Math.sqrt(Math.max(variance, 1e-12));
  const muAnnual = mean * 252;
  const sigmaAnnual = sigmaDaily * Math.sqrt(252);
  const out = {
    meanAnnual: Math.min(0.35, Math.max(-0.2, muAnnual)),
    volAnnual: Math.min(0.55, Math.max(0.08, sigmaAnnual)),
    points: closes.length,
  };
  setCached(key, out);
  return out;
}

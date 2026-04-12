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
 * Daily closes: annualized mean log return & vol (252 trading days).
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
    meanAnnual: Math.min(0.35, Math.max(-0.2, muAnnual)), volAnnual: Math.min(0.55, Math.max(0.08, sigmaAnnual)), points: closes.length, };
  setCached(key, out);
  return out;
}

/**
 * Global quote fields shaped like Finnhub /quote for Dashboard risk + live tiles.
 * @param {string} apiKey
 * @param {string} symbol
 * @returns {Promise<{ c: number, d: number, dp: number, h: number, l: number } | null>}
 */
export async function avFinnhubStyleQuote(apiKey, symbol) {
  if (!apiKey) return null;
  const sym = (symbol || 'SPY').trim().toUpperCase();
  const key = cacheKey('quote_fh', sym);
  const hit = getCached(key);
  if (hit) return hit;

  const url = `${AV_BASE}?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(sym)}&apikey=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = await res.json();
  if (json.Note || json.Information) return null;
  const q = json['Global Quote'];
  if (!q || !q['05. price']) return null;
  const c = parseFloat(q['05. price']);
  if (!Number.isFinite(c) || c <= 0) return null;
  const d = parseFloat(q['09. change'] ?? '0');
  const dp = parseFloat(String(q['10. change percent'] ?? '0').replace('%', ''));
  const h = parseFloat(q['03. high'] ?? q['05. price']);
  const l = parseFloat(q['04. low'] ?? q['05. price']);
  const out = {
    c,
    d: Number.isFinite(d) ? d : 0,
    dp: Number.isFinite(dp) ? dp : 0,
    h: Number.isFinite(h) ? h : c,
    l: Number.isFinite(l) ? l : c,
  };
  setCached(key, out);
  return out;
}

/**
 * @param {string} apiKey
 * @param {string} keywords
 * @returns {Promise<{ symbol: string, description: string }[]>}
 */
export async function avSymbolSearch(apiKey, keywords) {
  if (!apiKey || !String(keywords || '').trim()) return [];
  const key = `av_search_${String(keywords).trim().toLowerCase().slice(0, 64)}`;
  const hit = getCached(key);
  if (hit) return hit;

  const url = `${AV_BASE}?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(String(keywords).trim())}&apikey=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const json = await res.json();
  if (json.Note || json.Information) return [];
  const raw = json.bestMatches;
  if (!Array.isArray(raw)) return [];
  const out = raw
    .map((row) => {
      const symbol = row['1. symbol'] || row.symbol;
      const name = row['2. name'] || row.name || '';
      if (!symbol) return null;
      return { symbol: String(symbol), description: String(name) };
    })
    .filter(Boolean);
  setCached(key, out);
  return out;
}

/** @param {string} published YYYYMMDDTHHmmss */
function avNewsTimeToUnix(published) {
  const s = String(published || '');
  const m = s.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/);
  if (!m) return Math.floor(Date.now() / 1000);
  return Math.floor(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) / 1000);
}

/**
 * @param {string} apiKey
 * @param {{ tickers?: string, topics?: string, limit?: number }} opts
 * @returns {Promise<{ id: string, headline: string, summary: string, source: string, url: string, datetime: number }[]>}
 */
export async function avNewsArticles(apiKey, { tickers, topics, limit = 50 } = {}) {
  if (!apiKey) return [];
  const cacheK = `av_news_${String(tickers || '')}_${String(topics || '')}_${limit}`;
  const hit = getCached(cacheK);
  if (hit) return hit;

  const params = new URLSearchParams({
    function: 'NEWS_SENTIMENT',
    limit: String(Math.min(50, Math.max(1, limit))),
    sort: 'LATEST',
    apikey: apiKey,
  });
  if (tickers) params.set('tickers', tickers);
  if (topics) params.set('topics', topics);

  const url = `${AV_BASE}?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const json = await res.json();
  if (json.Note || json.Information) return [];
  const feed = json.feed;
  if (!Array.isArray(feed)) return [];

  const out = feed.map((item, i) => ({
    id: String(item.url || item.title || i),
    headline: String(item.title || ''),
    summary: String(item.summary || item.overall_sentiment_label || ''),
    source: String(item.source || 'Market news'),
    url: String(item.url || '#'),
    datetime: avNewsTimeToUnix(item.time_published),
  }));
  setCached(cacheK, out);
  return out;
}

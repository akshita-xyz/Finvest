/**
 * Finnhub free tier often blocks /stock/candle; quote + stock/metric still work.
 * Historical OHLC for charts is loaded via Yahoo chart JSON when candles fail.
 */

import { apiUrl } from './appBaseUrl';

function sanitizeSymbol(symbol) {
  return String(symbol || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9.-]/g, '');
}

function sanitizeQueryPart(s, fallback) {
  const t = String(s || fallback).toLowerCase();
  if (!/^[a-z0-9]+$/i.test(t) || t.length > 12) return fallback;
  return t;
}

/** Preset ranges for the TradingView-style chart toolbar (Yahoo `range` + `interval`). */
export const RISK_CHART_TIMEFRAMES = [
  { id: '1D', label: '1D', range: '1d', interval: '5m' }, { id: '5D', label: '5D', range: '5d', interval: '15m' }, { id: '1M', label: '1M', range: '1mo', interval: '1h' }, { id: '3M', label: '3M', range: '3mo', interval: '1d' }, { id: '6M', label: '6M', range: '6mo', interval: '1d' }, { id: 'YTD', label: 'YTD', range: 'ytd', interval: '1d' }, { id: '1Y', label: '1Y', range: '1y', interval: '1d' }, { id: '5Y', label: '5Y', range: '5y', interval: '1wk' }, { id: 'ALL', label: 'All', range: 'max', interval: '1mo' }, ];

function buildYahooChartUrls(symbol, range, interval) {
  const sym = sanitizeSymbol(symbol);
  if (!sym) return [];
  const rangeSafe = sanitizeQueryPart(range, '1y');
  const intervalSafe = sanitizeQueryPart(interval, '1d');
  const path = `/v8/finance/chart/${encodeURIComponent(sym)}?range=${encodeURIComponent(rangeSafe)}&interval=${encodeURIComponent(intervalSafe)}`;
  const qs = `symbol=${encodeURIComponent(sym)}&range=${encodeURIComponent(rangeSafe)}&interval=${encodeURIComponent(intervalSafe)}`;
  const urls = [];
  // Dev: prefer direct Yahoo proxy (fast) configured in vite.config.js.
  if (import.meta.env.DEV) {
    urls.push(`/__yahoo${path}`);
  }
  urls.push(`${apiUrl('/api/market/yahoo-chart')}?${qs}`);
  return urls;
}

/**
 * @param {string} interval Yahoo interval e.g. 5m, 1d, 1wk
 */
function isDayOrWeekBarInterval(interval) {
  const i = String(interval || '').toLowerCase();
  return i === '1d' || i === '1wk' || i === '1mo' || i === '3mo' || i === '6mo';
}

/**
 * @param {unknown} json Yahoo chart API body
 * @param {string} interval
 * @returns {{ candleData: { time: number|string, open: number, high: number, low: number, close: number }[], volumeData: { time: number|string, value: number, color: string }[], meta: { currency?: string, shortName?: string } } | null}
 */
export function parseYahooOHLCV(json, interval) {
  const r = json?.chart?.result?.[0];
  if (!r) return null;
  const timestamps = r.timestamp;
  const q = r.indicators?.quote?.[0];
  if (!q || !Array.isArray(timestamps) || timestamps.length < 2) return null;
  const { open: O, high: H, low: L, close: C, volume: V } = q;
  if (!Array.isArray(C)) return null;

  const dayBased = isDayOrWeekBarInterval(interval);
  const candleData = [];
  const volumeData = [];
  let prevClose = null;

  for (let i = 0; i < timestamps.length; i++) {
    let c = C[i];
    if (!Number.isFinite(c) && prevClose != null) c = prevClose;
    if (!Number.isFinite(c)) continue;

    let o = O?.[i];
    let h = H?.[i];
    let l = L?.[i];
    if (!Number.isFinite(o)) o = prevClose ?? c;
    if (!Number.isFinite(h)) h = Math.max(o, c);
    if (!Number.isFinite(l)) l = Math.min(o, c);
    prevClose = c;

    const ts = timestamps[i];
    const time = dayBased
      ? new Date(ts * 1000).toISOString().slice(0, 10)
      : ts;

    candleData.push({ time, open: o, high: h, low: l, close: c });

    const volRaw = Array.isArray(V) ? V[i] : null;
    const vol = Number.isFinite(volRaw) && volRaw >= 0 ? volRaw : 0;
    const up = c >= o;
    volumeData.push({
      time, value: vol, color: up ? 'rgba(22, 163, 74, 0.45)' : 'rgba(220, 38, 38, 0.45)', });
  }

  if (candleData.length < 2) return null;

  const meta = {
    currency: r.meta?.currency || 'USD', shortName: r.meta?.shortName || r.meta?.symbol || '', };
  return { candleData, volumeData, meta };
}

/**
 * Map UI timeframe to Finnhub stock/candle params (fallback when Yahoo proxy is unavailable).
 */
function mapToFinnhubCandleParams(range, interval) {
  const to = Math.floor(Date.now() / 1000);
  const day = 86400;
  const r = String(range || '').toLowerCase();
  const iv = String(interval || '').toLowerCase();

  if (r === '1d' && iv === '5m') return { from: to - day, to, resolution: '5' };
  if (r === '5d' && iv === '15m') return { from: to - 5 * day, to, resolution: '15' };
  if (r === '1mo' && iv === '1h') return { from: to - 31 * day, to, resolution: '60' };
  if (r === '3mo' && iv === '1d') return { from: to - 95 * day, to, resolution: 'D' };
  if (r === '6mo' && iv === '1d') return { from: to - 185 * day, to, resolution: 'D' };
  if (r === 'ytd' && iv === '1d') {
    const y = new Date();
    const start = new Date(Date.UTC(y.getUTCFullYear(), 0, 1));
    return { from: Math.floor(start.getTime() / 1000), to, resolution: 'D' };
  }
  if (r === '1y' && iv === '1d') return { from: to - 370 * day, to, resolution: 'D' };
  if (r === '5y' && iv === '1wk') return { from: to - 5 * 370 * day, to, resolution: 'W' };
  if (r === 'max' && iv === '1mo') return { from: to - 20 * 365 * day, to, resolution: 'M' };
  return { from: to - 370 * day, to, resolution: 'D' };
}

/**
 * @param {unknown} data Finnhub candle JSON
 * @param {string} resolution Finnhub resolution e.g. D, 5
 * @returns {ReturnType<typeof parseYahooOHLCV>}
 */
export function parseFinnhubCandlesToOHLCV(data, resolution) {
  if (!data || data.s !== 'ok' || !Array.isArray(data.t) || data.t.length < 2) return null;
  const T = data.t;
  const O = data.o;
  const H = data.h;
  const L = data.l;
  const C = data.c;
  const V = data.v;
  const dayBased = ['D', 'W', 'M'].includes(String(resolution).toUpperCase());

  const candleData = [];
  const volumeData = [];

  for (let i = 0; i < T.length; i++) {
    const c = C[i];
    if (!Number.isFinite(c)) continue;
    const o = Number.isFinite(O[i]) ? O[i] : c;
    const h = Number.isFinite(H[i]) ? H[i] : Math.max(o, c);
    const l = Number.isFinite(L[i]) ? L[i] : Math.min(o, c);
    const ts = T[i];
    const time = dayBased ? new Date(ts * 1000).toISOString().slice(0, 10) : ts;
    candleData.push({ time, open: o, high: h, low: l, close: c });
    const vol = Number.isFinite(V?.[i]) && V[i] >= 0 ? V[i] : 0;
    const up = c >= o;
    volumeData.push({
      time, value: vol, color: up ? 'rgba(22, 163, 74, 0.45)' : 'rgba(220, 38, 38, 0.45)', });
  }

  if (candleData.length < 2) return null;
  return {
    candleData, volumeData, meta: { currency: 'USD', shortName: '' }, };
}

/**
 * @param {string} finnhubToken optional; if set, used when Yahoo routes fail (e.g. static deploy without /__yahoo).
 */
export async function fetchFinnhubChartOHLCV(symbol, range, interval, finnhubToken) {
  const sym = sanitizeSymbol(symbol);
  const token = String(finnhubToken || '').trim();
  if (!sym || !token) return null;
  let { from, to, resolution } = mapToFinnhubCandleParams(range, interval);
  const day = 86400;

  const tryOnce = async (f, t) => {
    const url = `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(sym)}&resolution=${encodeURIComponent(resolution)}&from=${f}&to=${t}&token=${encodeURIComponent(token)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    if (json.error) return null;
    return parseFinnhubCandlesToOHLCV(json, resolution);
  };

  try {
    let out = await tryOnce(from, to);
    if (out) return out;
    // Free tier often returns no_data for long daily windows , retry ~3 months.
    if (to - from > 120 * day && ['D', 'W', 'M'].includes(String(resolution).toUpperCase())) {
      from = to - 93 * day;
      out = await tryOnce(from, to);
      if (out) return out;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * @param {string} [finnhubToken] optional Finnhub key for fallback when Yahoo proxy is not available
 * @returns {Promise<ReturnType<typeof parseYahooOHLCV>>}
 */
export async function fetchYahooChartOHLCV(symbol, range, interval, finnhubToken) {
  const urls = buildYahooChartUrls(symbol, range, interval);
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const json = await res.json();
      const parsed = parseYahooOHLCV(json, interval);
      if (parsed) return parsed;
    } catch {
      /* next */
    }
  }
  const fh = await fetchFinnhubChartOHLCV(symbol, range, interval, finnhubToken);
  if (fh) return fh;
  return null;
}

/**
 * @param {unknown} json Yahoo chart API body
 * @returns {{ t: number[], c: number[] } | null}
 */
export function parseYahooChartCloses(json) {
  const r = json?.chart?.result?.[0];
  if (!r) return null;
  const timestamps = r.timestamp;
  const closes = r.indicators?.quote?.[0]?.close;
  if (!Array.isArray(timestamps) || !Array.isArray(closes) || timestamps.length < 2) return null;
  const t = [];
  const c = [];
  let lastClose = null;
  for (let i = 0; i < timestamps.length; i++) {
    const raw = closes[i];
    const close = Number.isFinite(raw) ? raw : lastClose;
    if (!Number.isFinite(close)) continue;
    lastClose = close;
    t.push(timestamps[i]);
    c.push(close);
  }
  return t.length > 1 ? { t, c } : null;
}

/**
 * @param {string} symbol
 * @param {string} range e.g. 1d, 5d, 1y
 * @param {string} interval e.g. 5m, 1d
 * @returns {Promise<{ t: number[], c: number[] } | null>}
 */
export async function fetchYahooChartCandles(symbol, range, interval) {
  const urls = buildYahooChartUrls(symbol, range, interval);
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const json = await res.json();
      const parsed = parseYahooChartCloses(json);
      if (parsed) return parsed;
    } catch {
      /* try next */
    }
  }
  return null;
}

/**
 * @param {string} token Finnhub token
 * @param {string} symbol
 * @returns {Promise<{ high: number, low: number } | null>}
 */
export async function fetchFinnhub52WeekMetric(token, symbol) {
  const sym = sanitizeSymbol(symbol);
  if (!sym || !token) return null;
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/stock/metric?symbol=${encodeURIComponent(sym)}&metric=all&token=${encodeURIComponent(token)}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const m = data?.metric;
    const high = m?.['52WeekHigh'];
    const low = m?.['52WeekLow'];
    if (!Number.isFinite(high) || !Number.isFinite(low) || high <= 0 || low <= 0) return null;
    return { high, low };
  } catch {
    return null;
  }
}

/**
 * Vercel Serverless Function: GET /api/market/yahoo-chart.
 * Fetches Yahoo chart JSON server-side (no browser CORS) for production SPA.
 */

/** @param {import('http').IncomingMessage & { query?: Record<string, string> }} req */
function queryFromReq(req) {
  const q = req.query;
  if (q && typeof q === 'object' && Object.keys(q).length) return q;
  try {
    const raw = req.url || '';
    const search = raw.includes('?') ? raw.slice(raw.indexOf('?') + 1) : '';
    return Object.fromEntries(new URLSearchParams(search).entries());
  } catch {
    return {};
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }

  const query = queryFromReq(req);
  const symbol = String(query.symbol || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9.-]/g, '');
  const range =
    String(query.range || '1y')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 12) || '1y';
  const interval =
    String(query.interval || '1d')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 12) || '1d';

  if (!symbol) {
    res.status(400).json({ error: 'symbol required' });
    return;
  }

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${encodeURIComponent(range)}&interval=${encodeURIComponent(interval)}`;

  try {
    const upstream = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FINVEST/1.0)',
        Accept: 'application/json',
      },
    });
    if (!upstream.ok) {
      res.status(502).json({ error: 'upstream chart request failed' });
      return;
    }
    const json = await upstream.json();
    res.setHeader('Content-Type', 'application/json');
    res.status(200).send(JSON.stringify(json));
  } catch {
    res.status(500).json({ error: 'chart proxy failed' });
  }
}

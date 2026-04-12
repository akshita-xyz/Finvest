/**
 * Unified market data: Finnhub when configured, else Alpha Vantage (VITE_ALPHA_VANTAGE_API_KEY).
 * Keeps Dashboard code on a Finnhub-shaped quote object { c, d, dp, h, l }.
 */

import { avFinnhubStyleQuote, avNewsArticles, avSymbolSearch } from './alphaVantage';

/** @returns {string} */
export function getAlphaVantageKey() {
  return String(import.meta.env.VITE_ALPHA_VANTAGE_API_KEY || '').trim();
}

/**
 * Finnhub-style quote for one symbol (price c, change d, % dp, high h, low l).
 * @param {string} symbol
 * @param {string} finnhubKey
 * @param {string} alphaKey
 * @returns {Promise<{ c: number, d: number, dp: number, h: number, l: number } | null>}
 */
export async function fetchQuoteFinnhubStyle(symbol, finnhubKey, alphaKey) {
  const sym = String(symbol || '')
    .trim()
    .toUpperCase();
  if (!sym) return null;

  if (finnhubKey) {
    try {
      const res = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(sym)}&token=${encodeURIComponent(finnhubKey)}`
      );
      if (res.ok) {
        const q = await res.json();
        if (Number.isFinite(q.c) && q.c > 0) return q;
      }
    } catch {
      /* fall through */
    }
  }

  if (alphaKey) {
    const q = await avFinnhubStyleQuote(alphaKey, sym);
    if (q) return q;
  }

  return null;
}

/**
 * @param {string} query
 * @param {string} finnhubKey
 * @param {string} alphaKey
 * @returns {Promise<{ symbol: string, description: string }[]>}
 */
export async function searchSymbols(query, finnhubKey, alphaKey) {
  const q = String(query || '').trim();
  if (q.length < 1) return [];

  if (finnhubKey) {
    try {
      const res = await fetch(
        `https://finnhub.io/api/v1/search?q=${encodeURIComponent(q)}&token=${encodeURIComponent(finnhubKey)}`
      );
      if (res.ok) {
        const data = await res.json();
        const results = Array.isArray(data.result) ? data.result : [];
        return results
          .filter((item) => item.symbol && item.description)
          .slice(0, 8)
          .map((item) => ({ symbol: item.symbol, description: item.description }));
      }
    } catch {
      /* fall through */
    }
  }

  if (alphaKey) {
    const list = await avSymbolSearch(alphaKey, q);
    return list.slice(0, 8);
  }

  return [];
}

/** Finnhub general categories → Alpha Vantage NEWS_SENTIMENT topics */
const FINNHUB_CATEGORY_TO_AV_TOPIC = {
  general: 'financial_markets',
  forex: 'economy_monetary',
  crypto: 'blockchain',
  merger: 'mergers_and_acquisitions',
};

/**
 * @param {{ newsCategory: string, newsCompanySymbol: string, finnhubKey: string, alphaKey: string }}
 * @returns {Promise<{ id: string, headline: string, summary: string, source: string, url: string, datetime: number }[]>}
 */
export async function fetchDashboardNews({ newsCategory, newsCompanySymbol, finnhubKey, alphaKey }) {
  const sym = String(newsCompanySymbol || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9.-]/g, '');

  if (finnhubKey) {
    try {
      let url;
      if (sym) {
        const to = new Date();
        const from = new Date();
        from.setDate(from.getDate() - 7);
        const fmt = (d) => d.toISOString().slice(0, 10);
        url = `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(sym)}&from=${fmt(from)}&to=${fmt(to)}&token=${encodeURIComponent(finnhubKey)}`;
      } else {
        url = `https://finnhub.io/api/v1/news?category=${encodeURIComponent(newsCategory)}&token=${encodeURIComponent(finnhubKey)}`;
      }
      const response = await fetch(url);
      if (response.ok) {
        const articles = await response.json();
        if (Array.isArray(articles) && articles.length) {
          return articles.slice(0, 60).map((item) => ({
            id: String(item.id ?? `${item.datetime}-${item.headline}`),
            headline: item.headline,
            summary: item.summary,
            source: item.source,
            url: item.url,
            datetime: item.datetime,
          }));
        }
      }
    } catch {
      /* fall through */
    }
  }

  if (alphaKey) {
    const topic = sym ? null : FINNHUB_CATEGORY_TO_AV_TOPIC[newsCategory] || 'financial_markets';
    const list = await avNewsArticles(alphaKey, {
      tickers: sym || undefined,
      topics: topic || undefined,
      limit: 50,
    });
    if (list.length) return list;
  }

  return [];
}

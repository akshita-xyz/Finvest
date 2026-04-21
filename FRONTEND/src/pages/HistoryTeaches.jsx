import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts';
import { fetchYahooChartCandles } from '../lib/marketChartData';
import { apiUrl } from '../lib/appBaseUrl';
import '../styles/history-teaches.css';

const INDEX_SERIES = [
  { key: 'nasdaq', name: 'NASDAQ', symbol: 'QQQ', color: '#2563eb', note: 'Proxy via QQQ ETF' },
  { key: 'sp500', name: 'S&P 500', symbol: 'SPY', color: '#0ea5e9', note: 'Proxy via SPY ETF' },
  { key: 'nifty50', name: 'NIFTY 50', symbol: 'NIFTYBEES.NS', color: '#16a34a', note: 'Proxy via NIFTYBEES.NS' },
];

const ROADMAP_EVENTS = [
  { id: 'gfc', title: 'Global Financial Crisis', date: '2008-09-15' },
  { id: 'flash', title: 'Flash Crash', date: '2010-05-06' },
  { id: 'debt', title: 'US Debt Downgrade Shock', date: '2011-08-08' },
  { id: 'china', title: 'China Devaluation Volatility', date: '2015-08-24' },
  { id: 'brexit', title: 'Brexit Referendum', date: '2016-06-24' },
  { id: 'covid', title: 'COVID Crash', date: '2020-03-16' },
  { id: 'war', title: 'Russia-Ukraine War Shock', date: '2022-02-24' },
  { id: 'banks', title: 'US Regional Banking Stress', date: '2023-03-13' },
];

function toChartPoints(rawCandles = { t: [], c: [] }) {
  const t = Array.isArray(rawCandles.t) ? rawCandles.t : [];
  const c = Array.isArray(rawCandles.c) ? rawCandles.c : [];
  return t.map((ts, i) => ({
    ts,
    tsMs: ts * 1000,
    close: c[i],
    date: new Date(ts * 1000).toLocaleDateString(undefined, { year: 'numeric', month: 'short' }),
  }));
}

function computeMetrics(points) {
  if (!points.length) return null;
  const first = points[0].close;
  const last = points[points.length - 1].close;
  if (!Number.isFinite(first) || !Number.isFinite(last) || first <= 0) return null;
  const returns = [];
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1].close;
    const curr = points[i].close;
    if (Number.isFinite(prev) && prev > 0 && Number.isFinite(curr)) {
      returns.push((curr - prev) / prev);
    }
  }
  const mean = returns.length ? returns.reduce((s, r) => s + r, 0) / returns.length : 0;
  const variance = returns.length
    ? returns.reduce((s, r) => s + (r - mean) * (r - mean), 0) / returns.length
    : 0;
  const volatilityPct = Math.sqrt(Math.max(variance, 0)) * Math.sqrt(252) * 100;

  let peak = points[0].close;
  let maxDrawdown = 0;
  for (const p of points) {
    if (p.close > peak) peak = p.close;
    const dd = peak > 0 ? ((peak - p.close) / peak) * 100 : 0;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }

  return {
    periodReturnPct: ((last - first) / first) * 100,
    volatilityPct,
    maxDrawdownPct: maxDrawdown,
    last,
  };
}

function nearestCloseOnOrAfter(points, isoDate) {
  if (!Array.isArray(points) || !points.length) return null;
  const target = new Date(`${isoDate}T00:00:00Z`).getTime() / 1000;
  for (const p of points) {
    if (!Number.isFinite(p.ts) || !Number.isFinite(p.close)) continue;
    if (p.ts >= target) {
      return p;
    }
  }
  return null;
}

function pctChange(from, to) {
  if (!Number.isFinite(from) || !Number.isFinite(to) || from <= 0) return null;
  return ((to - from) / from) * 100;
}

function formatDateFromTs(ts) {
  if (!Number.isFinite(ts)) return '--';
  return new Date(ts * 1000).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function findMinWithinWindow(points, startTs, windowDays) {
  if (!Array.isArray(points) || !points.length || !Number.isFinite(startTs)) return null;
  const endTs = startTs + windowDays * 86400;
  let minPoint = null;
  for (const p of points) {
    if (!Number.isFinite(p.ts) || !Number.isFinite(p.close)) continue;
    if (p.ts < startTs || p.ts > endTs) continue;
    if (!minPoint || p.close < minPoint.close) minPoint = p;
  }
  return minPoint;
}

function asPct(value) {
  return Number.isFinite(value) ? `${value.toFixed(2)}%` : '--';
}

function formatPriceAxis(value) {
  if (!Number.isFinite(Number(value))) return '--';
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatTimeAxis(value) {
  if (!Number.isFinite(Number(value))) return '';
  return new Date(Number(value)).toLocaleDateString(undefined, { year: 'numeric' });
}

function HistoryTeaches() {
  const [seriesData, setSeriesData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [aiInsights, setAiInsights] = useState({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const results = await Promise.all(
          INDEX_SERIES.map(async (idx) => {
            const candles = await fetchYahooChartCandles(idx.symbol, 'max', '1wk');
            return [idx.key, candles ? toChartPoints(candles) : []];
          })
        );
        if (!cancelled) setSeriesData(Object.fromEntries(results));
      } catch {
        if (!cancelled) setError('Unable to load one or more Yahoo charts right now.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const comparative = useMemo(() => {
    return INDEX_SERIES.map((idx) => {
      const points = seriesData[idx.key] || [];
      const metrics = computeMetrics(points);
      const covidBuy = nearestCloseOnOrAfter(points, '2020-03-23');
      const covidSell = nearestCloseOnOrAfter(points, '2020-06-15');
      const warBuy = nearestCloseOnOrAfter(points, '2022-02-24');
      const warSell = points.length ? points[points.length - 1] : null;
      const stableBuy = nearestCloseOnOrAfter(points, '2018-01-02');
      const crashSell = findMinWithinWindow(points, stableBuy?.ts ?? NaN, 900);
      const stableToCrashPct = pctChange(stableBuy?.close, crashSell?.close);
      const principal = 10000;
      const stableToCrashValue = Number.isFinite(stableToCrashPct)
        ? principal * (1 + stableToCrashPct / 100)
        : null;
      const stableToCrashLoss = Number.isFinite(stableToCrashValue)
        ? Math.max(0, principal - stableToCrashValue)
        : null;
      const elapsedYears =
        Number.isFinite(stableBuy?.ts) && Number.isFinite(crashSell?.ts)
          ? (crashSell.ts - stableBuy.ts) / (365 * 86400)
          : null;
      return {
        ...idx,
        points,
        metrics,
        events: {
          covid: {
            buyDateLabel: 'Mar 23, 2020',
            sellDateLabel: 'Jun 15, 2020',
            buyPrice: covidBuy?.close ?? null,
            sellPrice: covidSell?.close ?? null,
            pct: pctChange(covidBuy?.close, covidSell?.close),
          },
          war: {
            buyDateLabel: 'Feb 24, 2022',
            sellDateLabel: 'Latest',
            buyPrice: warBuy?.close ?? null,
            sellPrice: warSell?.close ?? null,
            pct: pctChange(warBuy?.close, warSell?.close),
          },
          stableToCrash: {
            buyDateLabel: formatDateFromTs(stableBuy?.ts),
            sellDateLabel: formatDateFromTs(crashSell?.ts),
            pct: stableToCrashPct,
            lossAmount: stableToCrashLoss,
            valueAfterSell: stableToCrashValue,
            years: elapsedYears,
          },
        },
      };
    });
  }, [seriesData]);

  const eventRoadmap = useMemo(() => {
    return ROADMAP_EVENTS.map((event, index) => {
      const next = ROADMAP_EVENTS[index + 1];
      const perIndex = comparative.map((series) => {
        const start = nearestCloseOnOrAfter(series.points, event.date);
        const end = next
          ? nearestCloseOnOrAfter(series.points, next.date)
          : series.points?.[series.points.length - 1] || null;
        return {
          key: series.key,
          name: series.name,
          pct: pctChange(start?.close, end?.close),
        };
      });
      return {
        ...event,
        periodLabel: next ? `${event.date} -> ${next.date}` : `${event.date} -> now`,
        perIndex,
      };
    });
  }, [comparative]);

  useEffect(() => {
    const CHAT_URL = apiUrl('/api/chat');
    let cancelled = false;
    (async () => {
      const next = {};
      for (const series of comparative) {
        if (!series?.name || !series?.metrics) continue;
        const prompt = `Give a short 2-line historical market takeaway for ${series.name}. Data: 1Y return ${asPct(
          series.metrics.periodReturnPct
        )}, volatility ${asPct(series.metrics.volatilityPct)}, max drawdown ${asPct(
          series.metrics.maxDrawdownPct
        )}. Include one caution and one practical action.`;
        try {
          const res = await fetch(CHAT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: prompt,
              userType: 'guest',
              access_token: '',
              history: [],
            }),
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok && typeof data?.reply === 'string' && data.reply.trim()) {
            next[series.key] = data.reply.trim();
          }
        } catch {
          /* keep silent */
        }
      }
      if (!cancelled && Object.keys(next).length) setAiInsights(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [comparative]);

  return (
    <div className="history-shell">
      <header className="history-hero">
        <p className="history-eyebrow">Dashboard Learning Room</p>
        <h1>History Teaches</h1>
        <p className="history-subtitle">
          Track major market benchmarks in one place and compare performance, volatility, and drawdown
          before making decisions.
        </p>
        <Link to="/dashboard" className="history-back-link">
          Back to Dashboard
        </Link>
      </header>

      {loading && <p className="history-state">Loading Yahoo charts...</p>}
      {!loading && error && <p className="history-state history-state--error">{error}</p>}

      <main className="history-grid">
        {comparative.map((series) => {
          const hasGain = (series.metrics?.periodReturnPct || 0) >= 0;
          return (
            <article key={series.key} className="history-card history-card--chart">
              <div className="history-card-head">
                <div>
                  <h2>{series.name}</h2>
                  <p>{series.note}</p>
                </div>
                <div className={`history-trend ${hasGain ? 'up' : 'down'}`}>
                  {hasGain ? <ArrowUpRight size={16} aria-hidden /> : <ArrowDownRight size={16} aria-hidden />}
                  <span>{Number.isFinite(series.metrics?.periodReturnPct) ? `${series.metrics.periodReturnPct.toFixed(2)}%` : '--'}</span>
                </div>
              </div>
              <div className="history-chart-wrap">
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={series.points}>
                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="tsMs"
                      type="number"
                      scale="time"
                      domain={['dataMin', 'dataMax']}
                      tick={{ fontSize: 11 }}
                      tickFormatter={formatTimeAxis}
                      tickCount={10}
                      interval="preserveStartEnd"
                      minTickGap={20}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={formatPriceAxis}
                      domain={['dataMin', 'dataMax']}
                      width={80}
                      allowDecimals
                    />
                    <Tooltip
                      labelFormatter={(value) =>
                        Number.isFinite(Number(value))
                          ? new Date(Number(value)).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                            })
                          : ''
                      }
                      formatter={(value) => formatPriceAxis(Number(value))}
                    />
                    <Line type="monotone" dataKey="close" stroke={series.color} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="history-event-compare">
                <h3>{series.name} roadmap (2008 {'->'} now)</h3>
                <div className="history-mini-roadmap">
                  {eventRoadmap.map((event) => {
                    const item = event.perIndex.find((p) => p.key === series.key);
                    return (
                      <div key={`${series.key}-${event.id}`} className="history-mini-roadmap-item">
                        <span>{event.title}</span>
                        <strong className={Number(item?.pct) >= 0 ? 'up' : 'down'}>{asPct(item?.pct)}</strong>
                      </div>
                    );
                  })}
                </div>
              </div>
            </article>
          );
        })}
        <article className="history-card history-card--analysis">
          <h2>Comparative analysis (1Y)</h2>
          <div className="history-analysis-grid">
            {comparative.map((series) => (
              <div key={`${series.key}-stats`} className="history-analysis-item">
                <h3>{series.name}</h3>
                <p>Return: {Number.isFinite(series.metrics?.periodReturnPct) ? `${series.metrics.periodReturnPct.toFixed(2)}%` : '--'}</p>
                <p>Volatility (annualized): {Number.isFinite(series.metrics?.volatilityPct) ? `${series.metrics.volatilityPct.toFixed(2)}%` : '--'}</p>
                <p>Max drawdown: {Number.isFinite(series.metrics?.maxDrawdownPct) ? `${series.metrics.maxDrawdownPct.toFixed(2)}%` : '--'}</p>
              </div>
            ))}
          </div>
        </article>
      </main>
    </div>
  );
}

export default HistoryTeaches;

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  createChart,
  ColorType,
  CandlestickSeries,
  HistogramSeries,
  CrosshairMode,
} from 'lightweight-charts';
import { RISK_CHART_TIMEFRAMES, fetchYahooChartOHLCV } from '../lib/marketChartData';

function formatPrice(n, currency = 'USD') {
  if (!Number.isFinite(n)) return '';
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency', currency: currency.length === 3 ? currency : 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2, }).format(n);
  } catch {
    return n.toFixed(2);
  }
}

export default function RiskCandlestickChart({ symbol, finnhubToken = '' }) {
  const wrapRef = useRef(null);
  const chartRef = useRef(null);
  const candleRef = useRef(null);
  const volRef = useRef(null);
  const currencyRef = useRef('USD');
  const lastOhlcRef = useRef({ o: null, h: null, l: null, c: null });

  const [tfId, setTfId] = useState('1Y');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ohlc, setOhlc] = useState({ o: null, h: null, l: null, c: null });
  const [title, setTitle] = useState('');

  const tf = RISK_CHART_TIMEFRAMES.find((t) => t.id === tfId) || RISK_CHART_TIMEFRAMES[6];

  const applyData = useCallback((candleData, volumeData, meta) => {
    const candleSeries = candleRef.current;
    const volSeries = volRef.current;
    if (!candleSeries || !volSeries) return;

    const cur = meta?.currency || 'USD';
    currencyRef.current = cur;
    candleSeries.applyOptions({
      priceFormat: { type: 'price', precision: 2, minMove: 0.01 }, });

    candleSeries.setData(candleData);
    volSeries.setData(volumeData);
    chartRef.current?.applyOptions({
      localization: {
        priceFormatter: (p) => formatPrice(p, cur), }, });
    chartRef.current?.timeScale().fitContent();

    const last = candleData[candleData.length - 1];
    if (last) {
      const next = { o: last.open, h: last.high, l: last.low, c: last.close };
      lastOhlcRef.current = next;
      setOhlc(next);
    }
    setTitle(meta?.shortName || symbol || '');
  }, [symbol]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;

    const chart = createChart(el, {
      layout: {
        background: { type: ColorType.Solid, color: '#ffffff' }, textColor: '#0f172a', fontSize: 12, }, grid: {
        vertLines: { color: '#e2e8f0', style: 1 }, horzLines: { color: '#e2e8f0', style: 1 }, }, crosshair: {
        mode: CrosshairMode.MagnetOHLC, vertLine: { color: '#94a3b8', width: 1, style: 2, labelBackgroundColor: '#334155' }, horzLine: { color: '#94a3b8', width: 1, style: 2, labelBackgroundColor: '#334155' }, }, rightPriceScale: {
        borderColor: '#cbd5e1', scaleMargins: { top: 0.08, bottom: 0.22 }, }, timeScale: {
        borderColor: '#cbd5e1', timeVisible: true, secondsVisible: false, rightOffset: 4, }, localization: {
        priceFormatter: (p) => formatPrice(p, currencyRef.current), }, width: el.clientWidth, height: 440, });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#16a34a', downColor: '#dc2626', borderVisible: true, wickVisible: true, borderUpColor: '#15803d', borderDownColor: '#b91c1c', wickUpColor: '#15803d', wickDownColor: '#b91c1c', });

    const volSeries = chart.addSeries(HistogramSeries, {
      priceScaleId: 'vol', priceFormat: { type: 'volume' }, });

    chart.priceScale('vol').applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 }, borderVisible: false, });

    chartRef.current = chart;
    candleRef.current = candleSeries;
    volRef.current = volSeries;

    chart.subscribeCrosshairMove((param) => {
      const s = candleRef.current;
      if (!param || param.time === undefined || !param.seriesData || param.seriesData.size === 0) {
        const L = lastOhlcRef.current;
        if (L && L.c != null) setOhlc(L);
        return;
      }
      const row = param.seriesData.get(s);
      if (!row || row.open == null) {
        const L = lastOhlcRef.current;
        if (L && L.c != null) setOhlc(L);
        return;
      }
      setOhlc({
        o: row.open, h: row.high, l: row.low, c: row.close, });
    });

    const ro = new ResizeObserver(() => {
      if (!wrapRef.current || !chartRef.current) return;
      chart.applyOptions({ width: wrapRef.current.clientWidth });
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      candleRef.current = null;
      volRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!symbol || !candleRef.current) return undefined;

    let cancelled = false;
    const cfg = RISK_CHART_TIMEFRAMES.find((t) => t.id === tfId) || RISK_CHART_TIMEFRAMES[6];
    const finnhubKey = String(
      import.meta.env.VITE_FINNHUB_API_KEY || import.meta.env.FINNHUB_API_KEY || finnhubToken || ''
    ).trim();

    (async () => {
      setLoading(true);
      setError('');
      try {
        const data = await fetchYahooChartOHLCV(symbol, cfg.range, cfg.interval, finnhubKey);
        if (cancelled) return;
        if (!data) {
          setError(
            'Could not load chart data. On Vercel, the app uses /api/market/yahoo-chart , redeploy after pulling the latest commit. Locally: npm run dev (/__yahoo). Optional: VITE_BACKEND_URL to an API with the same route, or Finnhub candle access + VITE_FINNHUB_API_KEY / FINNHUB_API_KEY.'
          );
          candleRef.current?.setData([]);
          volRef.current?.setData([]);
          setOhlc({ o: null, h: null, l: null, c: null });
          return;
        }
        applyData(data.candleData, data.volumeData, data.meta);
      } catch {
        if (!cancelled) setError('Chart request failed.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [symbol, tfId, applyData, finnhubToken]);

  const cur = currencyRef.current;

  return (
    <div className="db-risk-lwc">
      <div className="db-risk-lwc-toolbar">
        <div className="db-risk-lwc-title">
          <span className="db-risk-lwc-symbol">{symbol}</span>
          {title && title !== symbol && <span className="db-risk-lwc-name">{title}</span>}
          <span className="db-risk-lwc-interval">{tf.interval}</span>
        </div>
        <div className="db-risk-lwc-ohlc" aria-live="polite">
          <span>
            O <strong>{formatPrice(ohlc.o, cur)}</strong>
          </span>
          <span>
            H <strong className="up">{formatPrice(ohlc.h, cur)}</strong>
          </span>
          <span>
            L <strong className="down">{formatPrice(ohlc.l, cur)}</strong>
          </span>
          <span>
            C <strong>{formatPrice(ohlc.c, cur)}</strong>
          </span>
        </div>
      </div>

      <div className="db-risk-tf-row" role="tablist" aria-label="Chart time range">
        {RISK_CHART_TIMEFRAMES.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tfId === t.id}
            className={`db-risk-tf-btn${tfId === t.id ? ' is-active' : ''}`}
            onClick={() => setTfId(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && <p className="db-risk-lwc-loading">Loading chart…</p>}
      {error && <p className="db-risk-lwc-error">{error}</p>}

      <div ref={wrapRef} className="db-risk-lwc-chart" />
      <p className="db-risk-lwc-foot">
        Candlesticks + volume (TradingView Lightweight Charts™). Market data via Yahoo chart JSON (same proxy as the risk
        simulator). Educational only.
      </p>
    </div>
  );
}

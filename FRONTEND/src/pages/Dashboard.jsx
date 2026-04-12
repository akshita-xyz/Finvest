import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  classificationFromFearScore, fetchUserProfile, mergeDashboardPrefs, updateUserProfileFields, } from '../services/userProfileService';
import { getPersonalizedPortfolioResumePath } from '../lib/personalizedPortfolioRoadmap';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, Shield, TrendingUp, MessageSquare, Menu, X, Target, Zap, Sparkles, Newspaper, ExternalLink, Search, ClipboardList, Lock, Brain, ChevronRight, RotateCcw, } from 'lucide-react';
import { ResponsiveContainer, PieChart as ChartPie, Pie, Cell, Tooltip } from 'recharts';
import '../styles/dashboard.css';
import { fetchFinnhub52WeekMetric, fetchYahooChartCandles } from '../lib/marketChartData';
import {
  fetchQuoteFinnhubStyle,
  fetchDashboardNews,
  getAlphaVantageKey,
  searchSymbols,
} from '../lib/marketDataHub';
import RiskCandlestickChart from '../components/RiskCandlestickChart';
import { EMOTION_QUESTIONS, evaluateEmotionMindset } from '../lib/emotionInvestingMindset';
import { CertificateModal, FinvestCertificate } from '../components/FinvestCertificate';

const MotionDiv = motion.div;

const NEWS_PREVIEW_COUNT = 4;

const SIDEBAR_NAV_IDS = ['risk-sandbox', 'live-stocks', 'news-feed', 'emotion-testing', 'portfolio-insights'];

const EMOTION_STORAGE_KEY = 'finvest_emotion_mindset_v1';

function readNavSectionFromHash() {
  if (typeof window === 'undefined') return 'risk-sandbox';
  const h = (window.location.hash || '').replace(/^#/, '');
  if (SIDEBAR_NAV_IDS.includes(h)) return h;
  if (h === 'live-markets-news') return 'live-stocks';
  return 'risk-sandbox';
}

/** In dev, Vite proxies `/chat` and `/api` to BACKEND (see vite.config.js) so the AI works without VITE_BACKEND_URL. */
const CHAT_BACKEND = import.meta.env.DEV
  ? ''
  : (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');

function displayNameForAi(user) {
  if (!user) return '';
  const meta = user.user_metadata || {};
  return (meta.full_name || meta.name || user.email?.split('@')[0] || '').trim();
}

function buildPortfolioAiGreeting(user, profileRow, fearScore) {
  const name = displayNameForAi(user) || 'there';
  const classification =
    (profileRow?.classification && String(profileRow.classification)) ||
    classificationFromFearScore(fearScore);
  const assessment = profileRow?.dashboard_prefs?.assessment;
  const cluster = assessment?.clusterLabel ? ` Your latest personality quiz cluster: ${assessment.clusterLabel}.` : '';
  const alloc = assessment?.allocation;
  const allocHint =
    alloc && typeof alloc === 'object'
      ? (() => {
          const parts = ['stocks', 'bonds', 'cash']
            .filter((k) => Number.isFinite(Number(alloc[k])))
            .map((k) => `${k} ~${alloc[k]}%`);
          const label = alloc.label ? ` (${String(alloc.label)})` : '';
          return parts.length
            ? ` Suggested mix from your personalized portfolio: ${parts.join(', ')}${label}.`
            : '';
        })()
      : '';
  return `Hi${name === 'there' ? '' : ` ${name}`}, how can I help you? You show up as a ${classification} investor based on your behavioral signals and saved profile.${cluster}${allocHint} Ask me anything about investing or your dashboard.`;
}

function Dashboard() {
  const { user, session } = useAuth();
  const location = useLocation();
  const FINNHUB_API_KEY = String(
    import.meta.env.VITE_FINNHUB_API_KEY || import.meta.env.FINNHUB_API_KEY || ''
  ).trim();
  const ALPHA_VANTAGE_KEY = getAlphaVantageKey();
  const HAS_MARKET_CREDENTIALS = Boolean(FINNHUB_API_KEY || ALPHA_VANTAGE_KEY);
  const TRACKED_SYMBOLS = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'GOOGL'];

  const [fearScore, setFearScore] = useState(50);
  const [profileReady, setProfileReady] = useState(false);
  const [profileSyncNote, setProfileSyncNote] = useState('');
  const skipProfileSaveRef = useRef(true);
  const chatGreetingReadyRef = useRef(false);
  const [profileRow, setProfileRow] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeNavSection, setActiveNavSection] = useState(readNavSectionFromHash);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState(/** @type {{ role: string; text: string }[]} */ ([]));
  const [chatSending, setChatSending] = useState(false);
  const [inputText, setInputText] = useState('');
  const [liveStocks, setLiveStocks] = useState([]);
  const [liveNews, setLiveNews] = useState([]);
  const [marketLoading, setMarketLoading] = useState(true);
  const [newsLoading, setNewsLoading] = useState(true);
  const [marketError, setMarketError] = useState('');
  const [newsError, setNewsError] = useState('');
  const [selectedStock, setSelectedStock] = useState('AAPL');
  const [stockInput, setStockInput] = useState('AAPL');
  const [riskLoading, setRiskLoading] = useState(false);
  const [riskError, setRiskError] = useState('');
  const [riskResult, setRiskResult] = useState(null);
  const [stockSuggestions, setStockSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [newsCategory, setNewsCategory] = useState('general');
  const [newsCompanySymbol, setNewsCompanySymbol] = useState('');
  const [newsHeadlineFilter, setNewsHeadlineFilter] = useState('');
  const [newsRegion, setNewsRegion] = useState('all');
  const [newsLastUpdated, setNewsLastUpdated] = useState(null);
  const [newsModalOpen, setNewsModalOpen] = useState(false);
  /** Emotion & mindset check-in before investing (personality-style, on-dashboard). */
  const [emotionPhase, setEmotionPhase] = useState('intro');
  const [emotionQIndex, setEmotionQIndex] = useState(0);
  const [emotionAnswers, setEmotionAnswers] = useState({});
  const [emotionResult, setEmotionResult] = useState(null);
  const [lastEmotionSnapshot, setLastEmotionSnapshot] = useState(null);
  const [emotionCertModalOpen, setEmotionCertModalOpen] = useState(false);
  const [emotionCertIssuedAt, setEmotionCertIssuedAt] = useState('');
  /** Timed personality / “fear” quiz in Personalized Portfolio , unlocks Behavior & Portfolio Overview. */
  const [fearQuizComplete, setFearQuizComplete] = useState(true);

  /** Guests always see charts; signed-in users only after profile load confirms quiz completion (avoids unlock flash). */
  const behaviorOverviewUnlocked = !user?.id || (profileReady && fearQuizComplete);
  const ppNavActive = location.pathname.startsWith('/personalized-portfolio');
  const goalsNavActive = location.pathname.startsWith('/financial-goals');

  useEffect(() => {
    const onHash = () => setActiveNavSection(readNavSectionFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    chatGreetingReadyRef.current = false;
  }, [user?.id]);

  useEffect(() => {
    if (!profileReady || chatGreetingReadyRef.current) return;
    chatGreetingReadyRef.current = true;
    setChatMessages([{ role: 'ai', text: buildPortfolioAiGreeting(user, profileRow, fearScore) }]);
  }, [profileReady, user, profileRow, fearScore]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(EMOTION_STORAGE_KEY);
      if (raw) setLastEmotionSnapshot(JSON.parse(raw));
    } catch {
      setLastEmotionSnapshot(null);
    }
  }, []);

  // Load fear score + prefs from Supabase per user; fall back to localStorage when no row / guest.
  useEffect(() => {
    if (!user?.id) {
      setProfileRow(null);
      setFearQuizComplete(true);
      const score = localStorage.getItem('fearScore');
      if (score) {
        const parsedScore = parseInt(score, 10);
        if (!isNaN(parsedScore)) setFearScore(parsedScore);
      }
      setProfileReady(true);
      queueMicrotask(() => {
        skipProfileSaveRef.current = false;
      });
      return;
    }

    let cancelled = false;
    setProfileReady(false);
    skipProfileSaveRef.current = true;

    (async () => {
      const { data, error } = await fetchUserProfile(user.id);
      if (cancelled) return;
      setProfileRow(data && !error ? data : null);
      if (error) {
        setFearQuizComplete(true);
        setProfileSyncNote(
          error.message?.includes('user_profiles') || error.code === '42P01'
            ? 'Create the user_profiles table: run Finvest/supabase/sql/001_user_profiles.sql in the Supabase SQL Editor.'
            : error.message || 'Could not load your saved profile.'
        );
        setProfileReady(true);
        queueMicrotask(() => {
          skipProfileSaveRef.current = false;
        });
        return;
      }
      setFearQuizComplete(Boolean(data?.dashboard_prefs?.assessment?.completedAt));
      const quizFear = data?.dashboard_prefs?.assessment?.traits?.fearScore;
      if (data?.fear_score != null && Number.isFinite(Number(data.fear_score))) {
        const n = Math.min(100, Math.max(0, Number(data.fear_score)));
        setFearScore(n);
        localStorage.setItem('fearScore', String(n));
      } else if (Number.isFinite(Number(quizFear))) {
        const n = Math.min(100, Math.max(0, Math.round(Number(quizFear))));
        setFearScore(n);
        localStorage.setItem('fearScore', String(n));
      } else {
        const score = localStorage.getItem('fearScore');
        if (score) {
          const parsedScore = parseInt(score, 10);
          if (!isNaN(parsedScore)) setFearScore(parsedScore);
        }
      }
      setProfileReady(true);
      queueMicrotask(() => {
        skipProfileSaveRef.current = false;
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return undefined;
    const refreshQuiz = () => {
      fetchUserProfile(user.id).then(({ data }) => {
        if (data) {
          setProfileRow(data);
          setFearQuizComplete(Boolean(data.dashboard_prefs?.assessment?.completedAt));
        }
      });
    };
    window.addEventListener('focus', refreshQuiz);
    return () => window.removeEventListener('focus', refreshQuiz);
  }, [user?.id]);

  // Persist fear score + derived classification for custom per-user dashboard state.
  useEffect(() => {
    if (!profileReady || !user?.id || skipProfileSaveRef.current) return;
    const handle = setTimeout(() => {
      updateUserProfileFields(user.id, {
        fear_score: fearScore, classification: classificationFromFearScore(fearScore), }).then(({ error }) => {
        if (error) {
          setProfileSyncNote(error.message || 'Could not save profile to Supabase.');
        } else {
          setProfileSyncNote('');
          localStorage.setItem('fearScore', String(fearScore));
        }
      });
    }, 750);
    return () => clearTimeout(handle);
  }, [fearScore, profileReady, user?.id]);

  useEffect(() => {
    const runRiskSimulation = async () => {
      setRiskLoading(true);
      setRiskError('');
      try {
        const quote = await fetchQuoteFinnhubStyle(selectedStock, FINNHUB_API_KEY, ALPHA_VANTAGE_KEY);
        if (!quote || !Number.isFinite(quote.c) || quote.c <= 0) throw new Error('INVALID_QUOTE');

        const initialInvestment = 10000;
        const livePercentChange = Number.isFinite(quote.dp) ? quote.dp : 0;
        const liveAbsoluteChange = Number.isFinite(quote.d) ? quote.d : 0;
        const liveRupeeImpact = (initialInvestment * livePercentChange) / 100;
        const currentValue = initialInvestment + liveRupeeImpact;
        const profitLoss = currentValue - initialInvestment;
        const profitLossPercent = (profitLoss / initialInvestment) * 100;

        const metric52w = await fetchFinnhub52WeekMetric(FINNHUB_API_KEY, selectedStock);

        const to = Math.floor(Date.now() / 1000);
        const from = to - (24 * 60 * 60);
        const candleResponse = await fetch(
          `https://finnhub.io/api/v1/stock/candle?symbol=${selectedStock}&resolution=5&from=${from}&to=${to}&token=${FINNHUB_API_KEY}`
        );
        const candleData = candleResponse.ok ? await candleResponse.json() : null;
        const finnhubIntraOk =
          candleData && candleData.s === 'ok' && Array.isArray(candleData.c) && candleData.c.length > 1;

        const yahooIntra = finnhubIntraOk ? null : await fetchYahooChartCandles(selectedStock, '1d', '5m');

        let yearlyHighPrice = null;
        let yearlyLowPrice = null;
        let yearlyHighValue = null;
        let yearlyLowValue = null;
        let stopLossPrice = null;
        let stopLossPositionValue = null;
        let riskRewardRatio = null;
        let riskRewardNote = '';

        if (metric52w) {
          yearlyHighPrice = metric52w.high;
          yearlyLowPrice = metric52w.low;
        } else {
          const yahooYear = await fetchYahooChartCandles(selectedStock, '1y', '1d');
          if (yahooYear && yahooYear.c.length > 1) {
            yearlyHighPrice = Math.max(...yahooYear.c);
            yearlyLowPrice = Math.min(...yahooYear.c);
          }
        }

        const entry = quote.c;
        const sharesAtEntry = initialInvestment / entry;
        if (Number.isFinite(yearlyHighPrice) && Number.isFinite(yearlyLowPrice)) {
          yearlyHighValue = sharesAtEntry * yearlyHighPrice;
          yearlyLowValue = sharesAtEntry * yearlyLowPrice;
          const belowYearLow = yearlyLowPrice * 0.99;
          const structuralStop = belowYearLow < entry ? belowYearLow : entry * 0.95;
          stopLossPrice = structuralStop;
          stopLossPositionValue = sharesAtEntry * stopLossPrice;
          const riskPerShare = entry - stopLossPrice;
          const rewardToHigh = yearlyHighPrice - entry;
          if (riskPerShare > 0 && rewardToHigh > 0) {
            riskRewardRatio = rewardToHigh / riskPerShare;
            riskRewardNote = 'Upside to 52-week high vs. risk to suggested stop (illustrative).';
          } else if (riskPerShare > 0 && rewardToHigh <= 0) {
            riskRewardNote = 'Price is at or above the 52-week high; R:R to that level is not defined.';
          } else {
            riskRewardNote = 'Could not derive a consistent stop vs. entry; treat R:R as N/A.';
          }
        }

        let worstValue = initialInvestment;
        let peakValue = initialInvestment;
        let maxDrawdownPercent = 0;

        if (finnhubIntraOk) {
          const firstPrice = candleData.c[0];
          const shares = initialInvestment / firstPrice;
          for (let index = 0; index < candleData.c.length; index++) {
            const price = candleData.c[index];
            const value = shares * price;
            if (value > peakValue) peakValue = value;
            if (value < worstValue) worstValue = value;
            const drawdown = ((peakValue - value) / peakValue) * 100;
            if (drawdown > maxDrawdownPercent) maxDrawdownPercent = drawdown;
          }
        } else if (yahooIntra && yahooIntra.c.length > 1) {
          const firstPrice = yahooIntra.c[0];
          const shares = initialInvestment / firstPrice;
          for (let index = 0; index < yahooIntra.c.length; index++) {
            const price = yahooIntra.c[index];
            const value = shares * price;
            if (value > peakValue) peakValue = value;
            if (value < worstValue) worstValue = value;
            const drawdown = ((peakValue - value) / peakValue) * 100;
            if (drawdown > maxDrawdownPercent) maxDrawdownPercent = drawdown;
          }
        } else {
          const fallbackLowPercent = Number.isFinite(quote.l) && quote.c > 0 ? ((quote.l - quote.c) / quote.c) * 100 : livePercentChange;
          const worstPercent = Math.min(livePercentChange, fallbackLowPercent);
          worstValue = initialInvestment + (initialInvestment * worstPercent) / 100;
          maxDrawdownPercent = Math.abs(worstPercent);
        }

        setRiskResult({
          symbol: selectedStock, initialInvestment, currentValue, profitLoss, profitLossPercent, worstValue, worstLoss: Math.max(0, initialInvestment - worstValue), maxDrawdownPercent, livePercentChange, liveAbsoluteChange, liveRupeeImpact, yearlyHighPrice, yearlyLowPrice, yearlyHighValue, yearlyLowValue, stopLossPrice, stopLossPositionValue, riskRewardRatio, riskRewardNote, });
      } catch {
        const fallbackQuote = liveStocks.find((item) => item.symbol === selectedStock);
        if (fallbackQuote && Number.isFinite(fallbackQuote.price) && fallbackQuote.price > 0) {
          const initialInvestment = 10000;
          const livePercentChange = Number.isFinite(fallbackQuote.percentChange) ? fallbackQuote.percentChange : 0;
          const liveRupeeImpact = (initialInvestment * livePercentChange) / 100;
          const currentValue = initialInvestment + liveRupeeImpact;
          const estWorstValue = initialInvestment + (initialInvestment * Math.min(livePercentChange, -Math.abs(livePercentChange))) / 100;
          setRiskResult({
            symbol: selectedStock, initialInvestment, currentValue, profitLoss: liveRupeeImpact, profitLossPercent: livePercentChange, worstValue: estWorstValue, worstLoss: Math.max(0, initialInvestment - estWorstValue), maxDrawdownPercent: ((initialInvestment - estWorstValue) / initialInvestment) * 100, livePercentChange, liveAbsoluteChange: fallbackQuote.change || 0, liveRupeeImpact, yearlyHighPrice: null, yearlyLowPrice: null, yearlyHighValue: null, yearlyLowValue: null, stopLossPrice: null, stopLossPositionValue: null, riskRewardRatio: null, riskRewardNote: '', });
          setRiskError('');
        } else {
          setRiskResult(null);
          setRiskError('Unable to fetch stock history right now (rate limit). Try again in a few seconds.');
        }
      } finally {
        setRiskLoading(false);
      }
    };

    runRiskSimulation();
  }, [selectedStock, liveStocks]);

  useEffect(() => {
    const query = stockInput.trim();
    if (query.length < 1) {
      setStockSuggestions([]);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        const results = await searchSymbols(query, FINNHUB_API_KEY, ALPHA_VANTAGE_KEY);
        setStockSuggestions(results);
      } catch {
        setStockSuggestions([]);
      }
    }, 220);

    return () => clearTimeout(timeout);
  }, [stockInput]);

  useEffect(() => {
    document.body.classList.add('dashboard-mode');
    return () => document.body.classList.remove('dashboard-mode');
  }, []);

  useEffect(() => {
    const fetchStocks = async () => {
      setMarketLoading(true);
      setMarketError('');
      if (!HAS_MARKET_CREDENTIALS) {
        setMarketError(
          'Add VITE_FINNHUB_API_KEY or VITE_ALPHA_VANTAGE_API_KEY in FRONTEND/.env (see .env.example).'
        );
        setLiveStocks([]);
        setMarketLoading(false);
        return;
      }
      try {
        const requests = TRACKED_SYMBOLS.map(async (symbol) => {
          const quote = await fetchQuoteFinnhubStyle(symbol, FINNHUB_API_KEY, ALPHA_VANTAGE_KEY);
          if (!quote || !Number.isFinite(quote.c)) return null;
          return {
            symbol,
            price: quote.c,
            change: quote.d,
            percentChange: quote.dp,
            high: quote.h,
            low: quote.l,
          };
        });
        const stockData = await Promise.all(requests);
        setLiveStocks(stockData.filter((item) => item && Number.isFinite(item.price) && item.price > 0));
      } catch {
        setMarketError('Unable to load live stocks right now.');
      } finally {
        setMarketLoading(false);
      }
    };

    fetchStocks();
    const marketInterval = setInterval(fetchStocks, 30000);
    return () => clearInterval(marketInterval);
  }, [HAS_MARKET_CREDENTIALS, FINNHUB_API_KEY, ALPHA_VANTAGE_KEY]);

  useEffect(() => {
    const fetchNews = async () => {
      setNewsLoading(true);
      setNewsError('');
      if (!HAS_MARKET_CREDENTIALS) {
        setNewsError(
          'Add VITE_FINNHUB_API_KEY or VITE_ALPHA_VANTAGE_API_KEY in FRONTEND/.env (see .env.example).'
        );
        setLiveNews([]);
        setNewsLoading(false);
        return;
      }
      try {
        const normalized = await fetchDashboardNews({
          newsCategory,
          newsCompanySymbol,
          finnhubKey: FINNHUB_API_KEY,
          alphaKey: ALPHA_VANTAGE_KEY,
        });
        if (!normalized.length) throw new Error('EMPTY_NEWS');
        setLiveNews(normalized);
        setNewsLastUpdated(Date.now());
      } catch {
        setNewsError('Unable to load market news right now.');
      } finally {
        setNewsLoading(false);
      }
    };

    fetchNews();
    const newsInterval = setInterval(fetchNews, 45000);
    return () => clearInterval(newsInterval);
  }, [newsCategory, newsCompanySymbol, HAS_MARKET_CREDENTIALS, FINNHUB_API_KEY, ALPHA_VANTAGE_KEY]);

  const filteredNews = useMemo(() => {
    let list = liveNews;
    const q = newsHeadlineFilter.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (a) =>
          (a.headline || '').toLowerCase().includes(q) ||
          (a.summary || '').toLowerCase().includes(q)
      );
    }
    if (newsRegion === 'all') return list;
    const regionKeywords = {
      us: ['u.s.', ' u.s', 'america', 'fed ', 'federal reserve', 'wall street', 'nasdaq', 'nyse', 's&p', 'washington', 'treasury', 'biden', 'trump'], eu: ['europe', 'ecb', 'euro', 'brexit', 'germany', 'france', ' u.k', 'uk ', 'e.u.', 'brussels'], asia: ['asia', 'china', 'japan', 'hong kong', 'singapore', 'korea', 'taiwan', 'beijing', 'tokyo'], india: ['india', 'rbi', 'sensex', 'nifty', 'mumbai', 'delhi', 'rupee', 'modi'], };
    const keys = regionKeywords[newsRegion] || [];
    list = list.filter((a) => {
      const text = `${a.headline} ${a.summary}`.toLowerCase();
      return keys.some((k) => text.includes(k));
    });
    return list;
  }, [liveNews, newsHeadlineFilter, newsRegion]);

  const newsPreview = useMemo(
    () => filteredNews.slice(0, NEWS_PREVIEW_COUNT), [filteredNews]
  );
  const newsHasMore = filteredNews.length > NEWS_PREVIEW_COUNT;

  useEffect(() => {
    if (!newsModalOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setNewsModalOpen(false);
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [newsModalOpen]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || chatSending) return;

    const historyForApi = chatMessages.map((m) => ({
      role: m.role === 'ai' ? 'model' : 'user', text: m.text, }));

    setChatMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
    setInputText('');
    setChatSending(true);

    try {
      const res = await fetch(`${CHAT_BACKEND}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          userType: user?.id ? 'signed_in' : 'guest',
          access_token: session?.access_token || '',
          history: historyForApi,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const reply =
          typeof data?.reply === 'string'
            ? data.reply
            : `Chat server returned HTTP ${res.status}. For local dev: run \`npm start\` in BACKEND and \`ollama serve\` (set OLLAMA_MODEL in BACKEND/.env).`;
        setChatMessages((prev) => [...prev, { role: 'ai', text: reply }]);
        return;
      }
      const reply = typeof data?.reply === 'string' ? data.reply : 'No response from the AI service.';
      setChatMessages((prev) => [...prev, { role: 'ai', text: reply }]);
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          text:
            'Could not reach the Finvest AI server. Start the backend (`npm start` in BACKEND). For chat without Ollama, set GEMINI_API_KEY in BACKEND/.env (Google AI Studio). Otherwise run Ollama or Docker (BACKEND/docker-compose.ollama.yml). In dev, Vite proxies `/chat` to port 3001.',
        },
      ]);
    } finally {
      setChatSending(false);
    }
  };

  const getInvestorType = () => {
    if (fearScore < 30) return { type: 'Risk-Tolerant', color: '#22c55e', desc: 'You embrace calculated risks' };
    if (fearScore < 50) return { type: 'Growth-Seeker', color: '#84cc16', desc: 'You seek balanced opportunities' };
    if (fearScore < 70) return { type: 'Balanced', color: '#eab308', desc: 'You prefer steady growth' };
    return { type: 'Risk-Averse', color: '#f97316', desc: 'You prioritize capital safety' };
  };

  const getAllocation = () => {
    if (fearScore < 30) return [
      { name: 'Stocks', value: 70, color: '#22c55e' }, { name: 'Bonds', value: 20, color: '#3b82f6' }, { name: 'Cash', value: 10, color: '#6b7280' }
    ];
    if (fearScore < 50) return [
      { name: 'Stocks', value: 55, color: '#84cc16' }, { name: 'Bonds', value: 30, color: '#3b82f6' }, { name: 'Cash', value: 15, color: '#6b7280' }
    ];
    if (fearScore < 70) return [
      { name: 'Stocks', value: 40, color: '#eab308' }, { name: 'Bonds', value: 45, color: '#3b82f6' }, { name: 'Cash', value: 15, color: '#6b7280' }
    ];
    return [
      { name: 'Stocks', value: 25, color: '#f97316' }, { name: 'Bonds', value: 55, color: '#3b82f6' }, { name: 'Cash', value: 20, color: '#6b7280' }
    ];
  };

  const investorInfo = getInvestorType();
  const allocation = getAllocation();

  const formatPercent = (value) => {
    if (!Number.isFinite(value)) return '--';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  const formatMoney = (value) => {
    if (!Number.isFinite(value)) return '--';
    return `$${value.toFixed(2)}`;
  };

  const formatINR = (value) => {
    if (!Number.isFinite(value)) return '--';
    return `₹${Math.round(value).toLocaleString('en-IN')}`;
  };

  const formatNewsUpdated = (ts) => {
    if (!ts) return '';
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatArticleDate = (datetime) => {
    if (datetime == null) return '';
    const ms = typeof datetime === 'number' ? datetime * 1000 : Date.parse(String(datetime));
    if (!Number.isFinite(ms)) return '';
    return new Date(ms).toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', });
  };

  const articleDateIso = (datetime) => {
    if (datetime == null) return undefined;
    const ms = typeof datetime === 'number' ? datetime * 1000 : Date.parse(String(datetime));
    return Number.isFinite(ms) ? new Date(ms).toISOString() : undefined;
  };

  const handleStockSubmit = (e) => {
    e.preventDefault();
    const normalized = stockInput.trim().toUpperCase();
    if (!normalized) return;
    setSelectedStock(normalized);
    setShowSuggestions(false);
  };

  const emotionTotalQ = EMOTION_QUESTIONS.length;
  const emotionQuestion = EMOTION_QUESTIONS[emotionQIndex];
  const emotionProgressPct =
    emotionPhase === 'quiz' ? Math.round(((emotionQIndex + 1) / emotionTotalQ) * 100) : 0;

  const startEmotionQuiz = () => {
    setEmotionAnswers({});
    setEmotionQIndex(0);
    setEmotionResult(null);
    setEmotionPhase('quiz');
  };

  const pickEmotionOption = (optionId) => {
    if (!emotionQuestion) return;
    const next = { ...emotionAnswers, [emotionQuestion.id]: optionId };
    setEmotionAnswers(next);
    if (emotionQIndex + 1 >= emotionTotalQ) {
      const evaluated = evaluateEmotionMindset(next);
      setEmotionResult(evaluated);
      setEmotionPhase('results');
      try {
        const snap = {
          at: Date.now(), overallReadiness: evaluated.overallReadiness, archetype: evaluated.archetype, improveCount: evaluated.improveAreas.length, };
        localStorage.setItem(EMOTION_STORAGE_KEY, JSON.stringify(snap));
        setLastEmotionSnapshot(snap);
      } catch {
        /* ignore */
      }
      const issued = new Date().toISOString();
      setEmotionCertIssuedAt(issued);
      if (user?.id) {
        mergeDashboardPrefs(user.id, {
          nft_badges: {
            emotionCertificate: true,
            emotionCertificateAt: issued,
            emotionArchetype: evaluated.archetype,
            emotionReadiness: evaluated.overallReadiness,
          },
        }).catch(() => {});
      }
      setEmotionCertModalOpen(true);
    } else {
      setEmotionQIndex((i) => i + 1);
    }
  };

  const emotionBack = () => {
    if (emotionQIndex <= 0) return;
    const curId = EMOTION_QUESTIONS[emotionQIndex]?.id;
    const trimmed = { ...emotionAnswers };
    if (curId) delete trimmed[curId];
    setEmotionAnswers(trimmed);
    setEmotionQIndex((i) => i - 1);
  };

  const retakeEmotionQuiz = () => {
    setEmotionPhase('intro');
    setEmotionQIndex(0);
    setEmotionAnswers({});
    setEmotionResult(null);
    setEmotionCertModalOpen(false);
    setEmotionCertIssuedAt('');
  };

  return (
    <div className="db-shell">
      <aside className={`db-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="db-sidebar__header">
          <div>
            <div className="db-brand">FINVEST</div>
            <div className="db-brand-sub">Feel the risk, master the outcome</div>
          </div>
          <button className="db-icon-btn db-mobile-only" onClick={() => setSidebarOpen(false)} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>


        <nav className="db-sidebar__nav" aria-label="Dashboard sections">
          <p className="db-sidebar__nav-eyebrow">Navigate</p>
          <a
            href="#risk-sandbox"
            className={`db-nav-item db-nav-item--rail${activeNavSection === 'risk-sandbox' ? ' active' : ''}`}
            onClick={() => {
              setActiveNavSection('risk-sandbox');
              setSidebarOpen(false);
            }}
          >
            <Activity size={18} aria-hidden />
            <span className="db-nav-item__text">
              <span className="db-nav-item__title">Risk Sandbox</span>
              <span className="db-nav-item__sub">Fear score &amp; scenarios</span>
            </span>
          </a>
          <a
            href="#live-stocks"
            className={`db-nav-item db-nav-item--rail${activeNavSection === 'live-stocks' ? ' active' : ''}`}
            onClick={() => {
              setActiveNavSection('live-stocks');
              setSidebarOpen(false);
            }}
          >
            <TrendingUp size={18} aria-hidden />
            <span className="db-nav-item__text">
              <span className="db-nav-item__title">Live Markets</span>
              <span className="db-nav-item__sub">Charts, Profits and Losses</span>
            </span>
          </a>
          <a
            href="#news-feed"
            className={`db-nav-item db-nav-item--rail${activeNavSection === 'news-feed' ? ' active' : ''}`}
            onClick={() => {
              setActiveNavSection('news-feed');
              setSidebarOpen(false);
            }}
          >
            <MessageSquare size={18} aria-hidden />
            <span className="db-nav-item__text">
              <span className="db-nav-item__title">News Feed</span>
              <span className="db-nav-item__sub">Headlines &amp; search</span>
            </span>
          </a>
          <a
            href="#emotion-testing"
            className={`db-nav-item db-nav-item--rail${activeNavSection === 'emotion-testing' ? ' active' : ''}`}
            onClick={() => {
              setActiveNavSection('emotion-testing');
              setSidebarOpen(false);
            }}
          >
            <Brain size={18} aria-hidden />
            <span className="db-nav-item__text">
              <span className="db-nav-item__title">Emotional Readiness Test</span>
              <span className="db-nav-item__sub">Mindset before investing</span>
            </span>
          </a>
          <Link
            to="/financial-goals"
            className={`db-nav-item db-nav-item--rail${goalsNavActive ? ' active' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            <ClipboardList size={18} aria-hidden />
            <span className="db-nav-item__text">
              <span className="db-nav-item__title">Financial Goals</span>
              <span className="db-nav-item__sub">Future You planner</span>
            </span>
          </Link>
          <div className="db-sidebar__nav-divider" role="presentation" />
          <Link
            to={getPersonalizedPortfolioResumePath()}
            className={`db-nav-item db-nav-item--rail db-nav-item--pp${ppNavActive ? ' active' : ''}`}
            onClick={() => {
              setActiveNavSection('portfolio-insights');
              setSidebarOpen(false);
            }}
          >
            <Shield size={18} aria-hidden />
            <span className="db-nav-item__text">
              <span className="db-nav-item__title">Decode Your Finance Self</span>
              <span className="db-nav-item__sub">Timing, traits, and suggested blend</span>
            </span>
          </Link>
        </nav>

        <div className="db-sidebar-market-rail db-sidebar-market-rail--bottom" aria-label="Live market snapshot">
          <div className="db-sidebar-market-rail__label">Live market intel</div>
          <div className="db-sidebar-market-rail__list">
            {marketLoading && <div className="db-market-empty">Loading live stocks...</div>}
            {!marketLoading && marketError && <div className="db-market-empty">{marketError}</div>}
            {!marketLoading && !marketError && liveStocks.slice(0, 4).map((item) => (
              <div key={item.symbol} className="db-market-item">
                <span className={`db-market-dot ${item.percentChange >= 0 ? 'positive' : 'negative'}`}></span>
                <span>{item.symbol}</span>
                <strong>{formatPercent(item.percentChange)}</strong>
              </div>
            ))}
          </div>
        </div>
      </aside>

      <button className="db-mobile-trigger" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
        <Menu size={24} />
      </button>

      <main className="db-main">
        <header className="db-topbar">
          <div>
            <p className="db-eyebrow">Dashboard</p>
            <h2 className="db-page-title">Risk Sandbox</h2>
            <p className="db-page-subtitle">
              Treat this area as a rehearsal desk: tune how cautious you feel, preview a sample mix, and stress whatif
              moves with live charts and headlines so comfort and tradeoffs are clear before real money is on the line.
              {user?.id ? (
                <span className="db-profile-welcome">
                  {' '}
                  Signed in as{' '}
                  <strong>{user.user_metadata?.full_name || user.email}</strong>
                  {profileSyncNote ? (
                    <span className="db-profile-sync db-profile-sync--warn"> Note: {profileSyncNote}</span>
                  ) : !profileReady ? (
                    <span className="db-profile-sync"> Loading your profile…</span>
                  ) : !fearQuizComplete ? (
                    <span className="db-profile-sync">
                      {' '}
                      <Link to="/personalized-portfolio?tab=quiz" className="db-profile-sync-link">
                        Take the Decode Your Finance Self quiz
                      </Link>{' '}
                      to get your fear score calculated.
                    </span>
                  ) : (
                    <span className="db-profile-sync">
                      {' '}
                      Your fear score: <strong>{fearScore}</strong>/100.
                    </span>
                  )}
                </span>
              ) : (
                <span className="db-profile-welcome">
                  <span className="db-profile-sync">
                    {' '}
                    Preview fear score: <strong>{fearScore}</strong>/100.{' '}
                    <Link to="/personalized-portfolio?tab=quiz" className="db-profile-sync-link">
                      Take the Decode Your Finance Self quiz
                    </Link>{' '}
                    to get your fear score calculated.
                  </span>
                </span>
              )}
            </p>
          </div>
          <button className="db-ai-btn" onClick={() => setChatOpen(!chatOpen)}>
            <Zap size={16} /> Explain via AI
          </button>
        </header>

        <section className="db-group">
          <div
            className={`db-section-heading db-section-heading--row${behaviorOverviewUnlocked ? '' : ' db-section-heading--locked'}`}
          >
            <h3>Behavior &amp; Portfolio Overview</h3>
            {!behaviorOverviewUnlocked ? (
              <span className="db-section-lock-pill">
                <Lock size={14} aria-hidden />
                Locked
              </span>
            ) : null}
          </div>
          {!behaviorOverviewUnlocked ? (
            <p className="db-section-lock-lead">
              Complete the timed <strong>fear personality quiz</strong> in Decode Your Finance Self to unlock your cockpit charts
              and suggested mix.
            </p>
          ) : null}

          <div className={`db-behavior-wrap${behaviorOverviewUnlocked ? '' : ' db-behavior-wrap--locked'}`}>
            {!behaviorOverviewUnlocked ? (
              <div className="db-behavior-lock-panel" role="region" aria-label="Unlock behavior overview">
                <div className="db-behavior-lock-icon" aria-hidden>
                  <Lock size={28} />
                </div>
                <h4 className="db-behavior-lock-title">Take the quiz to unlock</h4>
                <p className="db-behavior-lock-copy">
                  We use your answers and response timing to shape your investor cluster and allocation preview , then
                  this section opens here on the dashboard.
                </p>
                <Link
                  to="/personalized-portfolio?tab=quiz"
                  className="db-behavior-unlock-btn"
                  onClick={() => setSidebarOpen(false)}
                >
                  Open Decode Your Finance Self , personality quiz
                </Link>
              </div>
            ) : null}
            <section className="db-hero-grid" id="risk-sandbox">
              <article className="db-card db-card--hero">
            <div className="db-card-badge">Behavioral Analysis</div>
            <div className="db-score-wrap">
              <div className="db-fear-number" style={{ color: investorInfo.color }}>
                {fearScore}
              </div>
              <div className="db-fear-label">Fear Score</div>
              <div className="db-fear-type" style={{ color: investorInfo.color }}>
                {investorInfo.type}
              </div>
              <div className="db-fear-desc">{investorInfo.desc}</div>
            </div>
            <div className="db-progress">
              <div className="db-progress-fill" style={{ width: `${fearScore}%`, backgroundColor: investorInfo.color }}></div>
            </div>
            <label className="db-fear-slider-label" htmlFor="fear-score-slider">
              Adjust fear score. 
            </label>
            <input
              id="fear-score-slider"
              type="range"
              min={0}
              max={100}
              value={fearScore}
              onChange={(e) => setFearScore(Number(e.target.value))}
              className="db-fear-slider"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={fearScore}
            />

              </article>

              <article className="db-card db-card--portfolio" id="portfolio-insights">
            <div className="db-card-header">
              <h3><Target size={20} /> Decode Your Finance Self</h3>
              <span className="db-badge">Personalized</span>
            </div>
            <div className="db-portfolio-layout">
              <div className="db-pie-shell">
                <ResponsiveContainer width="100%" height={180}>
                  <ChartPie>
                    <Pie
                      data={allocation}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {allocation.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </ChartPie>
                </ResponsiveContainer>
              </div>
              <div className="db-allocation-legend">
                {allocation.map((item, i) => (
                  <div key={i} className="db-legend-item">
                    <span className="db-legend-dot" style={{ backgroundColor: item.color }}></span>
                    <span className="db-legend-name">{item.name}</span>
                    <span className="db-legend-value">{item.value}%</span>
                  </div>
                ))}
                <div className="db-portfolio-note">
                  <Sparkles size={16} />
                  <span>Portfolio shifts automatically with your fear score and long-term comfort zone.</span>
                </div>
              </div>
            </div>
              </article>
            </section>
          </div>
        </section>

        <section className="db-group" id="live-markets-news">
          <div className="db-section-heading">
            <h3>Live Markets & News Tracking</h3>
            <p className="db-section-lead">
              We brought it all here just FOR YOU!  
            </p>
          </div>
          <section className="db-live-section">
          <article className="db-card" id="live-stocks">
            <div className="db-card-header">
              <h3><TrendingUp size={20} /> Live Stocks Tracker</h3>
              <span className="db-card-subtitle">Snapshots refresh every 30 seconds</span>
            </div>
            {marketLoading && <p className="db-live-empty">Loading live stock prices...</p>}
            {!marketLoading && marketError && <p className="db-live-empty">{marketError}</p>}
            {!marketLoading && !marketError && (
              <div className="db-stock-grid">
                {liveStocks.map((item) => (
                  <div key={item.symbol} className="db-stock-card">
                    <div className="db-stock-head">
                      <h4>{item.symbol}</h4>
                      <span className={item.percentChange >= 0 ? 'up' : 'down'}>
                        {formatPercent(item.percentChange)}
                      </span>
                    </div>
                    <div className="db-stock-price">{formatMoney(item.price)}</div>
                    <div className="db-stock-meta">
                      <span>H: {formatMoney(item.high)}</span>
                      <span>L: {formatMoney(item.low)}</span>
                      <span>D: {formatMoney(item.change)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article className="db-card" id="news-feed">
            <div className="db-card-header">
              <h3><Newspaper size={20} /> Live Financial News</h3>
              <span className="db-card-subtitle">
                auto-refresh 45s
                {newsLastUpdated ? ` · updated ${formatNewsUpdated(newsLastUpdated)}` : ''}
              </span>
            </div>
            <div className="db-news-filters">
              <div className="db-news-filter-row">
                <label htmlFor="newsCategory">Category</label>
                <select
                  id="newsCategory"
                  value={newsCategory}
                  onChange={(e) => setNewsCategory(e.target.value)}
                  disabled={!!newsCompanySymbol.trim()}
                >
                  <option value="general">General markets</option>
                  <option value="forex">Forex</option>
                  <option value="crypto">Crypto</option>
                  <option value="merger">M&amp;A</option>
                </select>
              </div>
              <div className="db-news-filter-row">
                <label htmlFor="newsCompany">Company (ticker)</label>
                <input
                  id="newsCompany"
                  type="text"
                  placeholder="e.g. AAPL , overrides category"
                  value={newsCompanySymbol}
                  onChange={(e) => setNewsCompanySymbol(e.target.value.toUpperCase())}
                />
              </div>
              <div className="db-news-filter-row">
                <label htmlFor="newsSearch">Search headlines</label>
                <input
                  id="newsSearch"
                  type="search"
                  placeholder="Filter by keyword in title or summary"
                  value={newsHeadlineFilter}
                  onChange={(e) => setNewsHeadlineFilter(e.target.value)}
                />
              </div>
              <div className="db-news-filter-row">
                <label htmlFor="newsRegion">Region focus</label>
                <select id="newsRegion" value={newsRegion} onChange={(e) => setNewsRegion(e.target.value)}>
                  <option value="all">All regions</option>
                  <option value="us">US / Americas</option>
                  <option value="eu">Europe / UK</option>
                  <option value="asia">Asia</option>
                  <option value="india">India</option>
                </select>
              </div>
            </div>
            {newsLoading && <p className="db-live-empty">Loading finance news...</p>}
            {!newsLoading && newsError && <p className="db-live-empty">{newsError}</p>}
            {!newsLoading && !newsError && filteredNews.length === 0 && (
              <p className="db-live-empty">No articles match your filters. Try clearing search or region.</p>
            )}
            {!newsLoading && !newsError && filteredNews.length > 0 && (
              <>
                <div className="db-news-list">
                  {newsPreview.map((article) => (
                    <a
                      key={article.id}
                      href={article.url}
                      target="_blank"
                      rel="noreferrer"
                      className="db-news-card"
                    >
                      <div className="db-news-top">
                        <span className="db-news-source">{article.source || 'Market News'}</span>
                        <ExternalLink size={14} />
                      </div>
                      {formatArticleDate(article.datetime) && (
                        <time className="db-news-date" dateTime={articleDateIso(article.datetime)}>
                          {formatArticleDate(article.datetime)}
                        </time>
                      )}
                      <h4>{article.headline}</h4>
                      <p>{article.summary || 'Tap to read the full story.'}</p>
                    </a>
                  ))}
                </div>
                {newsHasMore && (
                  <button type="button" className="db-news-show-more" onClick={() => setNewsModalOpen(true)}>
                    Show more ({filteredNews.length} articles)
                  </button>
                )}
              </>
            )}
          </article>
          </section>
        </section>

        <section className="db-group" id="ai-risk-simulator">
          <div className="db-section-heading"><h3>AI Risk Simulator</h3></div>
          <article className="db-card">
            <div className="db-card-header">
              <div>
                <h3><Activity size={20} /> Real Data Simulation</h3>
                <p className="db-card-subtitle">
                  This data is generated solely on the basis of historical data and not on any "stategy". This is a collection of how things were, we don't pose to know how things will be.
                </p>
              </div>
            </div>

            <form className="db-stock-form" onSubmit={handleStockSubmit}>
              <label htmlFor="stockSymbol">Stock symbol</label>
              <div className="db-stock-form-row">
                <input
                  id="stockSymbol"
                  value={stockInput}
                  onChange={(e) => {
                    setStockInput(e.target.value.toUpperCase());
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="e.g. AAPL, MSFT, TSLA"
                />
                <button type="submit">
                  <Search size={16} />
                  Run Simulation
                </button>
              </div>
              {showSuggestions && stockSuggestions.length > 0 && (
                <div className="db-suggestion-list">
                  {stockSuggestions.map((item) => (
                    <button
                      key={`${item.symbol}-${item.description}`}
                      type="button"
                      className="db-suggestion-item"
                      onClick={() => {
                        setStockInput(item.symbol);
                        setSelectedStock(item.symbol);
                        setShowSuggestions(false);
                      }}
                    >
                      <span>{item.symbol}</span>
                      <small>{item.description}</small>
                    </button>
                  ))}
                </div>
              )}
            </form>

            {riskLoading && <p className="db-live-empty">Running simulation with live data...</p>}
            {!riskLoading && riskError && <p className="db-live-empty">{riskError}</p>}
            {!riskLoading && !riskError && riskResult && (
              <>
                <div className="db-risk-explain">
                  <p>
                    <strong>Finnhub</strong> quote + <strong>stock/metric</strong> power the summary cards. The chart uses{' '}
                    <strong>TradingView Lightweight Charts™</strong> with OHLC + volume from Yahoo (same{' '}
                    <code>/__yahoo</code> or backend proxy as before). Drag the crosshair to read O/H/L/C per bar. Stop and R:R
                    are educational only.
                  </p>
                </div>

                <RiskCandlestickChart symbol={riskResult.symbol} finnhubToken={FINNHUB_API_KEY} />

                <div className="db-risk-grid">
                  <div className="db-risk-card">
                    <span>Selected stock</span>
                    <strong>{riskResult.symbol}</strong>
                  </div>
                  <div className="db-risk-card">
                    <span>If you invested</span>
                    <strong>{formatINR(riskResult.initialInvestment)}</strong>
                  </div>
                  <div className="db-risk-card">
                    <span>Current value</span>
                    <strong>{formatINR(riskResult.currentValue)}</strong>
                  </div>
                  <div className="db-risk-card">
                    <span>Live day impact (API matched)</span>
                    <strong className={riskResult.liveRupeeImpact >= 0 ? 'up' : 'down'}>
                      {formatINR(riskResult.liveRupeeImpact)} ({formatPercent(riskResult.livePercentChange)})
                    </strong>
                  </div>
                  <div className="db-risk-card">
                    <span>Worst-case value</span>
                    <strong>{formatINR(riskResult.worstValue)}</strong>
                  </div>
                  <div className="db-risk-card">
                    <span>Worst-case loss</span>
                    <strong className="down">
                      {formatINR(riskResult.worstLoss)} ({riskResult.maxDrawdownPercent.toFixed(2)}% drawdown)
                    </strong>
                  </div>
                  {Number.isFinite(riskResult.yearlyHighPrice) && (
                    <div className="db-risk-card">
                      <span>52-week high</span>
                      <strong className="up">
                        {formatMoney(riskResult.yearlyHighPrice)} · {formatINR(riskResult.yearlyHighValue)}
                      </strong>
                    </div>
                  )}
                  {Number.isFinite(riskResult.yearlyLowPrice) && (
                    <div className="db-risk-card">
                      <span>52-week low</span>
                      <strong className="down">
                        {formatMoney(riskResult.yearlyLowPrice)} · {formatINR(riskResult.yearlyLowValue)}
                      </strong>
                    </div>
                  )}
                  {Number.isFinite(riskResult.stopLossPrice) && Number.isFinite(riskResult.stopLossPositionValue) && (
                    <div className="db-risk-card">
                      <span>Suggested stop (calc.)</span>
                      <strong className="down">
                        {formatMoney(riskResult.stopLossPrice)} to {formatINR(riskResult.stopLossPositionValue)} if hit
                      </strong>
                    </div>
                  )}
                  {Number.isFinite(riskResult.riskRewardRatio) && (
                    <div className="db-risk-card">
                      <span>Risk : reward (to 52-week high)</span>
                      <strong>1 : {riskResult.riskRewardRatio.toFixed(2)}</strong>
                    </div>
                  )}
                  {riskResult.riskRewardNote && !Number.isFinite(riskResult.riskRewardRatio) && (
                    <div className="db-risk-card db-risk-card--wide">
                      <span>Risk : reward</span>
                      <strong>{riskResult.riskRewardNote}</strong>
                    </div>
                  )}
                </div>
              </>
            )}
          </article>
        </section>

        <section className="db-group" id="emotion-testing">
          <div className="db-section-heading">
            <h3>Emotional Readiness Test</h3>
          </div>
          <article className="db-card db-card--emotion">
            <div className="db-card-header">
              <div>
                <h3>
                  <Brain size={20} aria-hidden /> Pre-investing mindset check
                </h3>
                <p className="db-card-subtitle">
                  Like a short personality-style reflection: emotional balance, impulses, and whether your headspace fits
                  taking financial risk. Not medical or clinical advice , a gentle mirror before you commit capital.
                </p>
              </div>
            </div>

            {emotionPhase === 'intro' && (
              <div className="db-emotion-intro">
                <p className="db-emotion-lead">
                  Investing works best when you are not running on empty. This check-in highlights what you already
                  handle well, where to grow, and what to watch so you only scale risk in the right mindset.
                </p>
                <ul className="db-emotion-bullets">
                  <li>12 scenario questions , about two minutes</li>
                  <li>Six areas: regulation, FOMO, setbacks, patience, honesty, life balance</li>
                  <li>Results: strengths, growth edges, and a practical “look after” list</li>
                </ul>
                {lastEmotionSnapshot?.at && (
                  <p className="db-emotion-last">
                    Last check-in:{' '}
                    <strong>{lastEmotionSnapshot.archetype}</strong> · readiness ~{lastEmotionSnapshot.overallReadiness}% ·{' '}
                    {new Date(lastEmotionSnapshot.at).toLocaleDateString()}
                  </p>
                )}
                <button type="button" className="db-emotion-primary" onClick={startEmotionQuiz}>
                  Begin check-in
                  <ChevronRight size={18} aria-hidden />
                </button>
              </div>
            )}

            {emotionPhase === 'quiz' && emotionQuestion && (
              <div className="db-emotion-quiz">
                <div className="db-emotion-progress-wrap">
                  <div className="db-emotion-progress-meta">
                    <span>
                      Question {emotionQIndex + 1} of {emotionTotalQ}
                    </span>
                    <span>{emotionProgressPct}%</span>
                  </div>
                  <div className="db-emotion-progress-bar" role="progressbar" aria-valuenow={emotionProgressPct} aria-valuemin={0} aria-valuemax={100}>
                    <div className="db-emotion-progress-fill" style={{ width: `${emotionProgressPct}%` }} />
                  </div>
                </div>
                <h4 className="db-emotion-qtext" id={`emotion-q-${emotionQuestion.id}`}>
                  {emotionQuestion.text}
                </h4>
                <div className="db-emotion-options" role="group" aria-labelledby={`emotion-q-${emotionQuestion.id}`}>
                  {emotionQuestion.options.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      className="db-emotion-option"
                      onClick={() => pickEmotionOption(opt.id)}
                    >
                      <span className="db-emotion-option-label">{opt.label}</span>
                      <ChevronRight size={16} className="db-emotion-option-chevron" aria-hidden />
                    </button>
                  ))}
                </div>
                <div className="db-emotion-quiz-foot">
                  <button type="button" className="db-emotion-text-btn" onClick={emotionBack} disabled={emotionQIndex <= 0}>
                    Back
                  </button>
                </div>
              </div>
            )}

            {emotionPhase === 'results' && emotionResult && (
              <div className="db-emotion-results">
                <div className="db-emotion-cert-row">
                  <FinvestCertificate
                    variant="emotion"
                    recipientName={displayNameForAi(user) || 'Finvest learner'}
                    awardTitle={emotionResult.archetype}
                    detailLines={[`Readiness index: ${emotionResult.overallReadiness}/100 across six mindset pillars.`]}
                    issuedAtIso={emotionCertIssuedAt || new Date().toISOString()}
                    finePrint="Stored on your profile when signed in. Optional on-chain badge if you connect a wallet and the Finvest contract is deployed."
                    compact
                    className="db-emotion-cert-preview"
                  />
                  <button type="button" className="db-emotion-cert-expand" onClick={() => setEmotionCertModalOpen(true)}>
                    View full certificate
                  </button>
                </div>

                <div className="db-emotion-archetype">
                  <span className="db-emotion-archetype-label">Your mindset profile</span>
                  <h4 className="db-emotion-archetype-title">{emotionResult.archetype}</h4>
                  <div className="db-emotion-readiness">
                    <span className="db-emotion-readiness-num">{emotionResult.overallReadiness}</span>
                    <span className="db-emotion-readiness-suffix">/ 100 readiness index</span>
                  </div>
                  <p className="db-emotion-summary">{emotionResult.closingAdvice}</p>
                </div>

                <div className="db-emotion-pillars-grid">
                  {emotionResult.pillars.map((p) => (
                    <div
                      key={p.key}
                      className={`db-emotion-pillar db-emotion-pillar--${p.level}`}
                    >
                      <div className="db-emotion-pillar-head">
                        <span className="db-emotion-pillar-title">{p.title}</span>
                        <span className="db-emotion-pillar-badge">
                          {p.level === 'strong' ? 'Strong' : p.level === 'grow' ? 'Grow' : 'Watch'}
                        </span>
                      </div>
                      <p className="db-emotion-pillar-blurb">{p.blurb}</p>
                      <div className="db-emotion-pillar-meter">
                        <div className="db-emotion-pillar-meter-fill" style={{ width: `${p.percent}%` }} />
                      </div>
                      <span className="db-emotion-pillar-pct">{p.percent}%</span>
                    </div>
                  ))}
                </div>

                <div className="db-emotion-columns">
                  <div className="db-emotion-col db-emotion-col--good">
                    <h5>Areas you show strength</h5>
                    {emotionResult.masteredAreas.length ? (
                      <ul>
                        {emotionResult.masteredAreas.map((t) => (
                          <li key={t}>{t}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="db-emotion-col-empty">No single area maxed yet , that is okay; small habits add up.</p>
                    )}
                  </div>
                  <div className="db-emotion-col db-emotion-col--grow">
                    <h5>Prioritize improving</h5>
                    {emotionResult.improveAreas.length ? (
                      <ul>
                        {emotionResult.improveAreas.map((t) => (
                          <li key={t}>{t}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="db-emotion-col-empty">Nothing flagged as urgent , still revisit when life gets noisy.</p>
                    )}
                  </div>
                  <div className="db-emotion-col db-emotion-col--watch">
                    <h5>Keep watching</h5>
                    {emotionResult.watchOutLabels.length ? (
                      <ul>
                        {emotionResult.watchOutLabels.map((t) => (
                          <li key={t}>{t}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="db-emotion-col-empty">Middle band , stay curious, not complacent.</p>
                    )}
                  </div>
                </div>

                <div className="db-emotion-lookafter">
                  <h5>What to look after (practical)</h5>
                  <ul>
                    {emotionResult.lookAfter.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                </div>

                <div className="db-emotion-results-actions">
                  <button type="button" className="db-emotion-secondary" onClick={retakeEmotionQuiz}>
                    <RotateCcw size={16} aria-hidden />
                    Retake check-in
                  </button>
                  <a
                    href="#ai-risk-simulator"
                    className="db-emotion-link-down"
                    onClick={() => setSidebarOpen(false)}
                  >
                    Back to AI Risk Simulator
                  </a>
                </div>
                <p className="db-emotion-disclaimer">
                  This tool is for self-reflection only. If you are struggling with anxiety, mood, or crisis, please reach
                  out to a trusted professional or helpline in your region.
                </p>
              </div>
            )}
          </article>
        </section>
      </main>

      <AnimatePresence>
        {chatOpen && (
          <MotionDiv
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="db-chat-widget"
            id="ai-explainer"
          >
            <div className="db-chat-header">
              <div className="db-chat-status">
                <span className="db-status-dot"></span>
                <span>Decode Your Finance Self</span>
              </div>
              <button onClick={() => setChatOpen(false)} aria-label="Close AI chat"><X size={18} /></button>
            </div>

            <div className="db-chat-messages">
              {chatMessages.length === 0 && (
                <div className="db-chat-message ai">Loading your Finvest assistant…</div>
              )}
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`db-chat-message ${msg.role}`}>
                  {msg.text}
                </div>
              ))}
              {chatSending && (
                <div className="db-chat-message ai" aria-live="polite">
                  Thinking…
                </div>
              )}
            </div>

            <form onSubmit={handleSendMessage} className="db-chat-input">
              <input 
                type="text" 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ask anything about investing..."
                disabled={chatSending || !profileReady}
              />
              <button type="submit" disabled={chatSending || !profileReady}>
                {chatSending ? 'Sending…' : 'Send'}
              </button>
            </form>
          </MotionDiv>
        )}
      </AnimatePresence>

      {newsModalOpen && (
        <div
          className="db-news-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="db-news-modal-title"
          onClick={() => setNewsModalOpen(false)}
        >
          <div className="db-news-modal" onClick={(e) => e.stopPropagation()}>
            <div className="db-news-modal-head">
              <h2 id="db-news-modal-title">All financial news</h2>
              <button type="button" className="db-news-modal-close" onClick={() => setNewsModalOpen(false)} aria-label="Close news list">
                <X size={22} />
              </button>
            </div>
            <p className="db-news-modal-meta">
              {filteredNews.length} article{filteredNews.length !== 1 ? 's' : ''} · same filters as the card above · press Esc to close
            </p>
            <div className="db-news-modal-body">
              {filteredNews.map((article) => (
                <a
                  key={article.id}
                  href={article.url}
                  target="_blank"
                  rel="noreferrer"
                  className="db-news-card"
                >
                  <div className="db-news-top">
                    <span className="db-news-source">{article.source || 'Market News'}</span>
                    <ExternalLink size={14} />
                  </div>
                  {formatArticleDate(article.datetime) && (
                    <time className="db-news-date" dateTime={articleDateIso(article.datetime)}>
                      {formatArticleDate(article.datetime)}
                    </time>
                  )}
                  <h4>{article.headline}</h4>
                  <p>{article.summary || 'Tap to read the full story.'}</p>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      <CertificateModal
        open={emotionCertModalOpen && Boolean(emotionResult)}
        onClose={() => setEmotionCertModalOpen(false)}
        title="Investing mindset certificate"
        actions={
          <>
            <button type="button" className="finvest-cert-modal-btn" onClick={() => setEmotionCertModalOpen(false)}>
              Close
            </button>
            <button type="button" className="finvest-cert-modal-btn finvest-cert-modal-btn--ghost" onClick={() => window.print()}>
              Print / save as PDF
            </button>
          </>
        }
      >
        {emotionResult ? (
          <FinvestCertificate
            variant="emotion"
            recipientName={displayNameForAi(user) || 'Finvest learner'}
            awardTitle={emotionResult.archetype}
            detailLines={[`Readiness index: ${emotionResult.overallReadiness}/100 across six mindset pillars.`]}
            issuedAtIso={emotionCertIssuedAt || new Date().toISOString()}
            finePrint="Saved to your Finvest profile when signed in. On-chain NFT badges are optional when a wallet and badge contract are configured."
          />
        ) : null}
      </CertificateModal>
    </div>
  );
}

export default Dashboard;

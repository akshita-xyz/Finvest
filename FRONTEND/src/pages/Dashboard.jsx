import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  classificationFromFearScore,
  fetchUserProfile,
  updateUserProfileFields,
} from '../services/userProfileService';
import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const MotionDiv = motion.div;
import {
  Activity,
  Shield,
  TrendingUp,
  MessageSquare,
  Menu,
  X,
  Target,
  Zap,
  Sparkles,
  Newspaper,
  ExternalLink,
  Search,
  ClipboardList,
} from 'lucide-react';
import {
  Area,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart as ChartPie,
  Pie,
  Cell,
} from 'recharts';
import '../styles/dashboard.css';

const NEWS_PREVIEW_COUNT = 4;

const SIDEBAR_NAV_IDS = ['risk-sandbox', 'portfolio-insights', 'live-stocks', 'news-feed'];

function readNavSectionFromHash() {
  if (typeof window === 'undefined') return 'risk-sandbox';
  const h = (window.location.hash || '').replace(/^#/, '');
  if (SIDEBAR_NAV_IDS.includes(h)) return h;
  if (h === 'live-markets-news') return 'live-stocks';
  return 'risk-sandbox';
}

function Dashboard() {
  const { user } = useAuth();
  const FINNHUB_API_KEY = 'd7cj1gpr01qv03eshng0d7cj1gpr01qv03eshngg';
  const TRACKED_SYMBOLS = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'GOOGL'];

  const [fearScore, setFearScore] = useState(50);
  const [profileReady, setProfileReady] = useState(false);
  const [profileSyncNote, setProfileSyncNote] = useState('');
  const skipProfileSaveRef = useRef(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeNavSection, setActiveNavSection] = useState(readNavSectionFromHash);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { role: 'ai', text: "Hi! I'm your AI Portfolio Explainer. I can explain any financial concept like you're 15. What's on your mind?" }
  ]);
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
  const [riskSeries, setRiskSeries] = useState([]);
  const [stockSuggestions, setStockSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [newsCategory, setNewsCategory] = useState('general');
  const [newsCompanySymbol, setNewsCompanySymbol] = useState('');
  const [newsHeadlineFilter, setNewsHeadlineFilter] = useState('');
  const [newsRegion, setNewsRegion] = useState('all');
  const [newsLastUpdated, setNewsLastUpdated] = useState(null);
  const [newsModalOpen, setNewsModalOpen] = useState(false);

  useEffect(() => {
    const onHash = () => setActiveNavSection(readNavSectionFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Load fear score + prefs from Supabase per user; fall back to localStorage when no row / guest.
  useEffect(() => {
    if (!user?.id) {
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
      if (error) {
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
      if (data?.fear_score != null && Number.isFinite(Number(data.fear_score))) {
        const n = Math.min(100, Math.max(0, Number(data.fear_score)));
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

  // Persist fear score + derived classification for custom per-user dashboard state.
  useEffect(() => {
    if (!profileReady || !user?.id || skipProfileSaveRef.current) return;
    const handle = setTimeout(() => {
      updateUserProfileFields(user.id, {
        fear_score: fearScore,
        classification: classificationFromFearScore(fearScore),
      }).then(({ error }) => {
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
        const quoteResponse = await fetch(
          `https://finnhub.io/api/v1/quote?symbol=${selectedStock}&token=${FINNHUB_API_KEY}`
        );
        if (!quoteResponse.ok) throw new Error('QUOTE_FETCH_FAILED');
        const quote = await quoteResponse.json();
        if (!Number.isFinite(quote.c) || quote.c <= 0) throw new Error('INVALID_QUOTE');

        const initialInvestment = 10000;
        const livePercentChange = Number.isFinite(quote.dp) ? quote.dp : 0;
        const liveAbsoluteChange = Number.isFinite(quote.d) ? quote.d : 0;
        const liveRupeeImpact = (initialInvestment * livePercentChange) / 100;
        const currentValue = initialInvestment + liveRupeeImpact;
        const profitLoss = currentValue - initialInvestment;
        const profitLossPercent = (profitLoss / initialInvestment) * 100;

        const to = Math.floor(Date.now() / 1000);
        const from = to - (24 * 60 * 60);
        const candleResponse = await fetch(
          `https://finnhub.io/api/v1/stock/candle?symbol=${selectedStock}&resolution=5&from=${from}&to=${to}&token=${FINNHUB_API_KEY}`
        );
        const candleData = candleResponse.ok ? await candleResponse.json() : null;
        const validCandles = candleData && candleData.s === 'ok' && Array.isArray(candleData.c) && candleData.c.length > 1;

        let points = [];
        let worstValue = initialInvestment;
        let peakValue = initialInvestment;
        let maxDrawdownPercent = 0;

        if (validCandles) {
          const firstPrice = candleData.c[0];
          const shares = initialInvestment / firstPrice;
          points = candleData.c.map((price, index) => {
            const value = shares * price;
            if (value > peakValue) peakValue = value;
            if (value < worstValue) worstValue = value;
            const drawdown = ((peakValue - value) / peakValue) * 100;
            if (drawdown > maxDrawdownPercent) maxDrawdownPercent = drawdown;
            return {
              i: index,
              t: candleData.t?.[index] ? new Date(candleData.t[index] * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : `${index}`,
              value,
            };
          });
        } else {
          const fallbackLowPercent = Number.isFinite(quote.l) && quote.c > 0 ? ((quote.l - quote.c) / quote.c) * 100 : livePercentChange;
          const worstPercent = Math.min(livePercentChange, fallbackLowPercent);
          worstValue = initialInvestment + (initialInvestment * worstPercent) / 100;
          maxDrawdownPercent = Math.abs(worstPercent);
          points = [
            { i: 0, t: 'Open', value: initialInvestment },
            { i: 1, t: 'Now', value: currentValue },
          ];
        }

        setRiskResult({
          symbol: selectedStock,
          initialInvestment,
          currentValue,
          profitLoss,
          profitLossPercent,
          worstValue,
          worstLoss: Math.max(0, initialInvestment - worstValue),
          maxDrawdownPercent,
          livePercentChange,
          liveAbsoluteChange,
          liveRupeeImpact,
        });
        setRiskSeries(points);
      } catch {
        const fallbackQuote = liveStocks.find((item) => item.symbol === selectedStock);
        if (fallbackQuote && Number.isFinite(fallbackQuote.price) && fallbackQuote.price > 0) {
          const initialInvestment = 10000;
          const livePercentChange = Number.isFinite(fallbackQuote.percentChange) ? fallbackQuote.percentChange : 0;
          const liveRupeeImpact = (initialInvestment * livePercentChange) / 100;
          const currentValue = initialInvestment + liveRupeeImpact;
          const estWorstValue = initialInvestment + (initialInvestment * Math.min(livePercentChange, -Math.abs(livePercentChange))) / 100;
          const estimatedSeries = Array.from({ length: 24 }).map((_, index) => {
            const factor = 1 + (livePercentChange / 100) * (index / 23);
            return { i: index, t: `${index}:00`, value: initialInvestment * factor };
          });
          setRiskResult({
            symbol: selectedStock,
            initialInvestment,
            currentValue,
            profitLoss: liveRupeeImpact,
            profitLossPercent: livePercentChange,
            worstValue: estWorstValue,
            worstLoss: Math.max(0, initialInvestment - estWorstValue),
            maxDrawdownPercent: ((initialInvestment - estWorstValue) / initialInvestment) * 100,
            livePercentChange,
            liveAbsoluteChange: fallbackQuote.change || 0,
            liveRupeeImpact,
          });
          setRiskSeries(estimatedSeries);
          setRiskError('');
        } else {
          setRiskResult(null);
          setRiskSeries([]);
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
        const response = await fetch(`https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}&token=${FINNHUB_API_KEY}`);
        if (!response.ok) return;
        const data = await response.json();
        const results = Array.isArray(data.result) ? data.result
          .filter((item) => item.symbol && item.description)
          .slice(0, 8)
          .map((item) => ({
            symbol: item.symbol,
            description: item.description,
          })) : [];
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
      try {
        const requests = TRACKED_SYMBOLS.map(async (symbol) => {
          const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`);
          if (!response.ok) throw new Error(`Stock fetch failed for ${symbol}`);
          const quote = await response.json();
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
        setLiveStocks(stockData.filter((item) => Number.isFinite(item.price) && item.price > 0));
      } catch {
        setMarketError('Unable to load live stocks right now.');
      } finally {
        setMarketLoading(false);
      }
    };

    fetchStocks();
    const marketInterval = setInterval(fetchStocks, 30000);
    return () => clearInterval(marketInterval);
  }, []);

  useEffect(() => {
    const fetchNews = async () => {
      setNewsLoading(true);
      setNewsError('');
      try {
        const sym = newsCompanySymbol.trim().toUpperCase();
        let url;
        if (sym) {
          const to = new Date();
          const from = new Date();
          from.setDate(from.getDate() - 7);
          const fmt = (d) => d.toISOString().slice(0, 10);
          url = `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(sym)}&from=${fmt(from)}&to=${fmt(to)}&token=${FINNHUB_API_KEY}`;
        } else {
          url = `https://finnhub.io/api/v1/news?category=${encodeURIComponent(newsCategory)}&token=${FINNHUB_API_KEY}`;
        }
        const response = await fetch(url);
        if (!response.ok) throw new Error('News fetch failed');
        const articles = await response.json();
        const normalized = Array.isArray(articles)
          ? articles.slice(0, 60).map((item) => ({
              id: item.id || `${item.datetime}-${item.headline}`,
              headline: item.headline,
              summary: item.summary,
              source: item.source,
              url: item.url,
              datetime: item.datetime,
            }))
          : [];
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
  }, [newsCategory, newsCompanySymbol]);

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
      us: ['u.s.', ' u.s', 'america', 'fed ', 'federal reserve', 'wall street', 'nasdaq', 'nyse', 's&p', 'washington', 'treasury', 'biden', 'trump'],
      eu: ['europe', 'ecb', 'euro', 'brexit', 'germany', 'france', ' u.k', 'uk ', 'e.u.', 'brussels'],
      asia: ['asia', 'china', 'japan', 'hong kong', 'singapore', 'korea', 'taiwan', 'beijing', 'tokyo'],
      india: ['india', 'rbi', 'sensex', 'nifty', 'mumbai', 'delhi', 'rupee', 'modi'],
    };
    const keys = regionKeywords[newsRegion] || [];
    list = list.filter((a) => {
      const text = `${a.headline} ${a.summary}`.toLowerCase();
      return keys.some((k) => text.includes(k));
    });
    return list;
  }, [liveNews, newsHeadlineFilter, newsRegion]);

  const newsPreview = useMemo(
    () => filteredNews.slice(0, NEWS_PREVIEW_COUNT),
    [filteredNews]
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

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMsgs = [...chatMessages, { role: 'user', text: inputText }];
    setChatMessages(newMsgs);
    setInputText('');

    setTimeout(() => {
      setChatMessages(prev => [...prev, { 
        role: 'ai', 
        text: `Great question about "${newMsgs[newMsgs.length-1].text}"! Think of it like this: if you had a magic garden that grows money, you'd want to know if it'll rain or shine, right? That's what we help you prepare for!` 
      }]);
    }, 1000);
  };

  const getInvestorType = () => {
    if (fearScore < 30) return { type: 'Risk-Tolerant', color: '#22c55e', desc: 'You embrace calculated risks' };
    if (fearScore < 50) return { type: 'Growth-Seeker', color: '#84cc16', desc: 'You seek balanced opportunities' };
    if (fearScore < 70) return { type: 'Balanced', color: '#eab308', desc: 'You prefer steady growth' };
    return { type: 'Risk-Averse', color: '#f97316', desc: 'You prioritize capital safety' };
  };

  const getAllocation = () => {
    if (fearScore < 30) return [
      { name: 'Stocks', value: 70, color: '#22c55e' },
      { name: 'Bonds', value: 20, color: '#3b82f6' },
      { name: 'Cash', value: 10, color: '#6b7280' }
    ];
    if (fearScore < 50) return [
      { name: 'Stocks', value: 55, color: '#84cc16' },
      { name: 'Bonds', value: 30, color: '#3b82f6' },
      { name: 'Cash', value: 15, color: '#6b7280' }
    ];
    if (fearScore < 70) return [
      { name: 'Stocks', value: 40, color: '#eab308' },
      { name: 'Bonds', value: 45, color: '#3b82f6' },
      { name: 'Cash', value: 15, color: '#6b7280' }
    ];
    return [
      { name: 'Stocks', value: 25, color: '#f97316' },
      { name: 'Bonds', value: 55, color: '#3b82f6' },
      { name: 'Cash', value: 20, color: '#6b7280' }
    ];
  };

  const investorInfo = getInvestorType();
  const allocation = getAllocation();
  const confidence = Math.max(62, 92 - Math.round(Math.abs(fearScore - 52) / 2));
  const nextStep = fearScore > 65 ? 'Reduce panic-risk with a safer mix' : 'Build conviction with simulated outcomes';
  const dashboardStats = [
    { label: 'Loss probability', value: '28%', tone: 'danger' },
    { label: 'Projected 30Y value', value: '$100,627', tone: 'neutral' },
    { label: 'AI confidence', value: `${confidence}%`, tone: 'success' },
  ];
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

  const riskLineColor =
    riskResult && Number.isFinite(riskResult.liveRupeeImpact)
      ? riskResult.liveRupeeImpact < 0
        ? '#dc2626'
        : '#16a34a'
      : '#0f172a';

  const formatNewsUpdated = (ts) => {
    if (!ts) return '';
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatArticleDate = (datetime) => {
    if (datetime == null) return '';
    const ms = typeof datetime === 'number' ? datetime * 1000 : Date.parse(String(datetime));
    if (!Number.isFinite(ms)) return '';
    return new Date(ms).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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

  return (
    <div className="db-shell">
      <aside className={`db-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="db-sidebar__header">
          <div>
            <div className="db-brand">FINVEST</div>
            <div className="db-brand-sub">Fear-aware investing cockpit</div>
          </div>
          <button className="db-icon-btn db-mobile-only" onClick={() => setSidebarOpen(false)} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        <div className="db-sidebar__panel">
          <div className="db-panel-label">Today&apos;s focus</div>
          <div className="db-panel-title">{nextStep}</div>
          <p className="db-panel-copy">
            Contextualize possible losses before real exposure so decisions feel calm, informed, and deliberate.
          </p>
        </div>

        <nav className="db-sidebar__nav" aria-label="Dashboard sections">
          <a
            href="#risk-sandbox"
            className={`db-nav-item db-nav-item--rail${activeNavSection === 'risk-sandbox' ? ' active' : ''}`}
            onClick={() => {
              setActiveNavSection('risk-sandbox');
              setSidebarOpen(false);
            }}
          >
            <Activity size={18} aria-hidden /> Risk Sandbox
          </a>
          <a
            href="#portfolio-insights"
            className={`db-nav-item db-nav-item--rail${activeNavSection === 'portfolio-insights' ? ' active' : ''}`}
            onClick={() => {
              setActiveNavSection('portfolio-insights');
              setSidebarOpen(false);
            }}
          >
            <Shield size={18} aria-hidden /> AI Portfolio
          </a>
          <a
            href="#live-stocks"
            className={`db-nav-item db-nav-item--rail${activeNavSection === 'live-stocks' ? ' active' : ''}`}
            onClick={() => {
              setActiveNavSection('live-stocks');
              setSidebarOpen(false);
            }}
          >
            <TrendingUp size={18} aria-hidden /> Live Markets
          </a>
          <a
            href="#news-feed"
            className={`db-nav-item db-nav-item--rail${activeNavSection === 'news-feed' ? ' active' : ''}`}
            onClick={() => {
              setActiveNavSection('news-feed');
              setSidebarOpen(false);
            }}
          >
            <MessageSquare size={18} aria-hidden /> News Feed
          </a>
          <Link
            to="/financial-goals"
            className="db-nav-item"
            onClick={() => setSidebarOpen(false)}
          >
            <ClipboardList size={18} /> Financial Goals
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
              Beautiful, high-clarity visuals for fear score, portfolio mix, and scenario-based confidence.
              {user?.id ? (
                <span className="db-profile-welcome">
                  {' '}
                  Signed in as{' '}
                  <strong>{user.user_metadata?.full_name || user.email}</strong>
                  {profileSyncNote ? (
                    <span className="db-profile-sync db-profile-sync--warn"> — {profileSyncNote}</span>
                  ) : (
                    <span className="db-profile-sync"> — your fear score is saved to Supabase for this account.</span>
                  )}
                </span>
              ) : null}
            </p>
          </div>
          <button className="db-ai-btn" onClick={() => setChatOpen(!chatOpen)}>
            <Zap size={16} /> Explain via AI
          </button>
        </header>

        <section className="db-group">
          <div className="db-section-heading">
            <h3>Behavior & Portfolio Overview</h3>
          </div>
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
              Adjust fear score (stored per user in Supabase)
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
            <div className="db-mini-stats">
              {dashboardStats.map((item) => (
                <div key={item.label} className={`db-mini-stat ${item.tone}`}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </article>

          <article className="db-card db-card--portfolio" id="portfolio-insights">
            <div className="db-card-header">
              <h3><Target size={20} /> AI Portfolio</h3>
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
        </section>

        <section className="db-group" id="live-markets-news">
          <div className="db-section-heading">
            <h3>Live Markets & News Tracking</h3>
          </div>
          <section className="db-live-section">
          <article className="db-card" id="live-stocks">
            <div className="db-card-header">
              <h3><TrendingUp size={20} /> Live Stocks Tracker</h3>
              <span className="db-card-subtitle">Auto-refresh every 30 seconds</span>
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
                Finnhub API · auto-refresh 45s
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
                  placeholder="e.g. AAPL — overrides category"
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
          <div className="db-section-heading"><h3>AI Risk Simulator (Core)</h3></div>
          <article className="db-card">
            <div className="db-card-header">
              <div>
                <h3><Activity size={20} /> Real Data Simulation</h3>
                <p className="db-card-subtitle">
                  Enter any stock to see a live intraday chart and exact API-based impact for a ₹10,000 position.
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
                    This chart maps your simulated ₹10,000 position using live intraday prices for <strong>{riskResult.symbol}</strong>.
                    The red/green impact below is matched directly from the live API day-change percentage.
                  </p>
                </div>
                <div className={`db-risk-chart ${(riskResult?.liveRupeeImpact ?? 0) < 0 ? 'is-loss' : 'is-gain'}`}>
                  <ResponsiveContainer width="100%" height={200}>
                    <ComposedChart data={riskSeries}>
                      <defs>
                        <linearGradient id={`riskGrad-${riskResult.symbol.replace(/[^a-zA-Z0-9]/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={riskLineColor} stopOpacity={0.35} />
                          <stop offset="100%" stopColor={riskLineColor} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="t" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={(v) => `₹${Math.round(v / 1000)}k`} stroke="#94a3b8" />
                      <Tooltip formatter={(v) => formatINR(v)} />
                      <Area type="monotone" dataKey="value" stroke="none" fill={`url(#riskGrad-${riskResult.symbol.replace(/[^a-zA-Z0-9]/g, '')})`} />
                      <Line type="monotone" dataKey="value" stroke={riskLineColor} strokeWidth={2.8} dot={false} activeDot={{ r: 4, fill: riskLineColor }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
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
                </div>
              </>
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
                <span>Portfolio AI</span>
              </div>
              <button onClick={() => setChatOpen(false)} aria-label="Close AI chat"><X size={18} /></button>
            </div>

            <div className="db-chat-messages">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`db-chat-message ${msg.role}`}>
                  {msg.text}
                </div>
              ))}
            </div>

            <form onSubmit={handleSendMessage} className="db-chat-input">
              <input 
                type="text" 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ask anything about investing..."
              />
              <button type="submit">Send</button>
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
    </div>
  );
}

export default Dashboard;

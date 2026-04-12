const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

/** User-scoped client so RLS applies when loading `user_profiles` for /chat. */
function supabaseForUserJwt(accessToken) {
  if (!accessToken || typeof accessToken !== 'string') return null;
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

/**
 * @param {Record<string, unknown> | null | undefined} profile
 */
function compactProfileForPrompt(profile) {
  if (!profile || typeof profile !== 'object') return {};
  const prefs =
    profile.dashboard_prefs && typeof profile.dashboard_prefs === 'object' && !Array.isArray(profile.dashboard_prefs)
      ? profile.dashboard_prefs
      : {};
  const assessment = prefs.assessment && typeof prefs.assessment === 'object' ? prefs.assessment : null;
  const traits = assessment?.traits && typeof assessment.traits === 'object' ? assessment.traits : null;
  return {
    display_name: profile.display_name || '',
    email: profile.email || '',
    fear_score: profile.fear_score ?? null,
    classification: profile.classification || '',
    assessment_completed_at: assessment?.completedAt || null,
    cluster_label: assessment?.clusterLabel || '',
    suitability: assessment?.suitability || null,
    allocation: assessment?.allocation || null,
    quiz_answers: assessment?.answers || null,
  };
}

const AV_BASE = 'https://www.alphavantage.co/query';

const TICKER_STOPWORDS = new Set([
  'THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 'CAN', 'HER', 'WAS', 'ONE', 'OUR', 'OUT', 'DAY', 'GET',
  'HAS', 'HIM', 'HIS', 'HOW', 'ITS', 'MAY', 'NEW', 'NOW', 'OLD', 'SEE', 'TWO', 'WHO', 'BOY', 'DID', 'LET', 'PUT',
  'SAY', 'SHE', 'TOO', 'USE', 'THAT', 'THIS', 'WITH', 'HAVE', 'FROM', 'WHAT', 'WHEN', 'YOUR', 'WILL', 'JUST', 'LIKE',
  'BEEN', 'ALSO', 'BACK', 'THAN', 'THEN', 'HERE', 'SOME', 'VERY', 'WHY', 'HELP', 'EACH', 'MOST', 'MORE', 'ONLY',
  'OVER', 'SUCH', 'READ', 'TELL', 'WELL', 'WORK', 'YEAR', 'CAME', 'COME', 'EVEN', 'GOOD', 'JUST', 'KEEP', 'LAST',
  'LONG', 'LOOK', 'MADE', 'MAKE', 'MANY', 'MUCH', 'MUST', 'NEED', 'NEXT', 'OPEN', 'PART', 'SEEM', 'SHOW', 'STAY',
  'STOP', 'SURE', 'TAKE', 'THEM', 'THEY', 'TIME', 'VERY', 'WANT', 'WAYS', 'WENT', 'WERE', 'WHAT', 'WHEN', 'WITH',
]);

function alphaVantageKey() {
  return String(process.env.ALPHA_VANTAGE_KEY || process.env.ALPHA_VANTAGE_API_KEY || '').trim();
}

/**
 * @param {string} text
 * @returns {string[]}
 */
function extractTickerCandidates(text) {
  const upper = String(text || '').toUpperCase();
  const raw = upper.match(/\$?[A-Z][A-Z0-9]{0,4}\b/g) || [];
  const out = [];
  for (const t of raw) {
    const s = t.replace(/^\$/, '');
    if (s.length >= 2 && s.length <= 5 && !TICKER_STOPWORDS.has(s)) out.push(s);
  }
  return [...new Set(out)].slice(0, 3);
}

/**
 * @param {string} symbol
 * @returns {Promise<{ symbol: string; price: string; change: string; changePercent: string } | null>}
 */
async function fetchAlphaVantageGlobalQuote(symbol) {
  const key = alphaVantageKey();
  if (!key) return null;
  const sym = String(symbol || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9.-]/g, '');
  if (!sym || sym.length > 12) return null;
  const url = `${AV_BASE}?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(sym)}&apikey=${encodeURIComponent(key)}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = await res.json();
  if (json.Note || json.Information) return null;
  const q = json['Global Quote'];
  if (!q || !q['05. price']) return null;
  return {
    symbol: String(q['01. symbol'] || sym),
    price: String(q['05. price']),
    change: String(q['09. change'] ?? ''),
    changePercent: String(q['10. change percent'] ?? ''),
  };
}

/**
 * @param {string} userMessage
 * @returns {Promise<string>}
 */
async function buildAlphaVantageContext(userMessage) {
  const key = alphaVantageKey();
  if (!key) return '';
  const candidates = extractTickerCandidates(userMessage);
  const lines = [];
  for (const sym of candidates) {
    if (lines.length >= 2) break;
    const q = await fetchAlphaVantageGlobalQuote(sym);
    if (q) {
      lines.push(`${q.symbol}: ~$${q.price} (chg ${q.change}, ${q.changePercent} — Alpha Vantage, delayed)`);
    }
  }
  return lines.length ? lines.join('\n') : '';
}

/**
 * @param {{ role: string; content: string }[]} messages
 */
async function callOllama(messages) {
  const base = String(process.env.OLLAMA_HOST || 'http://127.0.0.1:11434').replace(/\/$/, '');
  const model = String(process.env.OLLAMA_MODEL || 'llama3.2').trim();
  if (!model) {
    return { text: '', error: 'Set OLLAMA_MODEL in BACKEND/.env (e.g. llama3.2).' };
  }
  const url = `${base}/api/chat`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        options: { temperature: 0.65, num_predict: 1024 },
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return { text: '', error: `Ollama returned ${res.status}. ${errText.slice(0, 200)}` };
    }
    const data = await res.json();
    const text = String(data?.message?.content ?? '').trim();
    return { text, error: text ? '' : 'Empty model response from Ollama.' };
  } catch (e) {
    const msg = e && typeof e === 'object' && 'message' in e ? String(e.message) : String(e);
    return {
      text: '',
      error: `Could not reach Ollama at ${url}. Run \`ollama serve\` and \`ollama pull ${model}\`. (${msg})`,
    };
  }
}

/**
 * POST /chat — portfolio explainer (see Finvest/BACKEND/script.js for the same contract).
 * Body: { message, userType?, access_token?, history?: { role: 'user'|'model', text }[] }
 */
app.post('/chat', async (req, res) => {
  try {
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    if (!message) {
      res.status(400).json({ reply: '', error: 'message is required' });
      return;
    }

    const accessToken = typeof req.body?.access_token === 'string' ? req.body.access_token.trim() : '';
    const userType = typeof req.body?.userType === 'string' ? req.body.userType : 'signed_in';
    const rawHistory = Array.isArray(req.body?.history) ? req.body.history : [];

    let profileContext = {};
    const sb = supabaseForUserJwt(accessToken);
    if (sb) {
      const { data: userData, error: userErr } = await sb.auth.getUser();
      if (!userErr && userData?.user?.id) {
        const { data: profile } = await sb.from('user_profiles').select('*').eq('user_id', userData.user.id).maybeSingle();
        profileContext = compactProfileForPrompt(profile);
      }
    }

    const systemParts = [
      'You are Finvest “Decode Your Finance Self”: explain investing and portfolio ideas in clear, friendly language (teen-friendly when helpful).',
      'Do not claim real-time market prices unless given in the conversation. No personalized investment advice as a fiduciary — stay educational.',
      `Client hint userType: ${userType}.`,
    ];
    if (Object.keys(profileContext).length) {
      systemParts.push(`User profile (from their account; use name and traits naturally, do not dump raw JSON):\n${JSON.stringify(profileContext, null, 2)}`);
    } else {
      systemParts.push('No signed-in profile was loaded; answer generically unless the user shares details.');
    }

    const avContext = await buildAlphaVantageContext(message);
    if (avContext) {
      systemParts.push(
        'Reference prices below are from Alpha Vantage (delayed). Use only as educational context; never as a trade signal.\n' +
          avContext
      );
    }

    const systemContent = systemParts.join('\n\n');
    const messages = [{ role: 'system', content: systemContent }];

    for (const turn of rawHistory) {
      const role = turn?.role === 'model' || turn?.role === 'ai' ? 'assistant' : 'user';
      const text = typeof turn?.text === 'string' ? turn.text : '';
      if (!text) continue;
      messages.push({ role, content: text });
    }
    if (messages.length > 1 && messages[1].role === 'assistant') {
      messages.splice(1, 0, { role: 'user', content: 'Hi — continuing our Finvest portfolio chat.' });
    }
    messages.push({ role: 'user', content: message });

    const { text, error } = await callOllama(messages);
    if (error && !text) {
      res.status(503).json({ reply: error });
      return;
    }
    res.json({ reply: text || 'Sorry, I could not generate a reply. Try again in a moment.' });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ reply: 'Something went wrong. Please try again.' });
  }
});

const fearScore = require('../../ML/BehaviorAnalysis/fearScore');
const userClassification = require('../../ML/BehaviorAnalysis/userClassification');
const portfolioGenerator = require('../../ML/PortfolioLogic/portfolioGenerator');
const monteCarlo = require('../../ML/SimulationEngine/monteCarlo');
const scenarioSimulator = require('../../ML/SimulationEngine/scenarioSimulator');

app.post('/api/analyze-user', async (req, res) => {
  try {
    const { answers, hesitationTimes, demographics } = req.body;
    
    const score = fearScore.calculateFearScore({ answers, hesitationTimes, demographics });
    const classification = userClassification.classifyUser(score, answers);
    const portfolio = portfolioGenerator.generatePortfolio(score, classification, demographics);
    
    res.json({
      fearScore: score,
      classification,
      portfolio,
      insights: {
        riskProfile: classification.category,
        recommendedStrategy: classification.strategy,
        allocation: portfolio.allocation
      }
    });
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: 'Analysis failed' });
  }
});

app.post('/api/monte-carlo', async (req, res) => {
  try {
    const { portfolio, years = 30, simulations = 1000 } = req.body;
    const results = monteCarlo.runSimulation(portfolio, { years, simulations });
    res.json(results);
  } catch (error) {
    console.error('Monte Carlo error:', error);
    res.status(500).json({ error: 'Simulation failed' });
  }
});

app.post('/api/scenario-test', async (req, res) => {
  try {
    const { portfolio, scenario } = req.body;
    const results = scenarioSimulator.runScenario(portfolio, scenario);
    res.json(results);
  } catch (error) {
    console.error('Scenario test error:', error);
    res.status(500).json({ error: 'Scenario test failed' });
  }
});

app.get('/api/scenarios', (req, res) => {
  res.json(scenarioSimulator.getAvailableScenarios());
});

app.post('/api/save-profile', async (req, res) => {
  try {
    const { userId, profile } = req.body;
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert({ user_id: userId, ...profile, updated_at: new Date().toISOString() });
    
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    console.error('Save profile error:', error);
    res.status(500).json({ error: 'Failed to save profile' });
  }
});

app.get('/api/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/** Proxy Yahoo chart JSON (no browser CORS). Optional for production when VITE_BACKEND_URL is set. */
app.get('/api/market/yahoo-chart', async (req, res) => {
  try {
    const symbol = String(req.query.symbol || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9.-]/g, '');
    const range = String(req.query.range || '1y')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 12) || '1y';
    const interval = String(req.query.interval || '1d')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 12) || '1d';
    if (!symbol) {
      res.status(400).json({ error: 'symbol required' });
      return;
    }
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${encodeURIComponent(range)}&interval=${encodeURIComponent(interval)}`;
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
    res.json(json);
  } catch (error) {
    console.error('Yahoo chart proxy error:', error);
    res.status(500).json({ error: 'chart proxy failed' });
  }
});

app.listen(PORT, () => {
  console.log(`FINVEST API server running on port ${PORT}`);
});

module.exports = app;

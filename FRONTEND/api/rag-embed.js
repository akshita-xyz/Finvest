/**
 * POST /api/rag-embed
 * Body: { texts: string[] }
 * Returns: { embeddings: number[][], model, dim }
 *
 * Uses Gemini text-embedding-004 on the server so the API key stays secret.
 * GEMINI_API_KEY / GOOGLE_AI_API_KEY / VITE_GEMINI_API_KEY are all accepted (matching llmChat.js).
 */

/**
 * Candidate embedding configs tried in order until one returns a vector.
 * Google has moved embedding models around multiple times (embedding-001 →
 * text-embedding-004 → gemini-embedding-001), and older keys sometimes lose
 * access to newer names. We pick whichever one the current API key supports.
 */
const EMBED_CANDIDATES = [
  { model: 'gemini-embedding-001', apiVersion: 'v1beta' },
  { model: 'text-embedding-004', apiVersion: 'v1beta' },
  { model: 'text-embedding-004', apiVersion: 'v1' },
  { model: 'embedding-001', apiVersion: 'v1beta' },
];

const MAX_TEXTS_PER_REQUEST = 64;
const MAX_CHARS_PER_TEXT = 8000;

function geminiApiKey() {
  return String(
    process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_AI_API_KEY ||
      process.env.VITE_GEMINI_API_KEY ||
      ''
  ).trim();
}

function preferredEmbedModelOverride() {
  const name = String(process.env.GEMINI_EMBED_MODEL || '').trim();
  return name || '';
}

async function readJsonBody(req) {
  if (Buffer.isBuffer(req.body)) {
    try {
      return JSON.parse(req.body.toString('utf8'));
    } catch {
      return {};
    }
  }
  if (req.body != null && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body;
  }
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function embedWithConfig(text, key, config) {
  const { model, apiVersion } = config;
  const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${encodeURIComponent(
    model
  )}:embedContent?key=${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: `models/${model}`,
      content: { parts: [{ text }] },
    }),
  });
  const raw = await res.text();
  if (!res.ok) {
    const snippet = raw.slice(0, 280);
    const err = new Error(`Gemini embed ${res.status} (${apiVersion}/${model}): ${snippet}`);
    err.status = res.status;
    err.raw = raw;
    throw err;
  }
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error('Invalid JSON from Gemini embed.');
  }
  const values = data?.embedding?.values;
  if (!Array.isArray(values) || !values.length) {
    throw new Error('Gemini embed returned no vector.');
  }
  return values.map((v) => Number(v) || 0);
}

/**
 * First-call resolver: picks the working (model, apiVersion) from EMBED_CANDIDATES
 * by trying each until one returns a vector. Subsequent calls reuse the same config.
 * @returns {Promise<{ model: string, apiVersion: string, embedding: number[] }>}
 */
async function resolveEmbedConfig(sampleText, key) {
  const override = preferredEmbedModelOverride();
  const candidates = override
    ? [{ model: override, apiVersion: 'v1beta' }, { model: override, apiVersion: 'v1' }, ...EMBED_CANDIDATES]
    : EMBED_CANDIDATES;

  const failures = [];
  for (const cfg of candidates) {
    try {
      const embedding = await embedWithConfig(sampleText, key, cfg);
      return { ...cfg, embedding };
    } catch (err) {
      const msg = err && typeof err === 'object' && 'message' in err ? String(err.message) : String(err);
      failures.push(msg);
      const status = err?.status;
      // Retry only on 404/400-style "model not found" errors; re-throw auth/quota errors immediately
      if (status && status !== 404 && status !== 400) {
        throw err;
      }
    }
  }
  throw new Error(
    `No Gemini embedding model worked with this API key. Tried: ${candidates
      .map((c) => `${c.apiVersion}/${c.model}`)
      .join(', ')}. Last errors: ${failures.slice(-2).join(' | ')}`
  );
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }
  try {
    const key = geminiApiKey();
    if (!key) {
      res.status(503).json({
        error:
          'Embeddings unavailable: set GEMINI_API_KEY (or GOOGLE_AI_API_KEY / VITE_GEMINI_API_KEY) in your env.',
      });
      return;
    }

    const body = await readJsonBody(req);
    const rawTexts = Array.isArray(body?.texts) ? body.texts : [];
    const texts = rawTexts
      .map((t) => (typeof t === 'string' ? t : ''))
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
      .map((t) => (t.length > MAX_CHARS_PER_TEXT ? t.slice(0, MAX_CHARS_PER_TEXT) : t));

    if (!texts.length) {
      res.status(400).json({ error: 'texts array is required and must be non-empty.' });
      return;
    }
    if (texts.length > MAX_TEXTS_PER_REQUEST) {
      res.status(413).json({ error: `Too many texts (max ${MAX_TEXTS_PER_REQUEST} per request).` });
      return;
    }

    // Resolve a working model once using the first text, then parallelize the rest.
    const [firstText, ...restTexts] = texts;
    const resolved = await resolveEmbedConfig(firstText, key);
    const config = { model: resolved.model, apiVersion: resolved.apiVersion };
    const embeddings = new Array(texts.length);
    embeddings[0] = resolved.embedding;

    const CONCURRENCY = 4;
    let cursor = 0;
    async function worker() {
      while (cursor < restTexts.length) {
        const i = cursor;
        cursor += 1;
        embeddings[i + 1] = await embedWithConfig(restTexts[i], key, config);
      }
    }
    const workers = Array.from(
      { length: Math.min(CONCURRENCY, Math.max(1, restTexts.length)) },
      () => worker()
    );
    await Promise.all(workers);

    res.setHeader('Content-Type', 'application/json');
    res.status(200).send(
      JSON.stringify({
        embeddings,
        model: config.model,
        apiVersion: config.apiVersion,
        dim: embeddings[0]?.length || 0,
      })
    );
  } catch (err) {
    const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : String(err);
    console.error('rag-embed error:', message);
    res.status(500).json({ error: message });
  }
}

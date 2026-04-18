/**
 * POST /api/rag-chat
 * Body: { question: string, context: { text: string, score?: number }[], history?: { role, text }[] }
 * Returns: { reply: string }
 *
 * Uses the shared Groq/Gemini helper (_lib/llmChat.js) with a contract-review
 * system prompt that enforces risk tagging: ⚠️ Risk, 💰 Cost, ⏳ Deadline, 🔒 Restriction.
 */

import { generateChatReply } from './_lib/llmChat.js';

const MAX_CONTEXT_CHARS = 12000;
const MAX_HISTORY_TURNS = 6;

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

function buildContextBlock(context) {
  if (!Array.isArray(context) || !context.length) return '';
  const parts = [];
  let budget = MAX_CONTEXT_CHARS;
  for (let i = 0; i < context.length; i += 1) {
    const raw = context[i];
    const text = typeof raw?.text === 'string' ? raw.text.trim() : '';
    if (!text) continue;
    const score = Number.isFinite(raw?.score) ? ` (relevance ${Number(raw.score).toFixed(2)})` : '';
    const header = `--- Excerpt ${i + 1}${score} ---`;
    const body = text.length > budget ? text.slice(0, Math.max(0, budget)) : text;
    if (!body) break;
    parts.push(`${header}\n${body}`);
    budget -= body.length + header.length + 2;
    if (budget <= 0) break;
  }
  return parts.join('\n\n');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const question = typeof body?.question === 'string' ? body.question.trim() : '';
    if (!question) {
      res.status(400).json({ error: 'question is required' });
      return;
    }

    const contextBlock = buildContextBlock(body?.context);

    const system = [
      'You are Finvest Contract AI — a careful financial advisor who reviews contracts for an everyday user.',
      'Your job on every question:',
      '1. Answer the user\'s question clearly in plain English.',
      '2. Quote or paraphrase the specific clauses you used (keep quotes short).',
      '3. Highlight anything that could negatively affect the user.',
      '4. Tag each finding with exactly one of these emoji labels at the start of the bullet:',
      '     ⚠️ Risk         — hidden penalties, liability, ambiguity, fine print',
      '     💰 Cost         — fees, interest, charges, rate changes',
      '     ⏳ Deadline     — time limits, notice periods, expiry dates',
      '     🔒 Restriction  — limits, lock-ins, non-compete, auto-renewal',
      '5. Prefer short bullet lists and simple words (teen-friendly). Never invent clauses that are not in the context.',
      '6. If the context does not answer the question, say so honestly and suggest what clause to look for.',
      '7. End with a one-line "Bottom line:" takeaway.',
      'Do not claim to provide legal advice; you are an educational assistant.',
    ].join('\n');

    const contextMessage = contextBlock
      ? `Relevant contract excerpts retrieved for this question:\n\n${contextBlock}\n\n(These are the only passages you may rely on.)`
      : 'No contract excerpts were retrieved for this question — tell the user to upload a contract or rephrase, and do not guess clauses.';

    const rawHistory = Array.isArray(body?.history) ? body.history.slice(-MAX_HISTORY_TURNS * 2) : [];
    const historyMessages = [];
    for (const turn of rawHistory) {
      const role = turn?.role === 'model' || turn?.role === 'ai' || turn?.role === 'assistant' ? 'assistant' : 'user';
      const text = typeof turn?.text === 'string' ? turn.text.trim() : '';
      if (!text) continue;
      historyMessages.push({ role, content: text });
    }

    const messages = [
      { role: 'system', content: system },
      { role: 'user', content: contextMessage },
      { role: 'assistant', content: 'Understood. I will only use these excerpts and tag findings with ⚠️ 💰 ⏳ 🔒.' },
      ...historyMessages,
      { role: 'user', content: question },
    ];

    const { text, error } = await generateChatReply(messages);
    if (error && !text) {
      res.status(503).json({ reply: '', error });
      return;
    }
    res.setHeader('Content-Type', 'application/json');
    res.status(200).send(
      JSON.stringify({ reply: text || 'Sorry, I could not analyze the contract just now. Please try again.' })
    );
  } catch (err) {
    const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : String(err);
    console.error('rag-chat error:', message);
    res.status(500).json({ error: message });
  }
}

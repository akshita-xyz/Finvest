/**
 * Vercel Serverless: POST /api/chat — same contract as BACKEND POST /chat.
 * Body: { message, userType?, access_token?, history?: { role: 'user'|'model'|'ai', text }[] }
 */
import { generateChatReply } from './_lib/llmChat.js';
import {
  supabaseForUserJwt,
  compactProfileForPrompt,
  buildAlphaVantageContext,
} from './_lib/chatHelpers.js';

/**
 * @param {import('http').IncomingMessage} req
 * @returns {Promise<Record<string, unknown>>}
 */
async function readJsonBody(req) {
  if (req.body != null && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return /** @type {Record<string, unknown>} */ (req.body);
  }
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ reply: '', error: 'method not allowed' });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (!message) {
      res.status(400).json({ reply: '', error: 'message is required' });
      return;
    }

    const accessToken = typeof body.access_token === 'string' ? body.access_token.trim() : '';
    const userType = typeof body.userType === 'string' ? body.userType : 'signed_in';
    const rawHistory = Array.isArray(body.history) ? body.history : [];

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
      'Do not claim real-time market prices unless given in the conversation. No personalized investment advice as a fiduciary; stay educational.',
      `Client hint userType: ${userType}.`,
    ];
    if (Object.keys(profileContext).length) {
      systemParts.push(
        `User profile (from their account; use name and traits naturally, do not dump raw JSON):\n${JSON.stringify(profileContext, null, 2)}`
      );
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
      messages.splice(1, 0, { role: 'user', content: 'Hi, continuing our Finvest portfolio chat.' });
    }
    messages.push({ role: 'user', content: message });

    const { text, error } = await generateChatReply(messages);
    if (error && !text) {
      res.status(503).json({ reply: error });
      return;
    }
    res.setHeader('Content-Type', 'application/json');
    res.status(200).send(JSON.stringify({ reply: text || 'Sorry, I could not generate a reply. Try again in a moment.' }));
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ reply: 'Something went wrong. Please try again.' });
  }
}

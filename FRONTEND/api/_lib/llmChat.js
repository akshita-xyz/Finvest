/**
 * Decode Your Finance Self chat: Groq (OpenAI-compatible) or Google Gemini.
 * Server-side only (Vercel serverless). Env: GROQ_API_KEY, GEMINI_API_KEY, LLM_PROVIDER, etc.
 */

function geminiApiKey() {
  return String(
    process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_AI_API_KEY ||
      process.env.VITE_GEMINI_API_KEY ||
      ''
  ).trim();
}

function geminiModelId() {
  return String(process.env.GEMINI_CHAT_MODEL || 'gemini-2.0-flash').trim() || 'gemini-2.0-flash';
}

function groqApiKey() {
  return String(process.env.GROQ_API_KEY || '').trim();
}

function groqModelId() {
  return String(process.env.GROQ_MODEL || 'llama-3.3-70b-versatile').trim() || 'llama-3.3-70b-versatile';
}

/** @returns {'gemini' | 'groq' | 'none'} */
export function resolveProvider() {
  const explicit = String(process.env.LLM_PROVIDER || 'auto').toLowerCase().trim();
  if (explicit === 'gemini') return 'gemini';
  if (explicit === 'groq') return 'groq';
  if (explicit !== 'auto') return 'none';
  if (groqApiKey()) return 'groq';
  if (geminiApiKey()) return 'gemini';
  return 'none';
}

/** @param {{ role: string, content: string }[]} messages */
function toGeminiPayload(messages) {
  const systemParts = [];
  const contents = [];
  for (const m of messages) {
    if (!m || typeof m.content !== 'string' || !m.content) continue;
    if (m.role === 'system') {
      systemParts.push(m.content);
      continue;
    }
    const role = m.role === 'assistant' ? 'model' : 'user';
    contents.push({ role, parts: [{ text: m.content }] });
  }
  const systemInstruction =
    systemParts.length > 0 ? { parts: [{ text: systemParts.join('\n\n') }] } : undefined;
  return { systemInstruction, contents };
}

/** @param {{ role: string, content: string }[]} messages */
async function callGemini(messages) {
  const key = geminiApiKey();
  if (!key) {
    return {
      text: '',
      error:
        'Set GEMINI_API_KEY (or GOOGLE_AI_API_KEY) in Vercel env, or use Groq with GROQ_API_KEY and LLM_PROVIDER=groq.',
    };
  }
  const { systemInstruction, contents } = toGeminiPayload(messages);
  if (!contents.length) {
    return { text: '', error: 'No chat messages to send to Gemini.' };
  }

  const model = geminiModelId();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;

  const body = {
    contents,
    generationConfig: { temperature: 0.65, maxOutputTokens: 1024 },
  };
  if (systemInstruction) body.systemInstruction = systemInstruction;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const raw = await res.text();
    if (!res.ok) {
      return {
        text: '',
        error: `Gemini returned ${res.status}. ${raw.slice(0, 280)}`,
      };
    }
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return { text: '', error: 'Invalid JSON from Gemini.' };
    }
    const text = String(data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '').trim();
    const block = data?.candidates?.[0]?.finishReason;
    if (!text) {
      return {
        text: '',
        error: `Empty Gemini reply${block ? ` (finish: ${block})` : ''}. Check API key and model id.`,
      };
    }
    return { text, error: '' };
  } catch (e) {
    const msg = e && typeof e === 'object' && 'message' in e ? String(e.message) : String(e);
    return { text: '', error: `Gemini request failed: ${msg}` };
  }
}

/** @param {{ role: string, content: string }[]} messages */
async function callGroq(messages) {
  const key = groqApiKey();
  if (!key) {
    return {
      text: '',
      error:
        'Set GROQ_API_KEY in Vercel project env (https://console.groq.com/keys). Optional: GROQ_MODEL (default llama-3.3-70b-versatile).',
    };
  }
  const model = groqModelId();
  const apiMessages = messages.filter(
    (m) =>
      m &&
      typeof m.content === 'string' &&
      m.content &&
      (m.role === 'system' || m.role === 'user' || m.role === 'assistant')
  );
  if (!apiMessages.some((m) => m.role === 'user')) {
    return { text: '', error: 'No user messages to send to Groq.' };
  }

  const url = 'https://api.groq.com/openai/v1/chat/completions';
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        messages: apiMessages,
        temperature: 0.65,
        max_tokens: 1024,
      }),
    });
    const raw = await res.text();
    if (!res.ok) {
      return {
        text: '',
        error: `Groq returned ${res.status}. ${raw.slice(0, 280)}`,
      };
    }
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return { text: '', error: 'Invalid JSON from Groq.' };
    }
    const text = String(data?.choices?.[0]?.message?.content ?? '').trim();
    return { text, error: text ? '' : 'Empty model response from Groq.' };
  } catch (e) {
    const msg = e && typeof e === 'object' && 'message' in e ? String(e.message) : String(e);
    return { text: '', error: `Groq request failed: ${msg}` };
  }
}

/** @param {{ role: string, content: string }[]} messages */
export async function generateChatReply(messages) {
  const provider = resolveProvider();
  if (provider === 'gemini') {
    return callGemini(messages);
  }
  if (provider === 'groq') {
    return callGroq(messages);
  }
  return {
    text: '',
    error:
      'No LLM configured. Set GROQ_API_KEY or GEMINI_API_KEY in Vercel project env. With LLM_PROVIDER=auto, Groq is used if GROQ_API_KEY is set, otherwise Gemini.',
  };
}

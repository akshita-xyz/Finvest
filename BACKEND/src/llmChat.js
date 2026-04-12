/**
 * Decode Your Finance Self /chat: Ollama (local) or Google Gemini (API key — no Ollama install).
 * @see https://ai.google.dev/gemini-api/docs
 */

function geminiApiKey() {
  return String(process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || '').trim();
}

function geminiModelId() {
  return String(process.env.GEMINI_CHAT_MODEL || 'gemini-2.0-flash').trim() || 'gemini-2.0-flash';
}

/**
 * @returns {'gemini' | 'ollama'}
 */
function resolveProvider() {
  const explicit = String(process.env.LLM_PROVIDER || 'auto').toLowerCase().trim();
  if (explicit === 'gemini') return 'gemini';
  if (explicit === 'ollama') return 'ollama';
  if (geminiApiKey()) return 'gemini';
  return 'ollama';
}

/**
 * OpenAI-style messages → Gemini generateContent body.
 * @param {{ role: string, content: string }[]} messages
 */
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

/**
 * @param {{ role: string, content: string }[]} messages
 * @returns {Promise<{ text: string, error: string }>}
 */
async function callGemini(messages) {
  const key = geminiApiKey();
  if (!key) {
    return {
      text: '',
      error:
        'Set GEMINI_API_KEY (or GOOGLE_AI_API_KEY) in BACKEND/.env for cloud chat, or install Ollama and use LLM_PROVIDER=ollama.',
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

/**
 * @param {{ role: string, content: string }[]} messages
 * @returns {Promise<{ text: string, error: string }>}
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
      error: `Could not reach Ollama at ${url}. Run \`ollama serve\` and \`ollama pull ${model}\`, or set GEMINI_API_KEY and LLM_PROVIDER=gemini. (${msg})`,
    };
  }
}

/**
 * @param {{ role: string, content: string }[]} messages
 * @returns {Promise<{ text: string, error: string }>}
 */
async function generateChatReply(messages) {
  const provider = resolveProvider();
  if (provider === 'gemini') {
    return callGemini(messages);
  }
  return callOllama(messages);
}

module.exports = {
  resolveProvider,
  generateChatReply,
  geminiApiKey,
};

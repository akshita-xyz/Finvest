/**
 * @param {string} apiKey
 * @param {string} prompt
 * @returns {Promise<string>}
 */
export async function generateGoalNarrative(apiKey, prompt) {
  if (!apiKey) {
    return '';
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.65, maxOutputTokens: 1024 },
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.warn('Gemini error', err);
    return '';
  }
  const data = await res.json();
  const text =
    data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('\n') || '';
  return text.trim();
}

/**
 * Ask Gemini for mfapi.in search phrases (scheme discovery, not advice).
 * @param {string} apiKey
 * @param {object} context — goals, salary band, horizon, existing scheme names, risk note
 * @returns {Promise<string[]>}
 */
export async function generateMfSuggestionQueries(apiKey, context) {
  if (!apiKey) return [];
  const prompt = `You suggest Indian mutual fund search phrases for mfapi.in (educational; not personal advice).

Context:
${JSON.stringify(context, null, 2)}

Return ONLY valid JSON with this exact shape: {"queries":["phrase1","phrase2",...]}
5–8 short phrases an app would pass to a scheme search (e.g. "nifty 50 index direct growth", "liquid fund", "parag parikh flexi cap"). No markdown fences, no other text.`;

  const raw = await generateGoalNarrative(apiKey, prompt);
  try {
    const cleaned = raw.replace(/```(?:json)?\s*|\s*```/g, '').trim();
    const data = JSON.parse(cleaned);
    return Array.isArray(data.queries) ? data.queries.filter((q) => typeof q === 'string' && q.trim()) : [];
  } catch {
    return [];
  }
}

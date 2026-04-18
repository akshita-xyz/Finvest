import { generateChatReply } from './_lib/llmChat.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }

  const { message } = req.body;
  if (!message) {
    res.status(400).json({ error: 'message is required' });
    return;
  }

  const SYSTEM_PROMPT = `You are a concise AI voice assistant for a finance website called Finvest.
Rules:
- Respond in 1-2 short sentences only.
- Use simple, clear language.
- Focus on finance topics: investments, savings, budgeting, stocks, risk.
- Give actionable advice, not long explanations.
- Avoid long introductions or disclaimers.
- If unsure, ask a short clarification question.
Behavior:
- For stock/investment queries: give quick insight (trend, risk, basic suggestion).
- For budgeting: give a practical tip.
- For general questions: stay brief and helpful.
Tone: Professional, calm, confident.`;

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: message },
  ];

  const { text, error } = await generateChatReply(messages);

  if (error && !text) {
    res.status(503).json({ error });
    return;
  }

  res.status(200).json({ reply: text });
}
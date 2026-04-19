/**
 * POST /api/voice-transcribe
 *
 * Receives a raw audio buffer from the browser (recorded via MediaRecorder)
 * and forwards it to Groq's Whisper transcription endpoint.
 *
 * Request:
 *   Content-Type: audio/webm (or any recorder MIME)
 *   body: raw audio bytes
 *   query/header (optional): model=whisper-large-v3-turbo, language=en
 *
 * Response: { text: string }  or  { error: string }
 *
 * Env:
 *   GROQ_API_KEY (required)
 *   GROQ_STT_MODEL (optional, default "whisper-large-v3-turbo")
 */

export const config = {
  api: {
    bodyParser: false,
  },
};

async function readRawBody(req) {
  if (Buffer.isBuffer(req.body)) return req.body;
  if (req.body && typeof req.body === 'object' && req.body.type === 'Buffer' && Array.isArray(req.body.data)) {
    return Buffer.from(req.body.data);
  }
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

function pickFilename(mime) {
  const m = String(mime || '').toLowerCase();
  if (m.includes('webm')) return 'audio.webm';
  if (m.includes('ogg')) return 'audio.ogg';
  if (m.includes('mp4') || m.includes('m4a')) return 'audio.m4a';
  if (m.includes('mpeg') || m.includes('mp3')) return 'audio.mp3';
  if (m.includes('wav')) return 'audio.wav';
  return 'audio.webm';
}

/** Strip "; codecs=..." params; Groq Whisper prefers the bare MIME. */
function bareMime(mime) {
  const raw = String(mime || '').toLowerCase().split(';')[0].trim();
  if (raw.startsWith('audio/')) return raw;
  return 'audio/webm';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }

  const apiKey = String(process.env.GROQ_API_KEY || '').trim();
  if (!apiKey) {
    res.status(503).json({
      error:
        'GROQ_API_KEY is not configured. Set it in FRONTEND/.env (or Vercel env) to enable voice transcription.',
    });
    return;
  }

  const model = String(process.env.GROQ_STT_MODEL || 'whisper-large-v3-turbo').trim();

  let audioBuffer;
  try {
    audioBuffer = await readRawBody(req);
  } catch (err) {
    res.status(400).json({ error: `Failed to read audio body: ${err?.message || err}` });
    return;
  }

  if (!audioBuffer || audioBuffer.length === 0) {
    res.status(400).json({ error: 'Empty audio body.' });
    return;
  }

  if (audioBuffer.length > 24 * 1024 * 1024) {
    res.status(413).json({ error: 'Audio payload too large (max 24 MB).' });
    return;
  }

  // ~1 KB threshold — anything smaller is silence / a misfired recorder, and Groq returns
  // "could not process file" instead of a useful empty-text response.
  if (audioBuffer.length < 1024) {
    res
      .status(400)
      .json({ error: 'Recording too short to transcribe. Hold the mic for at least half a second.' });
    return;
  }

  const rawCt = req.headers['content-type'] || 'audio/webm';
  const cleanMime = bareMime(rawCt);
  const filename = pickFilename(cleanMime);

  // Node 20+ exposes File globally; fall back to Blob if it's not available for any reason.
  const FileCtor = typeof File !== 'undefined' ? File : null;
  const audioPart = FileCtor
    ? new FileCtor([audioBuffer], filename, { type: cleanMime })
    : new Blob([audioBuffer], { type: cleanMime });

  const form = new FormData();
  form.append('model', model);
  form.append('response_format', 'json');
  form.append('temperature', '0');
  const langHeader = String(req.headers['x-language'] || 'en').trim();
  if (langHeader) form.append('language', langHeader);
  form.append('prompt', 'Finance conversation. Terms like SIP, ETF, PPF, NPS, mutual fund, portfolio, stocks.');
  form.append('file', audioPart, filename);

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: form,
    });

    const raw = await groqRes.text();
    if (!groqRes.ok) {
      res.status(groqRes.status || 502).json({
        error: `Groq STT returned ${groqRes.status}. ${raw.slice(0, 400)}`,
      });
      return;
    }

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      res.status(502).json({ error: 'Invalid JSON from Groq STT.' });
      return;
    }

    const text = String(data?.text ?? '').trim();
    if (!text) {
      res.status(200).json({ text: '', error: 'Empty transcription (no speech detected).' });
      return;
    }

    res.status(200).json({ text });
  } catch (err) {
    const msg = err && typeof err === 'object' && 'message' in err ? String(err.message) : String(err);
    res.status(502).json({ error: `Groq STT request failed: ${msg}` });
  }
}

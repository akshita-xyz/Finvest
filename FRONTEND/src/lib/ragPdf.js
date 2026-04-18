/**
 * Client-side helpers for the RAG-powered contract assistant.
 *
 * Pipeline: PDF -> Text -> Chunks -> (server) Embeddings -> in-memory vector store.
 * Retrieval is a simple cosine-similarity top-k, then chunks + question go to
 * /api/rag-chat which prompts Groq with the "financial advisor" risk template.
 *
 * PDF.js is loaded from jsDelivr at runtime (ESM) so we don't add a new npm dep.
 */

import { apiUrl } from './appBaseUrl.js';

const PDFJS_VERSION = '4.7.76';
const PDFJS_MAIN = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.min.mjs`;
const PDFJS_WORKER = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`;

let pdfjsPromise = null;

/** @returns {Promise<any>} */
function loadPdfJs() {
  if (pdfjsPromise) return pdfjsPromise;
  pdfjsPromise = import(/* @vite-ignore */ PDFJS_MAIN).then((mod) => {
    const lib = mod?.default ?? mod;
    try {
      if (lib?.GlobalWorkerOptions && !lib.GlobalWorkerOptions.workerSrc) {
        lib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
      }
    } catch {
      // non-fatal
    }
    return lib;
  });
  return pdfjsPromise;
}

/**
 * Extract plain text from a PDF File/Blob using pdf.js in the browser.
 * @param {File | Blob} file
 * @param {(progress: { page: number, total: number }) => void} [onProgress]
 * @returns {Promise<string>}
 */
export async function extractPdfText(file, onProgress) {
  if (!file) throw new Error('No file provided.');
  const pdfjs = await loadPdfJs();
  const buf = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: buf });
  const pdf = await loadingTask.promise;
  const total = pdf.numPages;
  const pages = [];
  for (let i = 1; i <= total; i += 1) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const items = Array.isArray(content.items) ? content.items : [];
    const pageText = items
      .map((it) => (typeof it?.str === 'string' ? it.str : ''))
      .join(' ')
      .replace(/\s+\n/g, '\n')
      .replace(/[ \t]{2,}/g, ' ');
    pages.push(pageText);
    if (typeof onProgress === 'function') {
      try {
        onProgress({ page: i, total });
      } catch {
        // ignore listener errors
      }
    }
  }
  try {
    pdf.cleanup?.();
    pdf.destroy?.();
  } catch {
    // ignore
  }
  return pages.join('\n\n').trim();
}

/**
 * LangChain-style RecursiveCharacterTextSplitter (approximate).
 * Splits on paragraphs -> lines -> sentences -> spaces until under chunk_size,
 * then stitches neighbors with `overlap` character carryover.
 *
 * @param {string} text
 * @param {{ chunkSize?: number, overlap?: number }} [opts]
 * @returns {string[]}
 */
export function splitText(text, opts = {}) {
  const chunkSize = Number.isFinite(opts.chunkSize) ? Math.max(120, Number(opts.chunkSize)) : 500;
  const overlap = Number.isFinite(opts.overlap)
    ? Math.max(0, Math.min(chunkSize - 20, Number(opts.overlap)))
    : 100;
  const cleaned = String(text || '').replace(/\r\n/g, '\n').replace(/\u00a0/g, ' ').trim();
  if (!cleaned) return [];

  const separators = ['\n\n', '\n', '. ', '? ', '! ', '; ', ', ', ' '];

  const splitBy = (str, sep) => {
    if (!sep) return [str];
    const parts = str.split(sep);
    return parts.map((p, i) => (i < parts.length - 1 ? p + sep : p));
  };

  /** @param {string} str @param {number} sepIdx @returns {string[]} */
  const recurse = (str, sepIdx) => {
    if (str.length <= chunkSize) return [str];
    if (sepIdx >= separators.length) {
      const out = [];
      for (let i = 0; i < str.length; i += chunkSize) {
        out.push(str.slice(i, i + chunkSize));
      }
      return out;
    }
    const pieces = splitBy(str, separators[sepIdx]);
    const out = [];
    for (const p of pieces) {
      if (p.length <= chunkSize) out.push(p);
      else out.push(...recurse(p, sepIdx + 1));
    }
    return out;
  };

  const atoms = recurse(cleaned, 0).filter((s) => s.trim().length > 0);

  const chunks = [];
  let current = '';
  for (const atom of atoms) {
    if (!current) {
      current = atom;
      continue;
    }
    if (current.length + atom.length <= chunkSize) {
      current += atom;
      continue;
    }
    chunks.push(current.trim());
    if (overlap > 0 && current.length > overlap) {
      const tail = current.slice(current.length - overlap);
      current = tail + atom;
    } else {
      current = atom;
    }
  }
  if (current.trim()) chunks.push(current.trim());

  return chunks
    .map((c) => c.replace(/[ \t]{2,}/g, ' ').trim())
    .filter((c) => c.length > 20);
}

/**
 * POST /api/rag-embed
 * @param {string[]} texts
 * @returns {Promise<number[][]>}
 */
export async function embedTexts(texts) {
  const payload = Array.isArray(texts) ? texts.filter((t) => typeof t === 'string' && t.trim()) : [];
  if (!payload.length) return [];
  const res = await fetch(apiUrl('/api/rag-embed'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texts: payload }),
  });
  const raw = await res.text();
  let data;
  try {
    data = JSON.parse(raw || '{}');
  } catch {
    throw new Error('Invalid JSON from /api/rag-embed.');
  }
  if (!res.ok) {
    throw new Error(data?.error || `Embed request failed (${res.status}).`);
  }
  const embeddings = Array.isArray(data.embeddings) ? data.embeddings : [];
  if (embeddings.length !== payload.length) {
    throw new Error(`Embedding count mismatch: expected ${payload.length}, got ${embeddings.length}.`);
  }
  return embeddings;
}

/**
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number}
 */
export function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    const x = Number(a[i]) || 0;
    const y = Number(b[i]) || 0;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/**
 * Retrieve the top-k chunks whose stored embedding is closest to `queryEmbedding`.
 * @param {{ text: string, embedding: number[] }[]} store
 * @param {number[]} queryEmbedding
 * @param {number} [k]
 * @returns {{ text: string, score: number, index: number }[]}
 */
export function retrieveTopK(store, queryEmbedding, k = 4) {
  if (!Array.isArray(store) || !store.length) return [];
  if (!Array.isArray(queryEmbedding) || !queryEmbedding.length) return [];
  const scored = store.map((item, index) => ({
    text: String(item?.text ?? ''),
    score: cosineSimilarity(queryEmbedding, item?.embedding ?? []),
    index,
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, Math.max(1, Number(k) || 4));
}

/**
 * POST /api/rag-chat — Groq answers with risk tagging based on retrieved chunks.
 * @param {{ question: string, context: { text: string, score?: number }[], history?: { role: string, text: string }[] }} args
 * @returns {Promise<string>}
 */
export async function askContract({ question, context, history }) {
  const res = await fetch(apiUrl('/api/rag-chat'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question: String(question || '').trim(),
      context: Array.isArray(context) ? context : [],
      history: Array.isArray(history) ? history : [],
    }),
  });
  const raw = await res.text();
  let data;
  try {
    data = JSON.parse(raw || '{}');
  } catch {
    throw new Error('Invalid JSON from /api/rag-chat.');
  }
  if (!res.ok) {
    throw new Error(data?.error || data?.reply || `Chat request failed (${res.status}).`);
  }
  return String(data.reply || '').trim();
}

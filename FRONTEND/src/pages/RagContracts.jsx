import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Upload, Send, Trash2, Sparkles, Home, LayoutDashboard } from 'lucide-react';
import {
  extractPdfText,
  splitText,
  embedTexts,
  retrieveTopK,
  askContract,
} from '../lib/ragPdf.js';
import '../styles/rag-contracts.css';

const SAMPLE_QUESTIONS = [
  'Summarize the contract and list the biggest risks for me.',
  'What fees, interest rates, or charges am I agreeing to?',
  'Are there any deadlines, notice periods, or auto-renewal clauses?',
  'What happens if I want to cancel or exit early?',
  'Are there any restrictions on how I can use the product/service?',
];

const TAG_REGEX = /(⚠️|💰|⏳|🔒)\s*(Risk|Cost|Deadline|Restriction)?/g;

function humanFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

/**
 * Render an AI reply with risk-emoji tags highlighted.
 * The LLM produces plain text with ⚠️ 💰 ⏳ 🔒 tags; we wrap them for styling.
 */
function renderTaggedText(text) {
  if (!text) return null;
  const out = [];
  const src = String(text);
  let cursor = 0;
  const regex = new RegExp(TAG_REGEX.source, 'g');
  let match = regex.exec(src);
  let key = 0;
  while (match) {
    const start = match.index;
    if (start > cursor) out.push(src.slice(cursor, start));
    const symbol = match[1];
    const label = match[2] || (
      symbol === '⚠️' ? 'Risk' : symbol === '💰' ? 'Cost' : symbol === '⏳' ? 'Deadline' : 'Restriction'
    );
    const variant =
      symbol === '⚠️'
        ? 'risk'
        : symbol === '💰'
        ? 'cost'
        : symbol === '⏳'
        ? 'deadline'
        : 'restriction';
    out.push(
      <span key={`t-${key}`} className={`rag-tag rag-tag--${variant}`}>
        {symbol} {label}
      </span>
    );
    cursor = start + match[0].length;
    key += 1;
    match = regex.exec(src);
  }
  if (cursor < src.length) out.push(src.slice(cursor));
  return out;
}

function WelcomeMessage() {
  return (
    <div className="rag-empty">
      <div>
        <div className="rag-empty__icon" aria-hidden>
          <FileText size={28} />
        </div>
        <h3>Upload a contract to get started</h3>
        <p>
          Drop any PDF like a loan agreement, rental lease, insurance policy, or terms of service.
          Finvest will read every page, retrieve the most relevant clauses for your question,
          and flag anything risky, costly, time-bound, or restrictive.
        </p>
      </div>
    </div>
  );
}

function StatusBadge({ state }) {
  if (!state) return null;
  const variantCls =
    state.kind === 'ok' ? 'rag-status rag-status--ok' :
    state.kind === 'warn' ? 'rag-status rag-status--warn' :
    state.kind === 'err' ? 'rag-status rag-status--err' : 'rag-status';
  return (
    <div className={variantCls} role={state.kind === 'err' ? 'alert' : 'status'}>
      {state.busy ? <div className="rag-spinner" aria-hidden /> : null}
      <div style={{ flex: 1 }}>
        <div>{state.message}</div>
        {Number.isFinite(state.progress) && state.progress >= 0 ? (
          <div className="rag-progress" aria-hidden>
            <div
              className="rag-progress__bar"
              style={{ width: `${Math.min(100, Math.max(0, state.progress))}%` }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function RagContracts() {
  const [file, setFile] = useState(/** @type {File | null} */ (null));
  const [text, setText] = useState('');
  const [chunks, setChunks] = useState(/** @type {string[]} */ ([]));
  const [store, setStore] = useState(/** @type {{ text: string, embedding: number[] }[]} */ ([]));
  const [status, setStatus] = useState(/** @type {{ kind: string, message: string, busy?: boolean, progress?: number } | null} */ (null));
  const [isDragging, setIsDragging] = useState(false);
  const [messages, setMessages] = useState(/** @type {{ role: 'user'|'ai'|'system', text: string, sources?: { text: string, score: number }[] }[]} */ ([]));
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef(/** @type {HTMLInputElement | null} */ (null));
  const messagesEndRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const textAreaRef = useRef(/** @type {HTMLTextAreaElement | null} */ (null));

  const canChat = store.length > 0;

  const stats = useMemo(
    () => ({
      pages: null, // filled during extraction if needed later
      words: text ? text.trim().split(/\s+/).filter(Boolean).length : 0,
      chunks: chunks.length,
      ready: store.length,
    }),
    [text, chunks, store]
  );

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, sending]);

  useEffect(() => {
    const ta = textAreaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 180)}px`;
  }, [inputText]);

  const processFile = useCallback(async (selected) => {
    if (!selected) return;
    const isPdf =
      selected.type === 'application/pdf' || /\.pdf$/i.test(selected.name || '');
    if (!isPdf) {
      setStatus({ kind: 'err', message: 'Only PDF files are supported right now.' });
      return;
    }
    setFile(selected);
    setText('');
    setChunks([]);
    setStore([]);
    setMessages([]);

    try {
      setStatus({ kind: 'info', busy: true, message: `Extracting text from ${selected.name}…`, progress: 0 });
      const extracted = await extractPdfText(selected, ({ page, total }) => {
        setStatus({
          kind: 'info',
          busy: true,
          message: `Reading page ${page} of ${total}…`,
          progress: total ? (page / total) * 50 : 0,
        });
      });
      if (!extracted.trim()) {
        setStatus({
          kind: 'warn',
          message: 'This PDF looks like it contains only scanned images (no selectable text). Try a text-based PDF.',
        });
        return;
      }
      setText(extracted);

      setStatus({ kind: 'info', busy: true, message: 'Analyzing the contract…', progress: 55 });
      const split = splitText(extracted, { chunkSize: 500, overlap: 100 });
      if (!split.length) {
        setStatus({ kind: 'err', message: 'Could not split the contract into chunks.' });
        return;
      }
      setChunks(split);

      setStatus({
        kind: 'info',
        busy: true,
        message: 'Indexing the contract for fast lookup…',
        progress: 70,
      });
      const embeddings = await embedTexts(split);
      const nextStore = split.map((t, i) => ({ text: t, embedding: embeddings[i] || [] }));
      setStore(nextStore);
      setStatus({
        kind: 'ok',
        message: `Ready. Ask me anything about ${selected.name}.`,
      });
      setMessages([
        {
          role: 'system',
          text: `${selected.name} is ready. Ask any question about the contract.`,
        },
      ]);
    } catch (err) {
      const msg = err && typeof err === 'object' && 'message' in err ? String(err.message) : String(err);
      setStatus({ kind: 'err', message: `Could not process the contract: ${msg}` });
    }
  }, []);

  const onFileInputChange = useCallback(
    (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) processFile(f);
      if (e.target) e.target.value = '';
    },
    [processFile]
  );

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const f = e.dataTransfer?.files?.[0];
      if (f) processFile(f);
    },
    [processFile]
  );

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const clearContract = useCallback(() => {
    setFile(null);
    setText('');
    setChunks([]);
    setStore([]);
    setMessages([]);
    setStatus(null);
  }, []);

  const sendQuestion = useCallback(
    async (rawQuestion) => {
      const question = String(rawQuestion ?? inputText).trim();
      if (!question || sending || !canChat) return;
      setInputText('');
      setSending(true);

      const userMessage = { role: 'user', text: question };
      const historyForApi = messages
        .filter((m) => m.role === 'user' || m.role === 'ai')
        .slice(-10)
        .map((m) => ({ role: m.role === 'ai' ? 'assistant' : 'user', text: m.text }));

      setMessages((prev) => [...prev, userMessage]);

      try {
        const [queryEmbedding] = await embedTexts([question]);
        const top = retrieveTopK(store, queryEmbedding, 4);
        const reply = await askContract({
          question,
          context: top.map((c) => ({ text: c.text, score: c.score })),
          history: historyForApi,
        });
        setMessages((prev) => [
          ...prev,
          {
            role: 'ai',
            text: reply || 'No answer returned.',
            sources: top.map((c) => ({ text: c.text, score: c.score })),
          },
        ]);
      } catch (err) {
        const msg = err && typeof err === 'object' && 'message' in err ? String(err.message) : String(err);
        setMessages((prev) => [
          ...prev,
          { role: 'ai', text: `Sorry, I hit an error answering that: ${msg}` },
        ]);
      } finally {
        setSending(false);
      }
    },
    [inputText, sending, canChat, messages, store]
  );

  const onKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendQuestion();
      }
    },
    [sendQuestion]
  );

  return (
    <div className="rag-page">
      <header className="rag-page__topbar">
        <Link to="/" className="rag-page__brand">
          Finvest<span> Contract AI</span>
        </Link>
        <nav className="rag-page__nav" aria-label="Secondary">
          <Link to="/" aria-label="Home">
            <Home size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} /> Home
          </Link>
          <Link to="/dashboard" className="rag-page__nav-cta" aria-label="Dashboard">
            <LayoutDashboard size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />
            Dashboard
          </Link>
        </nav>
      </header>

      <div className="rag-shell">
        <section className="rag-hero">
          <span className="rag-hero__tag">
            <Sparkles size={12} /> RAG-powered contract review
          </span>
          <h1 className="rag-hero__title">
            Decode Your <em>Contracts</em> before you sign.
          </h1>
          <p className="rag-hero__desc">
            Upload any PDF contract and chat with it like a friend. Finvest extracts the text,
            chunks and embeds every clause, retrieves the most relevant passages for your
            question, and uses AI to explain what each clause really means, automatically
            flagging risks, costs, deadlines, and restrictions.
          </p>
          <div className="rag-stats" aria-live="polite">
            <div>
              <strong>{stats.words.toLocaleString()}</strong>
              <span>Words</span>
            </div>
            <div>
              <strong>{stats.chunks}</strong>
              <span>Chunks</span>
            </div>
            <div>
              <strong>{stats.ready}</strong>
              <span>Embedded</span>
            </div>
            <div>
              <strong>{messages.filter((m) => m.role === 'user').length}</strong>
              <span>Questions</span>
            </div>
          </div>
        </section>

        <aside className="rag-panel" aria-label="Upload and pipeline">
          <h2 className="rag-panel__title">1 · Upload your contract</h2>
          <p className="rag-panel__subtitle">PDF only · processed in your browser</p>

          {file ? (
            <div className="rag-file-row">
              <div className="rag-file-row__name">
                <strong title={file.name}>{file.name}</strong>
                <span>{humanFileSize(file.size)}</span>
              </div>
              <button type="button" onClick={clearContract} title="Remove contract">
                <Trash2 size={12} style={{ verticalAlign: '-2px', marginRight: 4 }} />
                Clear
              </button>
            </div>
          ) : (
            <label
              className={`rag-dropzone ${isDragging ? 'rag-dropzone--over' : ''}`}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
            >
              <div className="rag-dropzone__icon" aria-hidden>
                <Upload size={22} />
              </div>
              <div>
                <strong style={{ color: 'var(--rag-text)' }}>Drop your PDF here</strong>
                <br />
                or click to choose a file
              </div>
              <div className="rag-dropzone__hint">Max ~25 MB · text-based PDFs work best</div>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                onChange={onFileInputChange}
              />
            </label>
          )}

          <StatusBadge state={status} />

          <div className="rag-sidebar-section">
            <h2 className="rag-panel__title">2 · Try a starter question</h2>
            <p className="rag-panel__subtitle">Click one once your contract is ready</p>
            <ul className="rag-sample-list">
              {SAMPLE_QUESTIONS.map((q) => (
                <li key={q}>
                  <button
                    type="button"
                    onClick={() => sendQuestion(q)}
                    disabled={!canChat || sending}
                  >
                    {q}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <section className="rag-panel rag-chat" aria-label="Contract chat">
          <div className="rag-chat__header">
            <div>
              <h2>Chat with your contract</h2>
              <p>Retrieval Augmented Generation · Gemini embeddings · Groq answers</p>
            </div>
            <div className="rag-chat__legend" aria-label="Risk legend">
              <span className="rag-chip rag-chip--risk">Risk</span>
              <span className="rag-chip rag-chip--cost">Cost</span>
              <span className="rag-chip rag-chip--deadline">Deadline</span>
              <span className="rag-chip rag-chip--restriction">Restriction</span>
            </div>
          </div>

          <div className="rag-chat__messages">
            {!canChat && messages.length === 0 ? <WelcomeMessage /> : null}

            {messages.map((m, i) => {
              if (m.role === 'system') {
                return (
                  <div key={i} className="rag-message rag-message--system">
                    {m.text}
                  </div>
                );
              }
              const cls = m.role === 'user' ? 'rag-message rag-message--user' : 'rag-message rag-message--ai';
              return (
                <div key={i} className={cls}>
                  {m.role === 'ai' ? renderTaggedText(m.text) : m.text}
                  {m.sources && m.sources.length > 0 ? (
                    <div className="rag-sources">
                      <details>
                        <summary>Show retrieved clauses ({m.sources.length})</summary>
                        {m.sources.map((s, idx) => (
                          <div key={idx} className="rag-source-chunk">
                            <strong style={{ color: 'var(--rag-accent-strong)' }}>
                              Excerpt {idx + 1} · relevance {Number(s.score || 0).toFixed(2)}
                            </strong>
                            <div style={{ marginTop: 4 }}>{s.text}</div>
                          </div>
                        ))}
                      </details>
                    </div>
                  ) : null}
                </div>
              );
            })}

            {sending ? (
              <div className="rag-message rag-message--ai" aria-live="polite">
                <div className="rag-spinner" style={{ display: 'inline-block', marginRight: 8 }} />
                Reading the relevant clauses…
              </div>
            ) : null}

            <div ref={messagesEndRef} />
          </div>

          <div className="rag-chat__composer">
            <textarea
              ref={textAreaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={
                canChat
                  ? 'Ask about any clause… e.g. "What fees will I pay if I cancel early?"'
                  : 'Upload a contract first to enable chat.'
              }
              disabled={!canChat || sending}
              rows={1}
            />
            <button
              type="button"
              className="rag-chat__send"
              onClick={() => sendQuestion()}
              disabled={!canChat || sending || !inputText.trim()}
              aria-label="Send question"
            >
              <Send size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />
              Send
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

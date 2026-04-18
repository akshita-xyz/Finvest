import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

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

const NAV_COMMANDS = [
  { patterns: ["go home", "take me home", "home page", "go to home", "back to home", "back home", "homepage", "home"],
    route: "/", label: "Home" },
  { patterns: ["dashboard", "go to dashboard", "take me to dashboard", "open dashboard", "show dashboard"],
    route: "/dashboard", label: "Dashboard" },
  { patterns: ["portfolio", "my portfolio", "go to portfolio", "open portfolio", "show portfolio"],
    route: "/portfolio", label: "Portfolio" },
  { patterns: ["profile", "my profile", "go to profile", "open profile"],
    route: "/profile", label: "Profile" },
  { patterns: ["settings", "go to settings", "open settings"],
    route: "/settings", label: "Settings" },
  { patterns: ["quiz", "take the quiz", "risk quiz", "go to quiz", "start quiz", "open quiz"],
    route: "/quiz", label: "Quiz" },
  { patterns: ["sandbox", "risk sandbox", "simulation", "go to sandbox", "open sandbox"],
    route: "/sandbox", label: "Risk Sandbox" },
  { patterns: ["login", "sign in", "log in", "go to login", "open login"],
    route: "/login", label: "Login" },
  { patterns: ["signup", "sign up", "register", "create account", "go to signup"],
    route: "/signup", label: "Sign Up" },
  { patterns: ["learn", "learning", "education", "go to learn", "open learn"],
    route: "/learn", label: "Learn" },
  { patterns: ["markets", "market", "go to markets", "open markets", "show markets"],
    route: "/markets", label: "Markets" },
  { patterns: ["certificates", "certificate", "my certificates"],
    route: "/certificates", label: "Certificates" },
];

const SCROLL_COMMANDS = [
  { patterns: ["scroll down", "go down", "move down"],  action: () => window.scrollBy({ top: 400,  behavior: "smooth" }) },
  { patterns: ["scroll up",   "go up",   "move up"],    action: () => window.scrollBy({ top: -400, behavior: "smooth" }) },
  { patterns: ["scroll to top", "go to top", "top of page"],           action: () => window.scrollTo({ top: 0, behavior: "smooth" }) },
  { patterns: ["scroll to bottom", "go to bottom", "bottom of page"],  action: () => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }) },
  { patterns: ["go back", "navigate back", "previous page"],           action: () => window.history.back() },
  { patterns: ["refresh", "reload", "refresh page"],                   action: () => window.location.reload() },
];

const OPEN_COMMANDS  = ["hello finvest", "hey finvest", "hi finvest", "open finvest ai", "show assistant", "finvest ai", "ok finvest"];
const CLOSE_COMMANDS = ["close assistant", "hide assistant", "close finvest ai", "goodbye finvest"];

const WAKE_WORDS = [
  "hello finvest",
  "hey finvest",
  "hi finvest",
  "finvest ai",
  "ok finvest",
  "finvest",
];

const QUICK_CHIPS = [
  { label: "Dashboard",   q: "take me to dashboard" },
  { label: "Invest ₹50K", q: "Where should I invest ₹50,000?" },
  { label: "Budgeting",   q: "How do I start budgeting?" },
  { label: "Risk tips",   q: "How to reduce investment risk?" },
];

async function callClaude(userText) {
  const res = await fetch("/api/voice", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user",   content: userText },
      ],
    }),
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "Sorry, I couldn't process that.";
}

function normalize(str) {
  return str.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
}

function matchesAny(transcript, patterns) {
  const t = normalize(transcript);
  return patterns.some((p) => t.includes(normalize(p)));
}

export default function VoiceAssistant() {
  const navigate = useNavigate();

  const [open, setOpen]             = useState(false);
  const [messages, setMessages]     = useState([
    { role: "ai", text: 'Hi! Say "Hello Finvest" or tap the orb to get started.' },
  ]);
  const [listening, setListening]   = useState(false);
  const [speaking, setSpeaking]     = useState(false);
  const [thinking, setThinking]     = useState(false);
  const [inputVal, setInputVal]     = useState("");
  const [wakeActive, setWakeActive] = useState(false);
  const [toast, setToast]           = useState(null);

  const chatRef        = useRef(null);
  const recognitionRef = useRef(null);
  const wakeRef        = useRef(null);
  const synth          = useRef(window.speechSynthesis);
  const toastTimer     = useRef(null);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, thinking]);

  useEffect(() => {
    const s = synth.current;
    if (!s) return;
    s.getVoices();
    s.addEventListener("voiceschanged", () => s.getVoices());
  }, []);

  const showToast = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const speak = useCallback((text) => {
    const s = synth.current;
    if (!s) return;
    s.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-IN"; u.rate = 1.0; u.pitch = 1.0;
    const v = s.getVoices().find((v) => v.lang === "en-IN") || s.getVoices().find((v) => v.lang.startsWith("en"));
    if (v) u.voice = v;
    u.onstart = () => setSpeaking(true);
    u.onend   = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    s.speak(u);
  }, []);

  const tryCommand = useCallback((transcript) => {
    if (matchesAny(transcript, OPEN_COMMANDS)) {
      setOpen(true);
      speak("Finvest AI is ready. How can I help you?");
      showToast("Assistant opened");
      return true;
    }
    if (matchesAny(transcript, CLOSE_COMMANDS)) {
      setOpen(false);
      speak("Goodbye! Have a great day.");
      showToast("Assistant closed");
      return true;
    }
    for (const cmd of SCROLL_COMMANDS) {
      if (matchesAny(transcript, cmd.patterns)) {
        cmd.action();
        showToast(`✓ ${cmd.patterns[0]}`);
        speak("Done!");
        return true;
      }
    }
    for (const cmd of NAV_COMMANDS) {
      if (matchesAny(transcript, cmd.patterns)) {
        const msg = `Taking you to ${cmd.label}…`;
        setMessages((m) => [...m, { role: "ai", text: msg }]);
        speak(msg);
        showToast(`🗺️ Navigating to ${cmd.label}`);
        setTimeout(() => navigate(cmd.route), 900);
        return true;
      }
    }
    return false;
  }, [navigate, speak, showToast]);

  const stopListening = useCallback(() => {
    setListening(false);
    try { recognitionRef.current?.stop(); } catch {}
  }, []);

  const stopWakeListener = useCallback(() => {
    try { wakeRef.current?.stop(); } catch {}
    setWakeActive(false);
  }, []);

  const startWakeListener = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.lang = "en-IN"; r.continuous = true; r.interimResults = true;
    r.onstart = () => setWakeActive(true);
    r.onresult = (e) => {
      const transcript = Array.from(e.results)
        .map((res) => res[0].transcript)
        .join(" ");
      if (WAKE_WORDS.some((w) => normalize(transcript).includes(normalize(w)))) {
        r.stop();
        setOpen(true);
        showToast("👋 Wake word detected!");
        speak("Hello! Finvest AI is ready. How can I help you?");
        setTimeout(() => startListening(), 2200);
      }
    };
    r.onerror = (e) => {
      if (e.error !== "no-speech") setWakeActive(false);
    };
    r.onend = () => {
      setWakeActive(false);
      setTimeout(() => {
        if (!recognitionRef.current) {
          startWakeListener();
        }
      }, 1500);
    };
    wakeRef.current = r;
    try { r.start(); } catch {}
  }, [speak, showToast]); // startListening added via late-binding below

  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setMessages((m) => [...m, { role: "ai", text: "Voice not supported in this browser. Please type instead." }]);
      return;
    }
    stopWakeListener();
    const r = new SR();
    r.lang = "en-IN"; r.continuous = false; r.interimResults = false;
    r.onstart  = () => setListening(true);
    r.onresult = (e) => {
      recognitionRef.current = null;
      stopListening();
      handleInput(e.results[0][0].transcript);
    };
    r.onerror  = () => {
      recognitionRef.current = null;
      stopListening();
    };
    r.onend    = () => {
      recognitionRef.current = null;
      stopListening();
      setTimeout(startWakeListener, 800);
    };
    recognitionRef.current = r;
    try { r.start(); } catch { stopListening(); }
  }, [stopListening, stopWakeListener, startWakeListener]);

  const handleInput = useCallback(async (text) => {
    if (!text.trim()) return;
    setMessages((m) => [...m, { role: "user", text }]);
    if (tryCommand(text)) return;
    setThinking(true);
    try {
      const reply = await callClaude(text);
      setThinking(false);
      setMessages((m) => [...m, { role: "ai", text: reply }]);
      speak(reply);
    } catch {
      setThinking(false);
      setMessages((m) => [...m, { role: "ai", text: "Connection error. Please try again." }]);
    }
  }, [tryCommand, speak]);

  useEffect(() => {
    startWakeListener();
    return () => stopWakeListener();
  }, []); // eslint-disable-line

  const toggleOrb = useCallback(() => {
    if (speaking) { synth.current?.cancel(); setSpeaking(false); return; }
    if (listening) { stopListening(); setTimeout(startWakeListener, 800); return; }
    startListening();
  }, [speaking, listening, stopListening, startListening, startWakeListener]);

  const sendText = useCallback(() => {
    const v = inputVal.trim();
    setInputVal("");
    if (v) handleInput(v);
  }, [inputVal, handleInput]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500&family=DM+Mono:wght@400&display=swap');

        .va-toast {
          position: fixed; bottom: 110px; left: 50%; transform: translateX(-50%);
          z-index: 100000; background: #0a1428;
          border: 1px solid rgba(74,158,255,0.3); border-radius: 20px;
          padding: 7px 18px; font-family: 'DM Mono', monospace; font-size: 11px;
          color: #4a9eff; letter-spacing: .08em; white-space: nowrap;
          box-shadow: 0 4px 20px rgba(0,0,0,0.5), 0 0 20px rgba(74,158,255,0.15);
          animation: va-toastIn .25s ease both;
        }
        @keyframes va-toastIn { from{opacity:0;transform:translateX(-50%) translateY(8px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }

        .va-wake-dot {
          position: fixed; bottom: 80px; right: 28px; z-index: 100000;
          display: flex; align-items: center; gap: 5px;
          font-family: 'DM Mono', monospace; font-size: 9px; color: #2a5080;
          letter-spacing: .08em; pointer-events: none;
        }
        .va-wake-dot-circle {
          width: 6px; height: 6px; border-radius: 50%; background: #4a9eff;
          animation: va-dotPulse 2s ease-in-out infinite;
          box-shadow: 0 0 5px 2px rgba(74,158,255,0.5);
        }

        .va-fab {
          position: fixed; bottom: 32px; right: 32px; z-index: 99999;
          width: 62px; height: 62px; border-radius: 50%; border: none;
          cursor: pointer; outline: none; padding: 0;
          background: radial-gradient(circle at 38% 35%, #7ecfff, #1a8fff 45%, #0051c3);
          box-shadow: 0 0 18px 4px rgba(74,158,255,.6), 0 0 50px 14px rgba(74,158,255,.28), 0 4px 24px rgba(0,0,0,.5);
          animation: va-fabIn .55s cubic-bezier(.34,1.56,.64,1) both, va-idleGlow 3s ease-in-out .6s infinite;
          display: flex; align-items: center; justify-content: center;
          transition: transform 0.2s;
        }
        .va-fab:hover { transform: scale(1.1); }
        .va-fab.is-open     { background: radial-gradient(circle at 38% 35%, #9edcff, #2fa0ff 45%, #0066dd); animation: va-idleGlow 3s ease-in-out infinite; }
        .va-fab.is-listening { animation: va-listenPulse .9s ease-in-out infinite !important; }
        .va-fab.is-speaking  { animation: va-speakBreathe 1.2s ease-in-out infinite alternate !important; }
        .va-fab-icon { font-size: 26px; pointer-events: none; user-select: none; filter: drop-shadow(0 1px 3px rgba(0,0,0,.4)); }

        .va-halo { position:fixed; bottom:32px; right:32px; width:62px; height:62px; border-radius:50%; z-index:99997; pointer-events:none; }
        .va-halo::before,.va-halo::after { content:''; position:absolute; border-radius:50%; border:1.5px solid rgba(74,158,255,.25); animation:va-haloRing 3s ease-in-out infinite; }
        .va-halo::before { inset:-12px; }
        .va-halo::after  { inset:-26px; border-color:rgba(74,158,255,.12); animation-delay:1.2s; }

        .va-panel {
          position: fixed; bottom: 108px; right: 28px; z-index: 99998;
          width: 360px; max-width: calc(100vw - 36px);
          background: #060a10; border: 1px solid rgba(74,158,255,.18);
          border-radius: 20px; overflow: hidden;
          font-family: 'Inter', sans-serif; color: #d0d8e8;
          display: none; flex-direction: column;
          box-shadow: 0 24px 60px rgba(0,0,0,.75), 0 0 50px rgba(74,158,255,.08);
        }
        .va-panel.is-open { display:flex; animation:va-panelIn .32s cubic-bezier(.34,1.15,.64,1) both; }
        .va-panel::before {
          content:''; position:absolute; inset:0; pointer-events:none;
          background-image: linear-gradient(rgba(74,158,255,.03) 1px,transparent 1px), linear-gradient(90deg,rgba(74,158,255,.03) 1px,transparent 1px);
          background-size: 28px 28px;
        }

        .va-header { display:flex; align-items:center; justify-content:space-between; padding:14px 16px 12px; border-bottom:1px solid rgba(74,158,255,.1); position:relative; }
        .va-brand  { display:flex; align-items:center; gap:9px; }
        .va-brand-dot { width:9px; height:9px; border-radius:50%; background:#4a9eff; box-shadow:0 0 8px 3px rgba(74,158,255,.6); animation:va-dotPulse 2s ease-in-out infinite; }
        .va-brand-name { font-size:14px; font-weight:600; color:#fff; }
        .va-brand-name span { color:#4a9eff; }
        .va-brand-sub { font-family:'DM Mono',monospace; font-size:9px; color:#2a3d55; letter-spacing:.12em; text-transform:uppercase; margin-top:2px; }
        .va-x-btn { width:28px; height:28px; border-radius:8px; border:1px solid rgba(74,158,255,.15); background:transparent; color:#2a3d55; font-size:14px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:border-color .2s,color .2s; }
        .va-x-btn:hover { border-color:#4a9eff; color:#4a9eff; }

        .va-hint {
          background: rgba(74,158,255,.05); border-bottom: 1px solid rgba(74,158,255,.08);
          padding: 7px 16px; font-family:'DM Mono',monospace; font-size:9.5px; color:#2a4060;
          letter-spacing:.06em; display:flex; gap:14px; overflow-x:auto; white-space:nowrap;
        }
        .va-hint::-webkit-scrollbar { display:none; }
        .va-hint-item { color:#3a6090; }
        .va-hint-item span { color:#4a9eff; }

        .va-orb-wrap { display:flex; flex-direction:column; align-items:center; gap:10px; padding:18px 0 14px; }
        .va-orb {
          width:72px; height:72px; border-radius:50%; border:none; outline:none; cursor:pointer;
          background:radial-gradient(circle at 38% 35%,#7ecfff,#1a8fff 45%,#0051c3);
          box-shadow: 0 0 22px 6px rgba(74,158,255,.5), 0 0 55px 16px rgba(74,158,255,.2);
          animation:va-innerIdle 3s ease-in-out infinite;
          display:flex; align-items:center; justify-content:center; font-size:28px;
          position:relative; transition:transform .2s;
        }
        .va-orb:hover { transform:scale(1.07); }
        .va-orb.is-listening { animation:va-listenPulse .9s ease-in-out infinite; box-shadow:0 0 35px 12px rgba(74,158,255,.7),0 0 80px 24px rgba(74,158,255,.3); }
        .va-orb.is-speaking  { animation:va-speakBreathe 1.2s ease-in-out infinite alternate; }
        .va-orb::before,.va-orb::after { content:''; position:absolute; border-radius:50%; border:1px solid rgba(74,158,255,.22); pointer-events:none; }
        .va-orb::before { width:94px; height:94px; animation:va-haloRing 3s ease-in-out infinite; }
        .va-orb::after  { width:116px; height:116px; opacity:.5; animation:va-haloRing 3s ease-in-out 1.2s infinite; }

        .va-wave { display:flex; align-items:center; gap:3px; height:24px; opacity:0; transition:opacity .3s; }
        .va-wave.active { opacity:1; }
        .va-bar { width:3px; border-radius:3px; background:linear-gradient(to top,#1a8fff,#7ecfff); animation:va-barAnim .8s ease-in-out infinite; min-height:3px; }
        .va-bar:nth-child(1){height:5px;animation-delay:0s}   .va-bar:nth-child(2){height:12px;animation-delay:.08s}
        .va-bar:nth-child(3){height:19px;animation-delay:.16s} .va-bar:nth-child(4){height:14px;animation-delay:.24s}
        .va-bar:nth-child(5){height:22px;animation-delay:.32s} .va-bar:nth-child(6){height:16px;animation-delay:.28s}
        .va-bar:nth-child(7){height:11px;animation-delay:.2s}  .va-bar:nth-child(8){height:18px;animation-delay:.12s}
        .va-bar:nth-child(9){height:9px;animation-delay:.04s}  .va-bar:nth-child(10){height:5px;animation-delay:0s}

        .va-status { font-family:'DM Mono',monospace; font-size:10px; color:#2a3d55; letter-spacing:.1em; text-align:center; min-height:15px; transition:color .3s; }
        .va-status.active   { color:#4a9eff; }
        .va-status.speaking { color:#7ecfff; }

        .va-chat { margin:0 14px; background:#0a1020; border:1px solid rgba(74,158,255,.1); border-radius:12px; padding:12px; display:flex; flex-direction:column; gap:10px; height:160px; overflow-y:auto; scroll-behavior:smooth; }
        .va-chat::-webkit-scrollbar{width:3px} .va-chat::-webkit-scrollbar-thumb{background:rgba(74,158,255,.2);border-radius:2px}
        .va-msg { display:flex; flex-direction:column; gap:2px; animation:va-msgIn .25s ease both; }
        .va-msg.ai   { align-items:flex-start; } .va-msg.user { align-items:flex-end; }
        .va-msg-lbl { font-family:'DM Mono',monospace; font-size:9px; letter-spacing:.1em; text-transform:uppercase; color:#1e3050; }
        .va-msg.user .va-msg-lbl { color:#1a4070; text-align:right; }
        .va-bubble { padding:8px 11px; border-radius:10px; font-size:12.5px; line-height:1.55; max-width:88%; }
        .va-msg.ai   .va-bubble { background:rgba(74,158,255,.07); border:1px solid rgba(74,158,255,.14); border-bottom-left-radius:3px; color:#c8d8f0; }
        .va-msg.user .va-bubble { background:rgba(255,255,255,.03); border:1px solid rgba(74,158,255,.08); border-bottom-right-radius:3px; color:#3a5570; text-align:right; }
        .va-msg.nav  .va-bubble { background:rgba(74,158,255,.12); border-color:rgba(74,158,255,.25); color:#7ecfff; }

        .va-dots { display:flex; gap:4px; align-items:center; padding:2px 0; }
        .va-dot  { width:5px; height:5px; border-radius:50%; background:#4a9eff; animation:va-dotBounce 1s ease-in-out infinite; }
        .va-dot:nth-child(2){animation-delay:.2s} .va-dot:nth-child(3){animation-delay:.4s}

        .va-chips { display:flex; flex-wrap:wrap; gap:6px; padding:10px 14px 0; }
        .va-chip { background:transparent; border:1px solid rgba(74,158,255,.14); border-radius:14px; padding:4px 11px; font-size:10.5px; font-family:'DM Mono',monospace; color:#2a3d55; cursor:pointer; transition:border-color .2s,color .2s,background .2s; }
        .va-chip:hover { border-color:#4a9eff; color:#4a9eff; background:rgba(74,158,255,.07); }

        .va-input-row { display:flex; gap:8px; padding:10px 14px 14px; }
        .va-text-input { flex:1; background:#0a1020; border:1px solid rgba(74,158,255,.12); border-radius:8px; padding:9px 12px; color:#c8d8f0; font-family:'Inter',sans-serif; font-size:12.5px; outline:none; transition:border-color .2s; }
        .va-text-input::placeholder { color:#1e3050; }
        .va-text-input:focus { border-color:rgba(74,158,255,.4); }
        .va-send-btn { background:linear-gradient(135deg,#1a8fff,#0051c3); border:none; border-radius:8px; width:36px; height:36px; cursor:pointer; display:flex; align-items:center; justify-content:center; color:#fff; font-size:13px; box-shadow:0 0 12px rgba(74,158,255,.4); transition:opacity .2s,transform .1s; flex-shrink:0; }
        .va-send-btn:hover{opacity:.85} .va-send-btn:active{transform:scale(.94)}
        .va-note { font-family:'DM Mono',monospace; font-size:9px; color:#101820; text-align:center; padding:0 14px 12px; letter-spacing:.06em; }

        @keyframes va-fabIn        {from{opacity:0;transform:scale(.3) translateY(24px)}to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes va-panelIn      {from{opacity:0;transform:translateY(18px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes va-toastIn      {from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
        @keyframes va-idleGlow     {0%,100%{box-shadow:0 0 18px 4px rgba(74,158,255,.6),0 0 50px 14px rgba(74,158,255,.28),0 4px 24px rgba(0,0,0,.5)}50%{box-shadow:0 0 28px 9px rgba(74,158,255,.85),0 0 75px 22px rgba(74,158,255,.4),0 4px 24px rgba(0,0,0,.5)}}
        @keyframes va-innerIdle    {0%,100%{box-shadow:0 0 22px 6px rgba(74,158,255,.5),0 0 55px 16px rgba(74,158,255,.2)}50%{box-shadow:0 0 34px 10px rgba(74,158,255,.7),0 0 80px 24px rgba(74,158,255,.3)}}
        @keyframes va-listenPulse  {0%,100%{transform:scale(1)}50%{transform:scale(1.13)}}
        @keyframes va-speakBreathe {from{transform:scale(1)}to{transform:scale(1.08)}}
        @keyframes va-haloRing     {0%,100%{transform:scale(1);opacity:.6}50%{transform:scale(1.1);opacity:1}}
        @keyframes va-dotPulse     {0%,100%{opacity:.5;transform:scale(1)}50%{opacity:1;transform:scale(1.35)}}
        @keyframes va-barAnim      {0%,100%{transform:scaleY(.3);opacity:.4}50%{transform:scaleY(1);opacity:1}}
        @keyframes va-msgIn        {from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:translateY(0)}}
        @keyframes va-dotBounce    {0%,100%{transform:translateY(0);opacity:.4}50%{transform:translateY(-5px);opacity:1}}
      `}</style>

      {toast && <div className="va-toast">{toast}</div>}

      {wakeActive && !open && (
        <div className="va-wake-dot">
          <div className="va-wake-dot-circle" />
          
        </div>
      )}

      <div className="va-halo" />

      <button
        className={`va-fab${open ? " is-open" : ""}${listening ? " is-listening" : ""}${speaking ? " is-speaking" : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-label="Finvest Voice Assistant"
      >
        <span className="va-fab-icon">{open ? "✕" : "🎙️"}</span>
      </button>

      <div className={`va-panel${open ? " is-open" : ""}`}>

        <div className="va-header">
          <div>
            <div className="va-brand">
              <div className="va-brand-dot" />
              <div className="va-brand-name">Fin<span>vest</span> AI</div>
            </div>
            <div className="va-brand-sub">Voice · Finance Assistant</div>
          </div>
          <button className="va-x-btn" onClick={() => setOpen(false)}>✕</button>
        </div>

        <div className="va-hint">
          <span className="va-hint-item"><span>"Hello Finvest"</span> → wake</span>
          <span className="va-hint-item"><span>"Go to dashboard"</span></span>
          <span className="va-hint-item"><span>"Scroll down"</span></span>
          <span className="va-hint-item"><span>"Go back"</span></span>
        </div>

        <div className="va-orb-wrap">
          <button
            className={`va-orb${listening ? " is-listening" : speaking ? " is-speaking" : ""}`}
            onClick={toggleOrb}
            aria-label="Start speaking"
          >
            {listening ? "⏹" : speaking ? "🔊" : "🎙️"}
          </button>
          <div className={`va-wave${listening || speaking ? " active" : ""}`}>
            {[...Array(10)].map((_, i) => <div key={i} className="va-bar" />)}
          </div>
          <div className={`va-status${listening ? " active" : speaking ? " speaking" : ""}`}>
            {listening ? "Listening…" : speaking ? "Speaking…" : thinking ? "Thinking…" : "Tap orb to speak"}
          </div>
        </div>

        <div className="va-chat" ref={chatRef}>
          {messages.map((m, i) => (
            <div key={i} className={`va-msg ${m.role}`}>
              <div className="va-msg-lbl">{m.role === "ai" ? "Finvest AI" : "You"}</div>
              <div className="va-bubble">{m.text}</div>
            </div>
          ))}
          {thinking && (
            <div className="va-msg ai">
              <div className="va-msg-lbl">Finvest AI</div>
              <div className="va-bubble">
                <div className="va-dots">
                  <div className="va-dot" /><div className="va-dot" /><div className="va-dot" />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="va-chips">
          {QUICK_CHIPS.map((c) => (
            <button key={c.label} className="va-chip" onClick={() => handleInput(c.q)}>
              {c.label}
            </button>
          ))}
        </div>

        <div className="va-input-row">
          <input
            className="va-text-input"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendText()}
            placeholder="Speak or type a command…"
          />
          <button className="va-send-btn" onClick={sendText}>➤</button>
        </div>

        <div className="va-note"> Not financial advice · Say "Hello Finvest" anytime to wake me</div>
      </div>
    </>
  );
}
// scripts/rs-chat-widget.js
(() => {
  const HOST_ID = 'rs-chat-widget-root';
  if (document.getElementById(HOST_ID)) return; // avoid double injection

  // 1) Host + Shadow
  const host = document.createElement('div');
  host.id = HOST_ID;
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: 'open' });

  // 2) UI (Shadow DOM) — minimal, robust, no FAB
  shadow.innerHTML = `
    <style>
      :host { all: initial; }

      .cursor {
        display: inline-block;
        width: 0.4em;
        margin-left: 1px;
        color: var(--accent, #4F6EF7);
        animation: rs-cursor-blink 1s steps(1) infinite;
      }
      @keyframes rs-cursor-blink {
        50% { opacity: 0; }
      }
      @media (prefers-reduced-motion: reduce) {
        .cursor { animation: none; }
      }

      .visually-hidden {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }
      
      /* Use your site tokens */
      .ui, .ui * {
        font-family: var(--font-sans, system-ui);
        font-size: var(--fs-control, 15px);
        line-height: var(--lh-body, 1.55);
        font-weight: var(--weight-regular, 400);
        font-synthesis: none;
        box-sizing: border-box;
      }
      .ui *, .ui *::before, .ui *::after { box-sizing: inherit; }

      /* Drawer */
      .panel {
        position: fixed; top: auto; right: 12px; bottom: 12px;
        width: min(444px, calc(100vw - 24px));
        height: 80px;
        display: flex; flex-direction: column;
        justify-content: flex-end;
        background: var(--surface-dark-glass);
        backdrop-filter: blur(18px);
        color: #f8fafc;
        border: 1px solid var(--surface-dark-border);
        box-shadow: 0 28px 90px rgba(0, 0, 0, 0.24);
        border-radius: 18px;
        visibility: hidden;
        z-index: 2147482999;
        will-change: height;
        overflow: hidden;
      }
      .panel.open { visibility: visible; }
      .chat-body {
        display: flex; flex-direction: column;
        flex: 1 1 auto;
        min-height: 0;
        overflow: hidden;
      }

      .hdr {
        display:flex; align-items:center; justify-content:space-between;
        padding: var(--space-3, .75rem) var(--space-4, 1rem);
        background: transparent;
        border-bottom: none;
        color: #f8fafc;
      }
      .hdr-title { font-weight: var(--weight-semibold, 600); font-size: var(--fs-sm, 14px); letter-spacing: var(--tracking-caps, .10em); }
      .hdr-close {
        width: 36px;
        height: 36px;
        border: 1px solid rgba(255,255,255,0.10);
        border-radius: 12px;
        background: rgba(6, 12, 22, 1);
        color: #f8fafc;
        font-size: 0.85rem;
        cursor: pointer;
        display: grid;
        place-items: center;
        flex-shrink: 0;
        transition: transform 180ms ease, background 180ms ease, box-shadow 180ms ease;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
      }
      .hdr-close:hover {
        transform: translateY(-1px) scale(1.03);
        background: rgba(10, 10, 10, 0.94);
        box-shadow: 0 6px 18px rgba(0, 0, 0, 0.24);
      }
      .hdr-close:focus-visible {
        outline: none;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18), 0 0 0 3px rgba(79, 110, 247, 0.12);
      }
      /* Messages (anti‑clipping) */
      .msgs {
        list-style: none;
        margin: 0;
        display:flex; flex-direction:column; gap: var(--space-2, .5rem);
        padding: var(--space-4, 1rem);
        background: transparent;
        flex: 1 1 auto;
        min-height: 0;
        overflow-y: auto; overflow-x: hidden;
      }
      .msg {
        margin: 0;
        display:inline-block; max-width: 100%;
        word-break: break-word; overflow-wrap: anywhere;
        padding: var(--space-2, .5rem) var(--space-3, .75rem);
        border-radius: var(--radius-md, 12px);
        border: 1px solid rgba(255, 255, 255, 0.10);
        box-shadow: 0 1px 2px rgba(0,0,0,.35);
      }
      .msg.user {
        white-space: pre-wrap;
        align-self:flex-end; background: rgba(79, 110, 247, 0.2);
        border-color: var(--accent, #4F6EF7); color: #f8fafc;
      }
      .msg.bot {
        align-self:flex-start; background: rgba(255, 255, 255, 0.06);
        border-color: rgba(255, 255, 255, 0.08); color: #f8fafc;
        position: relative;
      }

      .msg.bot[data-seeded="true"] {
        opacity: .84;
        background: rgba(255, 255, 255, 0.04);
      }

      .msg.bot a {
        color: #93c5fd;
        text-decoration: underline;
        text-underline-offset: 2px;
      }
      .msg.bot a:hover {
        color: #bfdbfe;
      }
      .msg.bot strong {
        font-weight: var(--weight-semibold, 600);
      }

      .chat-card {
        display: block;
        text-decoration: none;
        margin: var(--space-3, .75rem) 0;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.10);
        border-radius: var(--radius-md, 12px);
        overflow: hidden;
        transition: transform .2s ease, border-color .2s ease;
      }
      .chat-card:hover {
        transform: translateY(-2px);
        border-color: var(--accent, #4F6EF7);
      }
      .chat-card-img {
        width: 100%;
        height: 160px;
        object-fit: cover;
        object-position: top;
        border-bottom: 1px solid rgba(255, 255, 255, 0.10);
      }
      .chat-card-body {
        display: block;
        padding: var(--space-2, .5rem) var(--space-3, .75rem);
      }
      .chat-card-title {
        display: block;
        color: #f8fafc;
        font-weight: var(--weight-semibold, 600);
        margin-bottom: 0.25rem;
      }
      .chat-card-action {
        display: block;
        color: #93c5fd;
        font-size: 13px;
        font-weight: var(--weight-medium, 500);
      }

      .chat-list {
        margin: var(--space-2, .5rem) 0;
        padding-left: var(--space-4, 1.25rem);
      }
      .chat-list li {
        margin-bottom: var(--space-1, .25rem);
      }
      .chat-list li:last-child {
        margin-bottom: 0;
      }

      .pills {
        display: flex; flex-wrap: wrap; gap: var(--space-2, .5rem);
        padding: var(--space-3, .75rem) var(--space-4, 1rem) 0;
        border-top: none;
        background: transparent;
      }
      .pill {
        border: 1px solid rgba(255, 255, 255, 0.10);
        border-radius: var(--radius-pill, 999px);
        padding: var(--space-2, .5rem) var(--space-3, .75rem);
        background: rgba(255, 255, 255, 0.06);
        color: rgba(255, 255, 255, 0.75);
        font: inherit; font-size: var(--fs-sm, 14px);
        cursor: pointer; white-space: nowrap; max-width: 100%; overflow: hidden; text-overflow: ellipsis;
      }
      .pill:hover { background: rgba(255, 255, 255, 0.12); color: #f8fafc; }

      /* Input & Textarea */
      .inp {
        display: flex;
        align-items: center;
        gap: 0;
        padding: var(--space-3, .75rem);
        background: transparent;
        box-sizing: border-box;
        position: relative;
      }
      .text {
        flex: 1;
        font: inherit;
        font-size: var(--fs-sm, 14px);
        background: rgba(6, 12, 22, 1);
        border: 1px solid rgba(255,255,255,0.10);
        color: #f8fafc;
        border-radius: 18px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        padding: 0 3.5rem 0 1.25rem;
        height: 56px;
        box-sizing: border-box;
        -webkit-appearance: none;
        box-shadow: 0 24px 64px rgba(0, 0, 0, 0.24);
        transition: border-color 220ms ease, box-shadow 220ms ease, background 220ms ease;
      }
      .text:focus {
        outline: none;
        border-color: rgba(79, 110, 247, 0.5);
        box-shadow: 0 24px 64px rgba(0, 0, 0, 0.24), 0 0 0 2px rgb(79 110 247 / 0.12);
        background: rgba(6, 12, 22, 1);
      }
      .text::placeholder { color: rgba(255,255,255,0.45); font-weight: var(--weight-regular, 400); line-height: 54px; }
      .typewriter {
        position: absolute;
        left: calc(1.25rem + 1px);
        top: 50%;
        transform: translateY(-50%);
        pointer-events: none;
        white-space: nowrap;
        overflow: hidden;
        color: rgba(255,255,255,0.45);
        font-size: var(--fs-sm, 14px);
        z-index: 1;
        display: flex;
        align-items: center;
        gap: 0;
        max-width: calc(100% - 5rem);
      }
      .typewriter-pretext {
        color: rgba(255,255,255,0.35);
        flex-shrink: 0;
      }
      .typewriter-text {
        color: rgba(255,255,255,0.45);
        overflow: hidden;
        white-space: nowrap;
        max-width: 32ch;
      }
      .typewriter-cursor {
        display: inline-block;
        color: rgba(255,255,255,0.45);
        font-weight: 300;
        animation: typewriter-blink 0.8s step-end infinite;
        margin-left: 1px;
        flex-shrink: 0;
      }
      @keyframes typewriter-blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0; }
      }
      @keyframes gentleGlow {
        0%, 100% { box-shadow: 0 0 0 0 rgba(79, 110, 247, 0.4); }
        50% { box-shadow: 0 0 15px 2px rgba(79, 110, 247, 0.6); }
      }
      .send {
        position: absolute;
        right: calc(var(--space-3, .75rem) + 8px);
        border-radius: 14px;
        width: 40px;
        height: 40px;
        background: var(--accent, #4F6EF7);
        color: var(--text-on-accent, #ffffff);
        border: none;
        font-size: 1.05rem;
        cursor: pointer;
        display: grid;
        place-items: center;
        flex-shrink: 0;
        box-sizing: border-box;
        transition: transform var(--dur-2) var(--ease-out), background var(--dur-2) var(--ease-out);
      }
      .send:hover {
        transform: translateY(-1px);
        background: var(--accent-hover, #3B5BDB);
      }



      /* Backdrop */
      .panel-backdrop {
        position: fixed; inset: 0; z-index: 2147482998;
        background: rgba(0,0,0,.25);
        opacity: 0; visibility: hidden; pointer-events: none;
        transition: opacity .28s cubic-bezier(0.16,1,0.3,1), visibility .28s;
      }
      .panel-backdrop.open { opacity: 1; visibility: visible; pointer-events: auto; }
      /* Hire Intent CTA Card */
      .hire-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--space-2, .5rem);
        margin: var(--space-3, .75rem) 0 var(--space-2, .5rem);
        padding: var(--space-4, 1rem);
        background: linear-gradient(135deg, rgba(79, 110, 247,.13), rgba(79, 110, 247,.06));
        border: 1px solid var(--accent, #4F6EF7);
        border-radius: var(--radius-md, 12px);
        text-align: center;
        position: relative;
        overflow: hidden;
      }
      .hire-card::before {
        content: '';
        position: absolute;
        inset: -50%;
        background: radial-gradient(circle, rgba(79, 110, 247,.18) 0%, transparent 65%);
        animation: hire-pulse-bg 2.4s ease-in-out infinite;
        pointer-events: none;
      }
      @keyframes hire-pulse-bg {
        0%, 100% { opacity: .6; transform: scale(0.9); }
        50% { opacity: 1; transform: scale(1.1); }
      }
      .hire-card-emoji { font-size: 2rem; line-height: 1; }
      .hire-card-label {
        font-weight: var(--weight-semibold, 600);
        font-size: var(--fs-sm, 14px);
        color: #f8fafc;
        letter-spacing: .02em;
      }
      .hire-card-sub {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.65);
      }
      .hire-card-btn {
        display: inline-flex;
        align-items: center;
        gap: .4em;
        margin-top: var(--space-1, .25rem);
        padding: var(--space-2, .5rem) var(--space-4, 1rem);
        background: linear-gradient(135deg, rgba(79, 110, 247,.98), rgba(79, 110, 247,.9));
        color: var(--text-on-accent, #ffffff);
        font-weight: var(--weight-semibold, 600);
        font-size: var(--fs-sm, 14px);
        border-radius: var(--radius-pill, 999px);
        text-decoration: none;
        border: none;
        cursor: pointer;
        transition: transform .18s ease, box-shadow .18s ease;
        letter-spacing: .03em;
      }
      .hire-card-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 16px rgba(79, 110, 247,.35);
      }

      /* Sources footnote */
      .chat-sources {
        margin-top: var(--space-2, .5rem);
        padding-top: var(--space-2, .5rem);
        border-top: 1px solid rgba(255, 255, 255, 0.10);
      }
      .chat-sources-label {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: .08em;
        color: rgba(255, 255, 255, 0.50);
        font-weight: var(--weight-medium, 500);
        margin-bottom: .3em;
      }
      .chat-sources-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: .2em;
      }
      .chat-sources-list a {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.65);
        text-decoration: underline;
        text-underline-offset: 2px;
        text-decoration-color: rgba(255, 255, 255, 0.20);
      }
      .chat-sources-list a:hover {
        color: var(--accent, #4F6EF7);
        text-decoration-color: var(--accent, #4F6EF7);
      }

      /* Dynamic loading state */
      .loading-state {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: var(--space-2, .5rem) var(--space-3, .75rem);
        color: rgba(255, 255, 255, 0.65);
        font-size: var(--fs-sm, 14px);
      }
      .loading-orb {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: var(--accent, #4F6EF7);
        animation: orb-pulse 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        box-shadow: 0 0 8px rgba(79, 110, 247, 0.4);
      }
      @keyframes orb-pulse {
        0% { transform: scale(0.8); opacity: 0.5; }
        50% { transform: scale(1.1); opacity: 1; }
        100% { transform: scale(0.8); opacity: 0.5; }
      }
      .loading-text {
        animation: fade-text 2s infinite alternate;
      }
      @keyframes fade-text {
        0% { opacity: 0.6; }
        100% { opacity: 1; }
      }

      /* Blinking cursor */
      .cursor {
        display: inline-block;
        width: 6px;
        height: 1.1em;
        background-color: var(--accent, #4F6EF7);
        vertical-align: text-bottom;
        margin-left: 4px;
        animation: blink 1s step-end infinite;
      }
      @keyframes blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0; }
      }
    </style>

      <div class="ui">
      <div class="panel" role="dialog" aria-modal="true" aria-label="Ryan’s Portfolio Guide" aria-labelledby="rs-chat-title" aria-describedby="rs-chat-desc" tabindex="-1">
        <div class="chat-body">
          <div class="hdr">       
            <div class="hdr-title-group">
              <h2 id="rs-chat-title" class="hdr-title">Ryan's Portfolio Guide</h2>
              <p id="rs-chat-desc" class="visually-hidden">
                Ask questions about Ryan's case studies, design work, or fit for a role.
              </p>
            </div>
            <div class="hdr-actions">
              <button class="hdr-close" id="hdrClose" aria-label="Close chat" type="button">✕</button>
            </div>
          </div>

          <div class="msgs" id="msgs" role="log" aria-live="polite" aria-relevant="additions text" aria-label="Chat conversation"></div>

          <div class="pills" id="pills"></div>
        </div>

        <div class="inp">
          <label for="input" class="visually-hidden">Ask Ryan's portfolio assistant</label>
          <div class="typewriter" id="typewriter" aria-hidden="true">
            <span class="typewriter-pretext">Try&nbsp;</span>
            <span class="typewriter-text" id="typewriterText"></span>
            <span class="typewriter-cursor" aria-hidden="true">|</span>
          </div>
          <input type="text" class="text" id="input" placeholder="" aria-label="Ask a question about Ryan" aria-describedby="rs-chat-hint" autocomplete="off" />
          <button class="send" id="send" type="button" aria-label="Send message">→</button>
        </div>
      </div>

      <div class="panel-backdrop"></div>
    </div>
    `;

  

  // 3) Refs + Open/Close
  const $        = (s) => shadow.querySelector(s);
  const panel    = $('.panel');
  const backdrop = $('.panel-backdrop');
  const msgsEl   = $('#msgs');
  const inputEl  = $('#input');
  const sendBtn  = $('#send');

  // Defensive guards for critical DOM refs
  if (!panel || !backdrop || !msgsEl || !inputEl || !sendBtn) {
    console.error('Portfolio Chat: Critical DOM refs missing. Widget will not initialize.');
    return;
  }

  // Typewriter placeholder
  const typewriterEl = $('#typewriter');
  const typewriterTextEl = $('#typewriterText');
  const typewriterPhrases = [
    'asking about Ryan\'s product strategy...',
    'pasting a job link for fit...',
    'asking about the dashboard redesign...',
    'exploring AI product design work...',
    'asking about cross-functional leadership...',
    'checking role fit for Staff Designer...',
  ];
  let twIndex = 0;
  let twChar = 0;
  let twDeleting = false;
  let twTimer = null;

  function typewriterLoop() {
    if (!typewriterEl || !typewriterTextEl) return;
    if (inputEl.value.length > 0) {
      typewriterEl.style.display = 'none';
      clearTimeout(twTimer);
      return;
    }
    typewriterEl.style.display = 'flex';
    const current = typewriterPhrases[twIndex];
    if (!twDeleting) {
      twChar++;
      typewriterTextEl.textContent = current.substring(0, twChar);
      if (twChar === current.length) {
        twTimer = setTimeout(() => { twDeleting = true; typewriterLoop(); }, 2000);
        return;
      }
      twTimer = setTimeout(typewriterLoop, 50 + Math.random() * 40);
    } else {
      twChar--;
      typewriterTextEl.textContent = current.substring(0, twChar);
      if (twChar === 0) {
        twDeleting = false;
        twIndex = (twIndex + 1) % typewriterPhrases.length;
        twTimer = setTimeout(typewriterLoop, 300);
        return;
      }
      twTimer = setTimeout(typewriterLoop, 25 + Math.random() * 20);
    }
  }
  typewriterLoop();

  inputEl.addEventListener('input', () => {
    if (inputEl.value.length > 0) {
      typewriterEl.style.display = 'none';
      clearTimeout(twTimer);
    } else {
      twChar = 0;
      twDeleting = false;
      clearTimeout(twTimer);
      typewriterLoop();
    }
  });

  // Small helper: escape HTML when interpolating untrusted strings
  function escapeHtml(value = '') {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function createPillButton(text) {
    const btn = document.createElement('button');
    btn.className = 'pill';
    btn.dataset.prompt = String(text || '');
    btn.textContent = String(text || '');
    return btn;
  }

  function setPillsFromArray(pills) {
    const pillsContainer = $('#pills');
    if (!pillsContainer) return;
    pillsContainer.innerHTML = '';
    (Array.isArray(pills) ? pills : []).forEach(p => pillsContainer.appendChild(createPillButton(p)));
  }

  function resolveAnswerStyle(text, history) {
    const t = String(text || '').toLowerCase();
    if (/\b(tell me more|go deeper|more detail|explain more|elaborate|expand on|walk me through)\b/.test(t)) {
      return 'detailed';
    }
    const userMsgs = (history || []).filter(m => m.role === 'user');
    if (userMsgs.length >= 2) {
      const prev = userMsgs[userMsgs.length - 2]?.content?.toLowerCase() || '';
      if (/\b(this case|that project|follow up|follow-up)\b/.test(t)) return 'detailed';
      if (t.length < 100 && /\b(more|why|how|what about)\b/.test(t) && prev.length > 20) return 'detailed';
    }
    return 'concise';
  }

  function scrollToBottom(smooth = true) {
    if (!msgsEl) return;
    if (smooth) {
      msgsEl.scrollTo({
        top: msgsEl.scrollHeight,
        behavior: 'smooth'
      });
    } else {
      msgsEl.scrollTop = msgsEl.scrollHeight;
    }
  }


  function clearChat() {
    state.history = [];
    try { sessionStorage.removeItem('rs_chat_history'); } catch(e) {}
    msgsEl.innerHTML = '';
    seedIntro();
    setPagePills();
    if (inputEl) {
      inputEl.value = '';
    }
  }

  // --- Seeded intro message (hide on type/submit, reappear on hard refresh) ---

// 1) Put your message here
const SEED_TEXT =
'Ask how Ryan’s case studies demonstrate product judgment, design leadership, or fit for a role. Paste a job description or link, and I’ll map the strongest evidence.';

// 2) Storage flag and reload detection
const SEED_KEY = 'ai.hasAsked';
const navEntry = performance.getEntriesByType?.('navigation')?.[0];
const IS_RELOAD = navEntry
? navEntry.type === 'reload'
: (performance.navigation && performance.navigation.type === 1);

// 3) Seed helpers
let seedNode = null;

function seedIntro() {
  if (!msgsEl || seedNode) return;
  seedNode = document.createElement('div');
  seedNode.className = 'msg bot';
  seedNode.dataset.seeded = 'true';
  seedNode.textContent = SEED_TEXT; // textContent avoids stray HTML/whitespace
  msgsEl.appendChild(seedNode);
  scrollToBottom(false);
}

function hideSeedAndRemember() {
if (seedNode && seedNode.isConnected) seedNode.remove();
seedNode = null;
// Keep hidden across navigation; we ignore this on hard refresh.
try { localStorage.setItem(SEED_KEY, '1'); } catch {}
}

// 4) Show the seed now (unless user has already interacted and this isn’t a hard refresh)
const savedHist = (() => { try { return JSON.parse(sessionStorage.getItem('rs_chat_history') || '[]'); } catch { return []; } })();

if (savedHist.length > 0) {
  // If we have history, don't show seed, just hide and remember
  hideSeedAndRemember();
} else if (IS_RELOAD) {
  // On a true reload with no history, show the seed again
  seedIntro();
} else {
  const hasAsked = (() => { try { return localStorage.getItem(SEED_KEY) === '1'; } catch { return false; } })();
  if (!hasAsked) seedIntro();
}

// We’ll also hide on send() below (belt-and-suspenders)

  let lastFocusedEl = null;

  function openPanel(){
    lastFocusedEl = document.activeElement;

    // Sync typed text from mini input
    const miniInput = document.getElementById('ai-mini-input');
    if (miniInput && miniInput.value) {
      inputEl.value = miniInput.value;
    }

    panel.classList.add('open');
    backdrop.classList.add('open');

    if (window.gsap) {
      const miniWrapper = document.querySelector('.ai-mini-wrapper');
      if (miniWrapper) gsap.to(miniWrapper, { opacity: 0, duration: 0.2, ease: "power2.out" });

      const fullHeight = window.innerHeight - 24;

      gsap.fromTo(panel,
        { height: 80 },
        { height: fullHeight, duration: 0.6, ease: "power3.inOut" }
      );

      const childrenToAnimate = shadow.querySelectorAll('.hdr, .msgs, .pills, .hire-card');
      gsap.fromTo(childrenToAnimate,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, stagger: 0.05, ease: "power3.out", delay: 0.15 }
      );
    } else {
      // Fallback: ensure panel has full height without GSAP
      panel.style.height = `${window.innerHeight - 24}px`;
    }

    (inputEl || panel)?.focus?.();
  }

  function closePanel(){
    // Sync typed text back to mini input
    const miniInput = document.getElementById('ai-mini-input');
    if (miniInput) {
      miniInput.value = inputEl.value;
    }

    if (window.gsap) {
      const childrenToAnimate = shadow.querySelectorAll('.hdr, .msgs, .pills, .hire-card');
      gsap.to(childrenToAnimate, { y: 15, opacity: 0, duration: 0.25, ease: "power2.in" });

      gsap.to(panel, {
        height: 80,
        duration: 0.5,
        ease: "power3.inOut",
        onComplete: () => {
          panel.classList.remove('open');
          backdrop.classList.remove('open');
          panel.style.height = '';
          const miniWrapper = document.querySelector('.ai-mini-wrapper');
          if (miniWrapper) gsap.to(miniWrapper, { opacity: 1, duration: 0.3, ease: "power2.out" });
        }
      });
    } else {
      // Fallback: close immediately without GSAP
      panel.classList.remove('open');
      backdrop.classList.remove('open');
      panel.style.height = '';
      const miniWrapper = document.querySelector('.ai-mini-wrapper');
      if (miniWrapper) miniWrapper.style.opacity = '1';
    }
    
    try { lastFocusedEl?.focus?.(); } catch {}
    lastFocusedEl = null;
  }
  
  function togglePanel(){ panel.classList.contains('open') ? closePanel() : openPanel(); }

  function wireExternalTrigger() {
    const triggers = document.querySelectorAll('[data-assistant-trigger]');
    triggers.forEach((ask) => {
      ask.addEventListener('click', (e) => {
        e.preventDefault();
        lastFocusedEl = ask;
        openPanel();
      });
    });
    
    const miniInput = document.getElementById('ai-mini-input');
    if (miniInput) {
      miniInput.addEventListener('focus', () => {
        if (!panel.classList.contains('open')) openPanel();
      });
      miniInput.addEventListener('click', () => {
        if (!panel.classList.contains('open')) openPanel();
      });
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireExternalTrigger);
  } else {
    wireExternalTrigger();
  }

  backdrop?.addEventListener('click', closePanel);
  $('#hdrClose')?.addEventListener('click', closePanel);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && panel.classList.contains('open')) closePanel(); });

  // Focus trap inside the drawer (accessibility + UX polish)
  function getFocusable() {
    return [...shadow.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )].filter(el => el && panel.contains(el) && el.offsetParent !== null);
  }

  shadow.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    if (!panel.classList.contains('open')) return;
    const focusables = getFocusable();
    if (!focusables.length) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = shadow.activeElement;

    if (e.shiftKey) {
      if (active === first || active === panel) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (active === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  // 5) Chat logic
  const state = { history: [], kb: null, sectionContext: null };
  let inFlight = false;
  let streamAborted = false;
  let currentController = null;
  let lastInteraction = Date.now();
  try {
    const saved = sessionStorage.getItem('rs_chat_history');
    if (saved) {
      state.history = JSON.parse(saved);
      // Immediately render history
      state.history.forEach(m => {
        // use an internal silent render to avoid saving again during loop
        const div = document.createElement('div');
        div.className = `msg ${m.role === 'user' ? 'user' : 'bot'}`;
        if (m.role === 'user') {
          div.textContent = m.content;
        } else {
          try {
            div.innerHTML = parseMarkdown(m.content);
          } catch (err) {
            console.warn('Portfolio Chat: parseMarkdown failed on history replay, using plain text fallback', err);
            div.textContent = String(m.content || '');
          }
        }
        msgsEl.appendChild(div);
      });
      // scroll to bottom
      setTimeout(() => { scrollToBottom(false); }, 50);
    }
  } catch(e) {}

  function saveHistory() {
    try {
      const capped = state.history.slice(-12).map(m => ({
        role: m.role,
        content: String(m.content || '').slice(0, 4000)
      }));
      sessionStorage.setItem('rs_chat_history', JSON.stringify(capped));
    } catch(e) {}
  }

  // Load KB once (optional)
  async function ensureKbLoaded() {
    if (state.kb) return state.kb;
    try {
      // Cache-friendly: KB changes infrequently and helps first-response speed.
      const r = await fetch('/assets/portfolio-kb.json', { cache: 'force-cache' });
      if (!r.ok) return null;
      const j = await r.json();
      state.kb = j;
      return j;
    } catch {
      return null;
    }
  }

  ensureKbLoaded().catch(() => {});

  // ─── Page-Aware Smart Pills ──────────────────────────────────────────────
  const PAGE_PILLS = {
    '/dashboard.html': [
      "What was Ryan's role on the dashboard project?",
      "How did it achieve +71% engagement?",
      "Why fit at [Company]?"
    ],
    '/inventory.html': [
      "Walk me through the spreadsheet-to-live-view decision.",
      "Why ship an MVP first?",
      "Why fit at [Company]?"
    ],
    '/ai-coding-portfolio.html': [
      "How did Ryan build this portfolio with AI?",
      "What tools and workflow did he use?",
      "Why fit at [Company]?"
    ],
    '/about.html': [
      "Tell me about Ryan's mentorship work.",
      "What makes Ryan a strong design leader?",
      "Why fit at [Company]?"
    ],
    '/member-portal-overhaul.html': [
      "What is the member portal overhaul about?",
      "When will this case study be published?",
      "Why fit at [Company]?"
    ],
    '/index.html': [
      "Why is Ryan a fit at [Company]?",
      "How does Ryan approach AI in product UX?",
      "Which case study best fits [product]?"
    ],
    '/': [
      "Why is Ryan a fit for this role?",
      "Show strongest proof points.",
      "Which case study should I read first?"
    ]
  };

  function canonicalPagePath(pathname = '') {
    const path = String(pathname || '').replace(/\/$/, '') || '/';
    if (path === '/index.html') return '/';
    const pagesMatch = path.match(/^\/pages\/(.+)$/);
    if (pagesMatch) return '/' + pagesMatch[1];
    return path;
  }

  function setPagePills(customPills) {
    const pillsContainer = $('#pills');
    if (!pillsContainer) return;
    const path = canonicalPagePath(location.pathname);
    const kbChips = state.kb?.chips?.default;
    const pills = customPills || PAGE_PILLS[path] || kbChips || PAGE_PILLS['/'];
    setPillsFromArray(pills);
  }

  // Set pills on load
  setPagePills();

  function isSafeHref(href = '') {
    const value = String(href || '').trim();
    return (
      /^https:\/\//i.test(value) ||
      /^http:\/\//i.test(value) ||
      /^\//.test(value) ||
      /^\.\//.test(value) ||
      /^#/.test(value) ||
      /^mailto:/i.test(value)
    );
  }
  
  function renderInlineMarkdown(text = '') {
    // Step 1: Tokenize links FIRST, before any escaping, so we can preserve
    // them through the escape pass without double-escaping their labels.
    // Allow up to one level of nested parens in URLs (Wikipedia, GitHub, etc.).
    const linkTokens = [];
    let tokenized = String(text || '').replace(
      /\[([^\]]+)\]\(((?:[^()]|\([^)]*\))+)\)/g,
      (match, label, href) => {
        const idx = linkTokens.length;
        linkTokens.push({ label, href });
        return `\u0000LINK${idx}\u0000`;
      }
    );

    // Step 2: Escape the full string (links are now placeholder tokens, safe).
    let html = escapeHtml(tokenized);

    // Step 3: Bold runs on escaped text. Safe because **text** has no entities.
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Step 4: Restore links, escaping label and href independently.
    // Defensive: if a stray token appears with no matching entry (rare, but
    // possible if the model echoes the placeholder string), preserve the raw
    // match instead of throwing.
    html = html.replace(/\u0000LINK(\d+)\u0000/g, (match, idx) => {
      const token = linkTokens[Number(idx)];
      if (!token) return match;

      const { label, href } = token;
      const safeHref = String(href || '').trim();

      if (!isSafeHref(safeHref)) {
        // Unsafe: render label as plain escaped text, drop the link.
        return escapeHtml(label);
      }

      // Allow inline **bold** inside the label.
      let safeLabel = escapeHtml(label).replace(
        /\*\*([^*]+)\*\*/g,
        '<strong>$1</strong>'
      );

      const escapedHref = escapeHtml(safeHref);
      const isExternal = /^https?:\/\//i.test(safeHref);
      const targetAttrs = isExternal
        ? ' target="_blank" rel="noopener noreferrer"'
        : '';

      return `<a href="${escapedHref}"${targetAttrs}>${safeLabel}</a>`;
    });

    return html;
  }
  
  function parseMarkdown(text = '') {
    const lines = String(text || '').replace(/\r/g, '').split('\n');
    const blocks = [];
    let paragraph = [];
    let listItems = [];
  
    function flushParagraph() {
      if (!paragraph.length) return;
  
      const html = paragraph.join(' ').trim();
      if (html) {
        blocks.push(`<p>${renderInlineMarkdown(html)}</p>`);
      }
  
      paragraph = [];
    }
  
    function flushList() {
      if (!listItems.length) return;
  
      const items = listItems
        .map(item => `<li>${renderInlineMarkdown(item)}</li>`)
        .join('');
  
      blocks.push(`<ul>${items}</ul>`);
      listItems = [];
    }
  
    for (const rawLine of lines) {
      const line = rawLine.trim();
  
      if (!line) {
        flushParagraph();
        flushList();
        continue;
      }
  
      // Support both bullet (-, *, •) and numbered (1., 2., 3.) list syntax.
      const bullet = line.match(/^[-*•]\s+(.+)$/);
      const numbered = line.match(/^\d+[.)]\s+(.+)$/);
      const listMatch = bullet || numbered;

      if (listMatch) {
        flushParagraph();
        listItems.push(listMatch[1]);
        continue;
      }
  
      flushList();
      paragraph.push(line);
    }
  
    flushParagraph();
    flushList();
  
    return blocks.join('');
  }

  function sanitizeAnswer(text) {
    let s = String(text || '');
    // Strip stray JSON wrapper if the model leaked it (e.g. {"answer": "..."})
    s = s.replace(/^\s*\{\s*"answer"\s*:\s*"/, '');
    s = s.replace(/"\s*,?\s*"suggested_pills"[\s\S]*$/, '');
    s = s.replace(/"\s*\}\s*$/, '');
    // Unescape JSON string escapes that may have leaked through
    s = s.replace(/\\n/g, '\n').replace(/\\t/g, ' ').replace(/\\"/g, '"');
    // Remove trailing comma from bullet lines: "- Some text," → "- Some text."
    s = s.replace(/^(\s*[-*•]\s+.+),\s*$/gm, '$1.');
    return s.trim();
  }

  function renderHireCard(container) {
    const card = document.createElement('div');
    card.className = 'hire-card';
  
    const title = document.createElement('div');
    title.className = 'hire-card-title';
    title.textContent = "Let's talk";
  
    const copy = document.createElement('p');
    copy.textContent = "If Ryan looks close to what you're hiring for, LinkedIn is the fastest way to start a real conversation.";
  
    const actions = document.createElement('div');
    actions.className = 'hire-card-actions';
  
    const linkedin = document.createElement('a');
    linkedin.href = 'https://www.linkedin.com/in/ryanschmidt1989/';
    linkedin.target = '_blank';
    linkedin.rel = 'noopener noreferrer';
    linkedin.textContent = 'Connect on LinkedIn ↗';
  
    actions.appendChild(linkedin);
  
    const resumeUrl = state.kb?.links?.resume_pdf;
    if (resumeUrl) {
      const resume = document.createElement('a');
      resume.href = resumeUrl;
      resume.target = '_blank';
      resume.rel = 'noopener noreferrer';
      resume.textContent = 'View resume';
      actions.appendChild(resume);
    }
  
    card.appendChild(title);
    card.appendChild(copy);
    card.appendChild(actions);
    container.appendChild(card);
  }

  function renderErrorMessage(thinking, message, originalText) {
    thinking.innerHTML = '';

    const text = document.createElement('div');
    text.textContent = message;
    thinking.appendChild(text);

    const retry = document.createElement('button');
    retry.className = 'pill';
    retry.style.marginTop = '8px';
    retry.textContent = 'Try again';
    retry.addEventListener('click', () => {
      thinking.remove();
      send(originalText);
    });
    thinking.appendChild(retry);

    state.history.push({ role: 'assistant', content: message });
    saveHistory();
    setPagePills();
  }

  function renderSources(container, sources) {
    if (!Array.isArray(sources) || !sources.length) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'chat-sources';
    const label = document.createElement('div');
    label.className = 'chat-sources-label';
    label.textContent = 'Sources';
    const list = document.createElement('ul');
    list.className = 'chat-sources-list';
    sources.forEach(s => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = s.url;
      a.textContent = s.title || s.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      li.appendChild(a);
      list.appendChild(li);
    });
    wrapper.appendChild(label);
    wrapper.appendChild(list);
    container.appendChild(wrapper);
  }

  function renderContextCases(container, contextCases) {
    if (!Array.isArray(contextCases) || !contextCases.length) return;
    const wrap = document.createElement('div');
    wrap.className = 'chat-sources';

    const label = document.createElement('div');
    label.className = 'chat-sources-label';
    label.textContent = 'Based on';

    const list = document.createElement('ul');
    list.className = 'chat-sources-list';
    contextCases.slice(0, 2).forEach((c) => {
      const li = document.createElement('li');
      if (c?.url) {
        const a = document.createElement('a');
        a.href = c.url;
        a.textContent = c.title || c.url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        li.appendChild(a);
      } else {
        li.textContent = c?.title || '';
      }
      list.appendChild(li);
    });

    wrap.appendChild(label);
    wrap.appendChild(list);
    container.appendChild(wrap);
  }

  function render(role, text) {
    const div = document.createElement('div');
    div.className = `msg ${role === 'user' ? 'user' : 'bot'}`;
    if (role === 'user') {
      div.textContent = text;
    } else {
      try {
        div.innerHTML = parseMarkdown(text);
      } catch (err) {
        console.warn('Portfolio Chat: parseMarkdown failed in render, using plain text fallback', err);
        div.textContent = String(text || '');
      }
    }
    msgsEl.appendChild(div);
    scrollToBottom(false);
    return div;
  }

  async function renderProgressive(container, finalHtml, rawText) {
    const total = rawText?.length || finalHtml.length;
    const SKIP = total < 80;
  
    if (SKIP || document.hidden) {
      container.innerHTML = finalHtml;
      scrollToBottom(true);
      return;
    }
  
    try {
      // Parse the final HTML once, into a detached fragment.
      const template = document.createElement('template');
      template.innerHTML = finalHtml;
  
      container.innerHTML = '';
      const cursor = document.createElement('span');
      cursor.className = 'cursor';
      cursor.setAttribute('aria-hidden', 'true');
      cursor.textContent = '▍';
      container.appendChild(cursor);
  
      const TYPE_DELAY = total > 600 ? 2 : total > 300 ? 4 : 8;
  
      async function streamNode(node, parent) {
        if (streamAborted) return;
        
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent;
          const textNode = document.createTextNode('');
          parent.insertBefore(textNode, cursor);
  
          for (let i = 0; i < text.length; i++) {
            if (streamAborted) return;
            textNode.data += text[i];
            if (i % 3 === 0) {
              scrollToBottom(false);
              await new Promise(r => setTimeout(r, TYPE_DELAY));
            }
          }
          return;
        }
  
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = document.createElement(node.tagName);
          for (const attr of node.attributes) {
            el.setAttribute(attr.name, attr.value);
          }
          parent.insertBefore(el, cursor);
  
          const isVoid = ['IMG', 'BR', 'HR'].includes(node.tagName.toUpperCase());
          if (!isVoid) {
            for (const child of Array.from(node.childNodes)) {
              if (streamAborted) return;
              await streamNode(child, el);
            }
          }
        }
      }
  
      for (const child of Array.from(template.content.childNodes)) {
        await streamNode(child, container);
      }

      if (streamAborted) {
        // User clicked stop: render full response instantly
        container.innerHTML = finalHtml;
        scrollToBottom(true);
        return;
      }

      cursor.remove();
      scrollToBottom(true);
    } catch (error) {
      console.warn('Portfolio Chat: streaming failed, falling back to instant render', error);
      container.innerHTML = finalHtml;
      scrollToBottom(true);
    }
  }

  async function send(optionalText) {

    const text = (typeof optionalText === 'string' ? optionalText : inputEl.value).trim();
    if (!text) return;
    if (inFlight) return;

    // URLs are handled server-side — send them through to the API

    inFlight = true;
    streamAborted = false;
    sendBtn.disabled = true;
    sendBtn.setAttribute('aria-busy', 'true');

    if (currentController) {
      try { currentController.abort(); } catch {}
    }
    currentController = new AbortController();
    currentController.signal.addEventListener('abort', () => {
      streamAborted = true;
    });

    if (typeof optionalText !== 'string') {
      inputEl.value = '';
    }

    // Any real interaction should clear the seeded intro.
    hideSeedAndRemember();

    render('user', text);
    state.history.push({ role:'user', content:text });
    saveHistory();

    const answerStyle = resolveAnswerStyle(text, state.history);

    // Dynamic loading state
    const thinking = document.createElement('div');
    thinking.className = 'msg bot';

    const loadingPhrases = [
      "Finding the strongest evidence...",
      "Checking case-study context...",
      "Mapping the answer for this role...",
      "Finishing the response..."
    ];
    let phraseIndex = 0;

    const updateLoadingText = () => {
      thinking.innerHTML = `
        <span class="loading-text">${escapeHtml(loadingPhrases[phraseIndex])}</span>
        <span class="loading-dots" aria-hidden="true">
          <span></span><span></span><span></span>
        </span>
        <button type="button" class="stop-btn" aria-label="Stop generating">Stop</button>
      `;
      
      const stopBtn = thinking.querySelector('.stop-btn');
      if (stopBtn) {
        stopBtn.addEventListener('click', () => {
          if (currentController) {
            currentController.abort();
            streamAborted = true;
          }
        });
      }
    };

    updateLoadingText();
    msgsEl.appendChild(thinking);
    scrollToBottom(true);

    const phraseInterval = setInterval(() => {
      phraseIndex = Math.min(phraseIndex + 1, loadingPhrases.length - 1);
      const textEl = thinking.querySelector('.loading-text');
      if (textEl) textEl.textContent = loadingPhrases[phraseIndex];
    }, 1500);

    try {
      // Best effort: make sure KB is available before calling the server.
      // The server also has its own fallback, so this is just extra reliability.
      await ensureKbLoaded();

      const chatApi = (window.RS_CHAT_API || '/api/chat');
      const pageContext = {
        url: location.pathname
      };
      if (document.title) pageContext.title = document.title;
      const desc = document.querySelector('meta[name="description"]')?.content;
      if (desc) pageContext.description = desc;

      const payload = {
        messages: state.history.slice(-12),
        answerStyle,
        pageContext
      };
      if (state.sectionContext) payload.sectionContext = state.sectionContext;

      const res = await fetch(chatApi, {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify(payload),
        signal: currentController.signal
      });

      state.sectionContext = null;

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        renderErrorMessage(thinking, `I'm having trouble reaching the assistant right now (${res.status}). Try again in a moment, or ask something narrower like "Why is Ryan a fit for this role?"`, text);
        return;
      }

      let ans = (data && data.answer)
  ? String(data.answer)
  : "I didn't get enough to answer that well. Try role fit, a case study, research approach, IA, or design systems.";

      if (data.suggested_pills && Array.isArray(data.suggested_pills) && data.suggested_pills.length) {
        const pillsContainer = $('#pills');
        if (pillsContainer) {
          setPillsFromArray(data.suggested_pills);
        }
      }

      lastInteraction = Date.now();

      const html = parseMarkdown(sanitizeAnswer(ans));
      clearInterval(phraseInterval);

      try {
        await renderProgressive(thinking, html, ans);
      } catch (e) {
        console.warn('Portfolio Chat: Progressive rendering failed, falling back to instant render', e);
        thinking.innerHTML = html;
        scrollToBottom(true);
      }

      // Feature 1: Hire Intent card
      if (data.hire_intent === true) {
        renderHireCard(thinking);
      }

      // Trust: show which case(s) this answer is based on
      if (Array.isArray(data.context_cases) && data.context_cases.length) {
        renderContextCases(thinking, data.context_cases);
        scrollToBottom(true);
      }

      // Phase 2: DOM-Aware Navigation & Highlighting
      if (data.action_scroll_to) {
        try {
          const target = document.querySelector(data.action_scroll_to);
          if (target) {
            if (window.lenis) {
              window.lenis.scrollTo(target, { offset: -80 });
            } else {
              target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            // Close widget on mobile so they can see the scrolled content
            if (window.innerWidth < 768) closePanel();
          }
        } catch(e) {}
      }

      if (data.action_highlight) {
        try {
          let target = null;
          try {
            target = document.querySelector(data.action_highlight);
          } catch (selectorError) {
            // Not a valid CSS selector, fallback to text search
          }

          if (!target) {
            const root = document.querySelector('main') || document.body;
            const candidates = root.querySelectorAll('p, li, h2, h3, .metric');
            const needle = data.action_highlight.toLowerCase();

            for (const el of candidates) {
              if (el.textContent.toLowerCase().includes(needle)) {
                target = el;
                break;
              }
            }
          }

          if (target) {
            if (window.lenis) {
              window.lenis.scrollTo(target, { offset: -80 });
            } else {
              target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }

            // Apply visual highlight using CSS class
            target.classList.add('rs-chat-highlight');
            setTimeout(() => {
              target.classList.remove('rs-chat-highlight');
            }, 3000);
          }
        } catch(e) {}
      }

      state.history.push({ role:'assistant', content: ans });
      saveHistory();
    } catch (e) {
      if (e.name === 'AbortError') {
        thinking.remove();
      } else {
        renderErrorMessage(thinking, 'Something went wrong on my end (network/response error). Try again, or rephrase the question a bit more specifically.', text);
      }
    } finally {
      inFlight = false;
      sendBtn.disabled = false;
      sendBtn.removeAttribute('aria-busy');
      clearInterval(phraseInterval);
    }
  }

  // Pill reset timer - reset to page pills after 5 minutes of inactivity
  setInterval(() => {
    if (Date.now() - lastInteraction > 300000) {
      setPagePills();
    }
  }, 30000);

  // 6) Handlers
  sendBtn.addEventListener('click', () => {
    const val = (inputEl?.value || '').trim();
    if (val.length) hideSeedAndRemember(); // clear ONLY when Ask is clicked with real input
    send();
  });

  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if ((inputEl.value || '').trim()) hideSeedAndRemember();
      send();
    }
  });

  // Pills → send or populate
  shadow.addEventListener('click', (e) => {
    const chip = e.target.closest('.pill');
    if (chip) {
      const prompt = chip.getAttribute('data-prompt') || chip.textContent;
      
      // If it contains a bracketed placeholder, populate input and highlight it
      if (prompt.includes('[') && prompt.includes(']')) {
        inputEl.value = prompt;
        inputEl.focus();

        // Select the bracketed text so the user can easily type over it
        const start = prompt.indexOf('[');
        const end = prompt.indexOf(']') + 1;
        inputEl.setSelectionRange(start, end);
      } else {
        send(prompt);
      }
    }
  });

  // Feature 4: Listen for "Ask About This Section" events from the main document
  document.addEventListener('rs:ask-section', (e) => {
    const prompt = e?.detail?.prompt;
    const sectionContext = e?.detail?.sectionContext;
    if (prompt && typeof prompt === 'string') {
      if (sectionContext && typeof sectionContext === 'object') {
        state.sectionContext = sectionContext;
      }
      openPanel();
      send(prompt);
    }
  });

  // No auto-open
})();
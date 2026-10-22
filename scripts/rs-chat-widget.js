// scripts/rs-chat-widget.js
(() => {
  const HOST_ID = 'rs-chat-widget-root';
  if (document.getElementById(HOST_ID)) return; // avoid double injection



  // Session token: persists per tab (sessionStorage), generated once per session
  const SESSION_KEY = 'rs_chat_session_token';
  function getOrCreateSessionToken() {
    try {
      let token = sessionStorage.getItem(SESSION_KEY);
      if (token) return token;
      token = crypto.randomUUID ? crypto.randomUUID() : 's_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem(SESSION_KEY, token);
      return token;
    } catch {
      return 's_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    }
  }

  // 1) Host + Shadow
  const host = document.createElement('div');
  host.id = HOST_ID;
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: 'open' });

  // 2) UI (Shadow DOM) — minimal, robust, no FAB
  shadow.innerHTML = `
    <style>
      :host {
        all: initial;
        --font-sans: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
        --accent: #C86446;
        --accent-hover: #B25337;
        --accent-soft: rgba(200, 100, 70, 0.08);
        --accent-strong: rgba(200, 100, 70, 0.16);
        --text-primary: #111111;
        --text-secondary: #52525B;
        --text-on-accent: #FFFFFF;
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
      
      /* Use site tokens with explicit fallbacks */
      .ui, .ui * {
        font-family: var(--font-sans);
        font-size: 14.5px;
        line-height: 1.55;
        font-weight: 400;
        font-synthesis: none;
        box-sizing: border-box;
      }
      .ui *, .ui *::before, .ui *::after { box-sizing: inherit; }

      /* Drawer — Elementary School Wide-Ruled Notebook */
      .panel {
        position: fixed;
        top: auto;
        right: 20px;
        bottom: calc(20px + env(safe-area-inset-bottom, 0px));
        width: min(600px, calc(100vw - 28px));
        height: min(900px, calc(100vh - 40px));
        max-height: calc(100vh - 40px);
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        background: #FFFDF8;
        color: var(--text-primary);
        border-radius: 0 !important;
        clip-path: polygon(0% 0.35%, 30% 0%, 70% 0.3%, 100% 0.1%, 99.7% 35%, 100% 70%, 99.7% 100%, 65% 99.7%, 30% 100%, 0% 99.7%, 0.3% 65%, 0.1% 30%);
        border-top: 2.5px solid rgba(255, 255, 255, 0.95);
        border-left: 2px solid rgba(70, 50, 30, 0.18);
        border-right: 2px solid rgba(70, 50, 30, 0.18);
        border-bottom: 4px solid rgba(70, 50, 30, 0.32);
        box-shadow:
          0 4px 6px rgba(45, 30, 15, 0.2),
          0 16px 28px rgba(45, 30, 15, 0.28),
          0 36px 70px rgba(45, 30, 15, 0.32);
        visibility: hidden;
        opacity: 0;
        pointer-events: none;
        transform: translateY(18px) scale(0.985);
        transition: transform 260ms cubic-bezier(0.16, 1, 0.3, 1), opacity 200ms ease, visibility 200ms ease;
        z-index: 2147482999;
        overflow: hidden;
      }

      /* Elementary School Red Vertical Margin Line */
      .panel::after {
        content: "";
        position: absolute;
        top: 60px;
        bottom: 68px;
        left: 46px;
        width: 2px;
        background: rgba(239, 68, 68, 0.4); /* Classic red loose-leaf margin line */
        pointer-events: none;
        z-index: 4;
      }

      /* Scotch Tape pinning top of the notebook */
      .panel::before {
        content: "";
        position: absolute;
        top: -10px;
        left: 50%;
        transform: translateX(-50%) rotate(1deg);
        width: 90px;
        height: 24px;
        background: linear-gradient(
          135deg,
          rgba(255, 255, 255, 0.45) 0%,
          rgba(255, 255, 255, 0.75) 50%,
          rgba(255, 255, 255, 0.4) 100%
        );
        box-shadow: 0 1px 3px rgba(40, 25, 12, 0.14), inset 0 0 2px rgba(255, 255, 255, 0.6);
        border-left: 2px dotted rgba(255, 255, 255, 0.85);
        border-right: 2px dotted rgba(255, 255, 255, 0.85);
        z-index: 10;
        pointer-events: none;
        border-radius: 0 !important;
      }
      @media (max-width: 640px) {
        .panel {
          left: 10px;
          right: 10px;
          bottom: calc(10px + env(safe-area-inset-bottom, 0px));
          width: auto;
          height: calc(100vh - 20px);
          max-height: calc(100vh - 20px);
        }
        .panel::after {
          left: 36px;
        }
      }
      .panel.open {
        visibility: visible;
        opacity: 1;
        pointer-events: auto;
        transform: translateY(0) scale(1);
      }
      .chat-body {
        display: flex;
        flex-direction: column;
        flex: 1 1 auto;
        min-height: 0;
        overflow: hidden;
      }

      /* School Assignment Header */
      .hdr {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 56px 12px 18px;
        background: #FAF7EE;
        border-bottom: 2px dashed rgba(70, 50, 30, 0.2);
        color: var(--text-primary);
        flex-shrink: 0;
        position: relative;
        z-index: 5;
      }
      .hdr-title-group {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
        flex: 1;
      }

      .hdr-title {
        margin: 0;
        font-weight: 700;
        font-size: 15px;
        letter-spacing: -0.015em;
        color: #1A1713;
      }
      .hdr-sub {
        margin: 0;
        font-size: 11px;
        color: #57534E;
        line-height: 1.35;
      }
      .hdr-actions {
        position: absolute;
        top: 14px;
        right: 16px;
        z-index: 20;
      }
      .hdr-close {
        width: 30px;
        height: 30px;
        border: 1px solid #DC2626;
        border-top: 1.5px solid rgba(255, 255, 255, 0.7);
        border-bottom: 2px solid #B91C1C;
        border-radius: 0 !important;
        background: #DC2626;
        color: #FFFFFF;
        font-size: 0.95rem;
        font-weight: 800;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
        filter: drop-shadow(0 1px 2px rgba(45, 30, 15, 0.25));
      }
      .hdr-close:hover {
        transform: translateY(-1px) scale(1.05);
        background: #DC2626;
      }
      .hdr-close:focus-visible {
        outline: none;
        box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.35);
      }

      /* Messages with Wide-Ruled Notebook Blue Lines */
      .msgs {
        list-style: none;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 16px 18px 14px 58px; /* Offset right of red margin line */
        background: transparent;
        background-image: repeating-linear-gradient(
          to bottom,
          transparent,
          transparent 27px,
          rgba(147, 197, 253, 0.42) 27px,
          rgba(147, 197, 253, 0.42) 28px
        );
        background-size: 100% 28px;
        flex: 1 1 auto;
        min-height: 0;
        overflow-y: auto;
        overflow-x: hidden;
        position: relative;
        z-index: 3;
        -webkit-mask-image: linear-gradient(to bottom, transparent 0%, #000 14px, #000 100%);
        mask-image: linear-gradient(to bottom, transparent 0%, #000 14px, #000 100%);
      }
      @media (max-width: 640px) {
        .msgs {
          padding-left: 46px;
        }
      }
      .msg {
        margin: 0;
        display: inline-block;
        max-width: 95%;
        word-break: break-word;
        overflow-wrap: anywhere;
        padding: 12px 16px;
        border-radius: 0 !important;
        font-size: 14px;
        line-height: 1.55;
      }
      /* User Message: Canary Yellow Sticky Note */
      .msg.user {
        white-space: pre-wrap;
        align-self: flex-end;
        background: #FEF08A; /* Canary yellow sticky */
        color: #1C1917;
        font-weight: 500;
        border-radius: 0 !important;
        clip-path: polygon(0% 0.8%, 50% 0%, 100% 0.7%, 99.4% 50%, 100% 100%, 50% 99.4%, 0% 100%, 0.6% 50%);
        border-top: 1.5px solid rgba(255, 255, 255, 0.85);
        border-left: 1px solid rgba(255, 255, 255, 0.4);
        border-right: 1px solid rgba(202, 138, 4, 0.4);
        border-bottom: 2.5px solid rgba(161, 98, 7, 0.6);
        filter: 
          drop-shadow(0 1px 2px rgba(45, 30, 15, 0.28))
          drop-shadow(1px 3px 6px rgba(45, 30, 15, 0.16));
        transform: rotate(-0.8deg);
      }
      /* Bot Message: White/Cream Ruled Paper Sheet */
      .msg.bot {
        align-self: flex-start;
        max-width: 100%;
        background: #FFFFFF;
        color: #1C1917;
        position: relative;
        line-height: 1.6;
        border-radius: 0 !important;
        clip-path: polygon(0% 0.4%, 50% 0%, 100% 0.45%, 99.6% 50%, 100% 100%, 50% 99.6%, 0% 100%, 0.4% 50%);
        border-top: 1.5px solid rgba(255, 255, 255, 0.95);
        border-left: 1.5px solid rgba(70, 50, 30, 0.14);
        border-right: 1.5px solid rgba(70, 50, 30, 0.14);
        border-bottom: 2.5px solid rgba(70, 50, 30, 0.24);
        filter: 
          drop-shadow(0 1px 2px rgba(45, 30, 15, 0.22))
          drop-shadow(1px 3px 8px rgba(45, 30, 15, 0.14));
      }
      .chat-action-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: 8px;
        padding-top: 6px;
        border-top: 2px dashed rgba(70, 50, 30, 0.14);
        font-family: var(--font-mono);
        font-size: 11px;
        color: #64748B;
      }
      .chat-copy-btn {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 3px 8px;
        border-radius: 0 !important;
        clip-path: polygon(0% 0.8%, 50% 0%, 100% 0.7%, 99.4% 50%, 100% 100%, 50% 99.4%, 0% 100%, 0.6% 50%);
        background: #F4ECDA;
        border: 1px solid #D8C7B2;
        font-family: var(--font-mono);
        font-size: 11px;
        font-weight: 600;
        color: #475569;
        cursor: pointer;
        filter: drop-shadow(0 1px 1px rgba(45, 30, 15, 0.15));
        transition: all 140ms ease;
      }
      .chat-copy-btn:hover {
        background: #FA5252;
        color: #FFFFFF;
        border-color: #E03131;
      }
      .chat-copy-btn.is-copied {
        background: #2B8A3E;
        color: #FFFFFF;
        border-color: #237032;
      }
      .chat-telemetry-tag {
        font-size: 10.5px;
        color: #8C7E6C;
        letter-spacing: 0.02em;
      }
      .chat-kpi-badge {
        display: inline-flex;
        align-items: baseline;
        font-family: var(--font-mono);
        font-size: 0.88em;
        font-weight: 700;
        letter-spacing: -0.01em;
        color: #FFFFFF;
        background: #1971C2;
        padding: 1px 5px;
        border-radius: 0 !important;
        margin: 0 1px;
      }
      .msg p { margin: 0; }
      .msg p + p { margin-top: 0.55em; }
      .msg ul { margin: 0.4em 0 0; padding-left: 1.25em; }
      .msg li { margin-bottom: 0.35em; }
      .msg li:last-child { margin-bottom: 0; }

      .msg.bot[data-seeded="true"] {
        background: linear-gradient(180deg, #FFFFFF 0%, #F9FAFB 100%);
        border: 1px solid rgba(15, 23, 42, 0.09);
        padding: 14px 16px;
      }
      .seed-eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-family: var(--font-mono);
        font-size: 10.5px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--accent);
        margin-bottom: 6px;
      }
      .seed-badges {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 10px;
      }
      .seed-badge {
        font-family: var(--font-mono);
        font-size: 10.5px;
        font-weight: 600;
        padding: 3px 8px;
        border-radius: 0 !important;
        clip-path: polygon(0% 0.8%, 50% 0%, 100% 0.7%, 99.4% 50%, 100% 100%, 50% 99.4%, 0% 100%, 0.6% 50%);
        background: #F4ECDA;
        color: #26211B;
        border: 1px solid #D8C7B2;
      }

      .msg.bot a {
        color: var(--accent);
        text-decoration: underline;
        text-decoration-color: rgba(250, 82, 82, 0.4);
        text-underline-offset: 2px;
        font-weight: 600;
        transition: color 150ms ease, text-decoration-color 150ms ease;
      }
      .msg.bot a:hover {
        color: var(--accent-hover);
        text-decoration-color: var(--accent);
      }
      .msg.bot strong {
        font-weight: 700;
        color: #1A1713;
      }

      /* Starter Discussion Pills (Colored Construction Paper Snippets) */
      .pills {
        display: flex;
        flex-wrap: wrap;
        gap: 7px;
        padding: 8px 18px 8px 58px;
        flex: 0 0 auto;
        position: relative;
        z-index: 5;
        background: #FAF7EE;
        border-top: 1.5px dashed rgba(70, 50, 30, 0.18);
      }
      @media (max-width: 640px) {
        .pills {
          padding-left: 46px;
        }
      }
      .pill {
        font: inherit;
        font-size: 12px;
        font-weight: 600;
        color: #26211B;
        background: #FFFDF9;
        border: 1px solid rgba(70, 50, 30, 0.2);
        border-radius: 0 !important;
        clip-path: polygon(0% 0.8%, 50% 0%, 100% 0.7%, 99.4% 50%, 100% 100%, 50% 99.4%, 0% 100%, 0.6% 50%);
        padding: 5px 11px;
        cursor: pointer;
        white-space: nowrap;
        opacity: 0;
        transform: translateY(8px) scale(0.98);
        filter: drop-shadow(0 1px 2px rgba(45, 30, 15, 0.16));
        transition: opacity 200ms ease, transform 200ms ease, background 150ms ease, color 150ms ease;
      }
      .pill:nth-child(1) { background: #FEF08A; border-color: #EAB308; color: #1C1917; }
      .pill:nth-child(2) { background: #BAE6FD; border-color: #60A5FA; color: #0C4A6E; }
      .pill:nth-child(3) { background: #D1FAE5; border-color: #34D399; color: #064E3B; }
      .pill:nth-child(4) { background: #FED7AA; border-color: #FB923C; color: #7C2D12; }
      .pills.show .pill {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
      .pills.show .pill:nth-child(1) { transition-delay: 0ms; }
      .pills.show .pill:nth-child(2) { transition-delay: 50ms; }
      .pills.show .pill:nth-child(3) { transition-delay: 100ms; }
      .pill:hover,
      .pill:focus-visible {
        transform: translateY(-2px);
        filter: drop-shadow(0 2px 4px rgba(45, 30, 15, 0.24));
      }
      .pill:active {
        transform: scale(0.97);
      }

      /* Input & Send */
      .inp {
        display: flex;
        align-items: center;
        gap: 0;
        padding: 10px 14px 14px;
        background: #FAF7EE;
        border-top: 1.5px dashed rgba(70, 50, 30, 0.18);
        box-sizing: border-box;
        position: relative;
        z-index: 6;
      }
      .text {
        flex: 1;
        font: inherit;
        font-size: 14px;
        background: #F4ECDA;
        border: 1.5px solid #D8C7B2;
        color: var(--text-primary);
        border-radius: 0 !important;
        clip-path: polygon(0% 0.6%, 50% 0%, 100% 0.5%, 99.6% 50%, 100% 100%, 50% 99.4%, 0% 100%, 0.4% 50%);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        padding: 0 3.25rem 0 1rem;
        height: 48px;
        box-sizing: border-box;
        -webkit-appearance: none;
        box-shadow: 
          inset 0 3px 6px rgba(45, 30, 15, 0.28),
          inset 0 1px 2px rgba(45, 30, 15, 0.35),
          inset 0 -1px 1px rgba(255, 255, 255, 0.7);
        transition: border-color 180ms ease, box-shadow 180ms ease, background 180ms ease;
      }
      .text:focus {
        outline: none;
        border-color: #FA5252;
        background: #FFFFFF;
        box-shadow: 
          inset 0 2px 4px rgba(45, 30, 15, 0.2),
          0 0 0 2px rgba(250, 82, 82, 0.25);
      }
      .text.shake {
        animation: shake 0.4s ease;
      }
      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        20% { transform: translateX(-8px); }
        40% { transform: translateX(8px); }
        60% { transform: translateX(-6px); }
        80% { transform: translateX(6px); }
      }
      .text::placeholder {
        color: #8C7E6C;
        font-weight: 500;
      }
      .send {
        position: absolute;
        right: 20px;
        border-radius: 0 !important;
        clip-path: polygon(0% 0.8%, 50% 0%, 100% 0.7%, 99.4% 50%, 100% 100%, 50% 99.4%, 0% 100%, 0.6% 50%);
        width: 34px;
        height: 34px;
        background: #FA5252;
        color: var(--text-on-accent);
        border: 1.5px solid #E03131;
        border-top: 1.5px solid rgba(255, 255, 255, 0.5);
        border-bottom: 2px solid #C92A2A;
        font-size: 1.05rem;
        cursor: pointer;
        display: grid;
        place-items: center;
        flex-shrink: 0;
        box-sizing: border-box;
        filter: drop-shadow(0 1px 2px rgba(45, 30, 15, 0.35)) drop-shadow(1px 3px 6px rgba(250, 82, 82, 0.3));
        transition: transform 200ms cubic-bezier(0.16, 1, 0.3, 1), background 180ms ease, filter 180ms ease;
      }
      .send:hover {
        transform: translateY(-2px);
        background: #E03131;
        filter: drop-shadow(0 2px 4px rgba(45, 30, 15, 0.4)) drop-shadow(2px 5px 10px rgba(250, 82, 82, 0.45));
      }
      .send:active {
        transform: scale(0.94);
      }
      .send:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none !important;
        filter: none !important;
      }

      /* Backdrop */
      .panel-backdrop {
        position: fixed;
        inset: 0;
        z-index: 2147482998;
        background: rgba(45, 30, 15, 0.25);
        backdrop-filter: blur(2px);
        -webkit-backdrop-filter: blur(2px);
        opacity: 0;
        visibility: hidden;
        pointer-events: none;
        transition: opacity 0.26s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.26s;
      }
      .panel-backdrop.open {
        opacity: 1;
        visibility: visible;
        pointer-events: auto;
      }

      /* Hire Intent CTA Card */
      .hire-card {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 6px;
        margin: 12px 0 4px;
        padding: 14px;
        background: #FFF9DB;
        border: 1.5px solid #FFD43B;
        border-radius: 0 !important;
        clip-path: polygon(0% 0.4%, 50% 0%, 100% 0.4%, 99.6% 50%, 100% 100%, 50% 99.6%, 0% 100%, 0.4% 50%);
        position: relative;
        overflow: hidden;
        filter: drop-shadow(0 1px 2px rgba(45, 30, 15, 0.22));
      }
      .hire-card-title {
        font-weight: 700;
        font-size: 14px;
        color: #1A1713;
      }
      .hire-card-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 6px;
      }
      .hire-card-actions a {
        display: inline-flex;
        align-items: center;
        padding: 6px 13px;
        border-radius: 0 !important;
        clip-path: polygon(0% 0.8%, 50% 0%, 100% 0.7%, 99.4% 50%, 100% 100%, 50% 99.4%, 0% 100%, 0.6% 50%);
        font-size: 12.5px;
        font-weight: 700;
        text-decoration: none;
        filter: drop-shadow(0 1px 2px rgba(45, 30, 15, 0.2));
        transition: transform 0.15s ease, opacity 0.15s ease;
      }
      .hire-card-actions a:first-child {
        background: #FA5252;
        color: #ffffff;
      }
      .hire-card-actions a:first-child:hover {
        opacity: 0.92;
        transform: translateY(-1px);
      }
      .hire-card-actions a:last-child {
        background: #FFFFFF;
        color: var(--text-primary);
        border: 1px solid rgba(70, 50, 30, 0.2);
      }

      /* Sources footnote */
      .chat-sources {
        margin-top: 10px;
        padding-top: 8px;
        border-top: 2px dashed rgba(70, 50, 30, 0.14);
      }
      .chat-sources-label {
        font-family: var(--font-mono);
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #8C7E6C;
        font-weight: 700;
        margin-bottom: 4px;
      }
      .chat-sources-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .chat-sources-list li {
        margin: 0;
      }
      .chat-sources-list a {
        display: inline-flex;
        align-items: center;
        font-size: 11.5px;
        font-weight: 600;
        padding: 2px 8px;
        border-radius: 0 !important;
        clip-path: polygon(0% 0.8%, 50% 0%, 100% 0.7%, 99.4% 50%, 100% 100%, 50% 99.4%, 0% 100%, 0.6% 50%);
        background: #F4ECDA;
        color: #1A1713;
        border: 1px solid #D8C7B2;
        text-decoration: none;
        filter: drop-shadow(0 1px 1px rgba(45, 30, 15, 0.12));
      }
      .chat-sources-list a:hover {
        background: #FEE440;
      }

      /* Dynamic loading state (loading-text + loading-dots + stop-btn) */
      .loading-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }
      .loading-left {
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }
      .loading-text {
        color: var(--text-secondary);
        font-size: 13px;
        font-weight: 500;
      }
      .loading-dots {
        display: inline-flex;
        align-items: center;
        gap: 3px;
      }
      .loading-dots span {
        width: 6px;
        height: 6px;
        border-radius: 0 !important;
        background: #FA5252;
        animation: rs-dot-bounce 1.2s infinite ease-in-out both;
      }
      .loading-dots span:nth-child(1) { animation-delay: -0.24s; }
      .loading-dots span:nth-child(2) { animation-delay: -0.12s; }
      .loading-dots span:nth-child(3) { animation-delay: 0s; }
      @keyframes rs-dot-bounce {
        0%, 80%, 100% { transform: scale(0.55); opacity: 0.4; }
        40% { transform: scale(1); opacity: 1; }
      }
      .stop-btn {
        font-family: var(--font-mono);
        font-size: 10.5px;
        font-weight: 700;
        padding: 3px 9px;
        border-radius: 0 !important;
        clip-path: polygon(0% 0.8%, 50% 0%, 100% 0.7%, 99.4% 50%, 100% 100%, 50% 99.4%, 0% 100%, 0.6% 50%);
        background: #F4ECDA;
        border: 1px solid #D8C7B2;
        color: #444444;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .stop-btn:hover {
        background: #FA5252;
        border-color: #E03131;
        color: #FFFFFF;
      }
      .stop-btn:hover {
        background: rgba(239, 68, 68, 0.1);
        border-color: rgba(239, 68, 68, 0.3);
        color: #DC2626;
      }

      /* Blinking cursor */
      .cursor {
        display: inline-block;
        width: 6px;
        height: 1.05em;
        background-color: var(--accent);
        vertical-align: text-bottom;
        margin-left: 3px;
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
              <h2 id="rs-chat-title" class="hdr-title">Ryan Schmidt · AI Discussion</h2>
              <p class="hdr-sub">Ask questions about Ryan's work, design process, or role fit.</p>
              <p id="rs-chat-desc" class="visually-hidden">
                Ask questions about Ryan's case studies, design work, or fit for a role.
              </p>
            </div>
            <div class="hdr-actions">
              <button class="hdr-close" id="hdrClose" aria-label="Close chat" type="button">✕</button>
            </div>
          </div>

          <div class="msgs" id="msgs" role="log" aria-live="polite" aria-relevant="additions text" aria-label="Chat conversation"></div>
        </div>

        <div class="pills" id="pills"></div>

        <div class="inp">
          <label for="input" class="visually-hidden">Ask Ryan's portfolio assistant</label>
          <input type="text" class="text" id="input" placeholder="Paste a job link or ask about Ryan's work..." aria-label="Ask a question about Ryan" aria-describedby="rs-chat-hint" autocomplete="off" />
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

  // Typewriter placeholder on external trigger
  const typewriterPhrases = [
    'asking about Ryan\'s product strategy...',
    'pasting a job link for fit...',
    'asking about the dashboard redesign...',
    'exploring AI product design work...',
    'asking about cross-functional leadership...',
    'checking role fit for Staff Designer...',
  ];
  

  

  function typewriterStop() {}

  // Restart typewriter when mini input is cleared manually
  
  // Will be called after wireExternalTrigger runs
  function initTypewriter() {}

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


  // clearChat removed — unused

  // --- Seeded intro message (hide on type/submit, reappear on hard refresh) ---

// 1) Put your message here
const SEED_TEXT =
'Ask me anything about Ryan’s work, past projects, or role fit. You can even paste a job description or link to see relevant case studies.';

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
  seedNode.innerHTML = `
    <div class="seed-eyebrow">✦ Portfolio Intelligence</div>
    <p>${escapeHtml(SEED_TEXT)}</p>
    <div class="seed-badges">
      <span class="seed-badge">Role-Fit Evaluation</span>
      <span class="seed-badge">Case Study Proof</span>
      <span class="seed-badge">Paste Job URL</span>
    </div>
  `;
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

  function getDockElements() {
    return document.querySelectorAll('.ai-mini-wrapper, .home-omnibar-section, .subpage-omnibar-dock');
  }

  function getActiveMiniInput() {
    return document.getElementById('ai-mini-input') || document.getElementById('home-omnibar-input');
  }

  function openPanel(){
    if (panel.classList.contains('open')) {
      (inputEl || panel)?.focus?.();
      return;
    }
    lastFocusedEl = document.activeElement;

    // Sync typed text from mini input
    const miniInput = getActiveMiniInput();
    if (miniInput && miniInput.value) {
      inputEl.value = miniInput.value;
    }

    // Immediately hide the bottom dock so it never overlaps or competes on screen
    const dockEls = getDockElements();
    dockEls.forEach(el => {
      el.style.opacity = '0';
      el.style.visibility = 'hidden';
      el.style.pointerEvents = 'none';
    });

    panel.classList.add('open');
    backdrop.classList.add('open');

    (inputEl || panel)?.focus?.();
    typewriterStop();
  }

  function closePanel(){
    if (!panel.classList.contains('open')) return;
    // Sync typed text back to mini input
    const miniInput = getActiveMiniInput();
    if (miniInput) {
      miniInput.value = inputEl.value;
    }

    panel.classList.remove('open');
    backdrop.classList.remove('open');

    const dockEls = getDockElements();
    dockEls.forEach(el => {
      el.style.visibility = '';
      el.style.pointerEvents = '';
      el.style.opacity = '1';
    });
    
    try { lastFocusedEl?.focus?.(); } catch {}
    lastFocusedEl = null;
  }
  
  function wireExternalTrigger() {
    const triggers = document.querySelectorAll('[data-assistant-trigger]');
    triggers.forEach((ask) => {
      ask.addEventListener('click', (e) => {
        // Ignore links, Command Palette (CLI ⌘K) button, or navigation menu buttons
        if (e.target.closest('a') || e.target.closest('[data-cmdk-trigger], .ai-mini-cmdk, .home-omnibar-cmdk') || e.target.closest('button:not(.ai-mini-send):not(.home-omnibar-send)')) return;
        e.preventDefault();
        lastFocusedEl = ask;
        openPanel();
      });
    });

    // 1-click conversational triggers anywhere on the page
    document.addEventListener('click', (e) => {
      const askBtn = e.target.closest('[data-ask-ai]');
      if (askBtn) {
        e.preventDefault();
        e.stopPropagation();
        const prompt = askBtn.getAttribute('data-ask-ai') || askBtn.textContent.trim();
        if (prompt) {
          openPanel();
          send(prompt);
        }
      }
    });

    const inputs = [
      document.getElementById('ai-mini-input'),
      document.getElementById('home-omnibar-input')
    ].filter(Boolean);

    inputs.forEach(input => {
      input.addEventListener('click', () => {
        if (!panel.classList.contains('open')) openPanel();
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const val = input.value.trim();
          if (val) {
            input.value = '';
            openPanel();
            send(val);
          } else {
            openPanel();
          }
        }
      });
    });

    const forms = [
      document.getElementById('subpage-omnibar-form'),
      document.getElementById('home-omnibar-form')
    ].filter(Boolean);

    forms.forEach(form => {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const activeInput = form.querySelector('input[type="text"]');
        const val = activeInput ? activeInput.value.trim() : '';
        if (val) {
          if (activeInput) activeInput.value = '';
          openPanel();
          send(val);
        } else {
          openPanel();
        }
      });
    });

    const sendBtns = [
      document.getElementById('ai-mini-send'),
      document.getElementById('home-omnibar-send')
    ].filter(Boolean);

    sendBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const activeInput = getActiveMiniInput();
        const val = activeInput ? activeInput.value.trim() : '';
        if (val) {
          if (activeInput) activeInput.value = '';
          openPanel();
          send(val);
        } else {
          openPanel();
        }
      });
    });
  }
  // Chat state
  const state = { history: [], kb: null, sectionContext: null };
  let inFlight = false;
  let streamAborted = false;
  let currentController = null;
  let lastInteraction = Date.now();

  const PAGE_PILLS = {
    '/dashboard.html': [
      "How did you drive 71% more engagement?",
      "Walk me through your UX research process.",
      "What were the key tradeoffs?"
    ],
    '/inventory.html': [
      "Why start with an MVP?",
      "How did you get stakeholder buy-in?",
      "What were the biggest tradeoffs?"
    ],
    '/ai-coding-portfolio.html': [
      "What tools and workflow did you use?",
      "Why a database over a JSON file?",
      "What were the key takeaways?"
    ],
    '/about.html': [
      "What does your mentorship work look like?",
      "What is your design philosophy?"
    ],
    '/member-portal-overhaul.html': [
      "Why progressive disclosure over flat navigation?",
      "What was the hardest tradeoff?"
    ],
    '/': [
      "What did Ryan ship at D-Tools? (+71% engagement)",
      "How did he lift AI adoption by 500% at i4cp?",
      "Walk me through the real-time inventory MVP (+18% MRR)",
      "Is Ryan a fit for a Senior / Staff Product Designer role?"
    ]
  };

  async function ensureKbLoaded() {
    if (state.kb) return state.kb;
    try {
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      wireExternalTrigger();
    });
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
  // ─── Page-Aware Smart Pills ──────────────────────────────────────────────
  function isCaseStudyPage() {
    return !!document.querySelector('article.case-study, .case-study');
  }

  function getCurrentPagePills(customPills) {
    const path = canonicalPagePath(location.pathname);
    const kbChips = state.kb?.chips?.default;
    return customPills || PAGE_PILLS[path] || kbChips || PAGE_PILLS['/'];
  }

  function canonicalPagePath(pathname = '') {
    let path = String(pathname || '').replace(/\/$/, '') || '/';
    if (path === '/index.html' || path === '/index') return '/';
    const pagesMatch = path.match(/^\/pages\/(.+)$/);
    if (pagesMatch) path = '/' + pagesMatch[1];
    if (path !== '/' && !path.endsWith('.html')) {
      path = path + '.html';
    }
    return path;
  }

  function setPagePills(customPills) {
    const pillsContainer = $('#pills');
    if (!pillsContainer) return;
    const pills = getCurrentPagePills(customPills);
    setPillsFromArray(pills);
    requestAnimationFrame(() => pillsContainer.classList.add('show'));
    if (isCaseStudyPage()) {
      renderFloatingCaseStudyPills(pills);
    }
  }

  // Set pills on load
  setPagePills();

  function isSafeHref(href = '') {
    const value = String(href || '').trim();
    if (value.startsWith('//')) return false;
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

    // Step 3: Bold, Italic, Code & KPI badges.
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/(\+?\d+(?:\.\d+)?%)/g, '<span class="chat-kpi-badge">$1</span>');

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

  // renderSources removed — unused

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
    if (!text) {
      inputEl.classList.add('shake');
      setTimeout(() => inputEl.classList.remove('shake'), 400);
      return;
    }
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
        <div class="loading-row">
          <div class="loading-left">
            <span class="loading-text">${escapeHtml(loadingPhrases[phraseIndex])}</span>
            <span class="loading-dots" aria-hidden="true">
              <span></span><span></span><span></span>
            </span>
          </div>
          <button type="button" class="stop-btn" aria-label="Stop generating">Stop</button>
        </div>
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
        sessionToken: getOrCreateSessionToken(),
        messages: state.history.slice(-12),
        answerStyle,
        pageContext
      };
      if (state.kb) payload.kb = state.kb;
      if (state.sectionContext) payload.sectionContext = state.sectionContext;

      let timeoutTimer = setTimeout(() => currentController.abort(), 60000);
      const res = await fetch(chatApi, {
        method:'POST',
        headers:{
          'Content-Type':'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify(payload),
        signal: currentController.signal
      });

      clearTimeout(timeoutTimer);
      state.sectionContext = null;

      // Determine if the server responded with SSE streaming
      const contentType = (res.headers.get('content-type') || '').toLowerCase();

      let data;

      if (contentType.includes('text/event-stream')) {
        // ---- SSE streaming path ----
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';
        let accumulatedText = '';

        // Helper to parse SSE events from the buffer
        function processSseBuffer() {
          const parts = buf.split('\n\n');
          buf = parts.pop() || '';
          for (const part of parts) {
            for (const line of part.split('\n')) {
              if (!line.startsWith('data: ')) continue;
              try {
                const parsed = JSON.parse(line.slice(6).trim());
                if (parsed.type === 'chunk') {
                  accumulatedText += parsed.text || '';
                } else if (parsed.type === 'done') {
                  data = parsed.data || {};
                  // Ensure data.answer uses the polished version from the server
                  if (!data.answer && accumulatedText) {
                    data.answer = accumulatedText;
                  }
                }
              } catch {}
            }
          }
        }

        // Extend timeout for streaming (60s total, not 30)
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            processSseBuffer();
          }
          // Flush remaining buffer
          processSseBuffer();
        } finally {
          reader.releaseLock();
        }

        if (!data && accumulatedText) {
          data = { answer: accumulatedText };
        }
      } else {
        // ---- Non-streaming (JSON) fallback ----
        data = await res.json().catch(() => ({}));
      }

      if (!res.ok && !data) {
        renderErrorMessage(thinking, `I'm having trouble reaching the assistant right now (${res.status}). Try again in a moment, or ask something narrower like "Is Ryan a fit for my role?"`, text);
        return;
      }

      let ans = (data && data.answer)
        ? String(data.answer)
        : "";

      // Fallback to grounded KB synthesis if network or serverless function is unavailable
      if (!ans || ans.includes("I didn't get enough to answer that well") || ans.includes("Chat is not configured")) {
        const qLower = (text || '').toLowerCase();
        if (qLower.includes('71%') || qLower.includes('engagement') || qLower.includes('dashboard')) {
          ans = "At D-Tools Cloud, Ryan redesigned static reporting into role-based executive dashboards with anchored AI opportunity signals. By giving integrators real-time visibility into project margins and pipeline velocity, the system drove a **+71% lift in beta engagement** and **62% multi-dashboard adoption**.";
        } else if (qLower.includes('18%') || qLower.includes('revenue') || qLower.includes('mrr') || qLower.includes('inventory')) {
          ans = "For D-Tools Cloud, Ryan designed an end-to-end inventory, purchasing, and receiving system featuring an auditable ledger and interactive status stepper. The workflow eliminated warehouse stockouts and generated an **+18% recurring revenue lift**.";
        } else if (qLower.includes('500%') || qLower.includes('i4cp') || qLower.includes('member portal')) {
          ans = "At i4cp, Ryan led the member portal overhaul, introducing conversational enterprise search grounded in benchmark research. The platform delivered a **+500% increase in AI activation** and a **+10% YoY member renewal lift**.";
        } else if (qLower.includes('research') || qLower.includes('process')) {
          ans = "Ryan's research approach pairs contextual customer interviews with browser prototyping. By testing working interactions directly with enterprise users, he validates data density and task completion speed before engineering commitments.";
        } else if (qLower.includes('tradeoff') || qLower.includes('trade-off')) {
          ans = "In enterprise B2B tools, Ryan prioritizes progressive disclosure over simplification. Key executive metrics remain visible at a glance, while granular ledger states and batch actions expand on demand without cluttering the canvas.";
        } else if (qLower.includes('fit') || qLower.includes('role') || qLower.includes('staff') || qLower.includes('senior')) {
          ans = "Ryan brings 6+ years of experience leading product design for B2B SaaS platforms, tokenized design systems, and AI workflows. As a player-coach who designs in code and has mentored 1,500+ designers, he bridges strategic product vision with production craft.";
        } else {
          ans = "Ryan Schmidt is a senior product designer & UX engineer with 6+ years designing B2B SaaS platforms and design systems. Explore his featured work above: **BI Analytics (+71% Beta)**, **Inventory (+18% MRR)**, **i4cp AI Search (+500% Activation)**, and **Architecture**.";
        }
      }

      if (data && data.suggested_pills && Array.isArray(data.suggested_pills) && data.suggested_pills.length) {
        const pillsContainer = $('#pills');
        if (pillsContainer) {
          pillsContainer.classList.remove('show');
          setTimeout(function () {
            setPillsFromArray(data.suggested_pills);
            requestAnimationFrame(function () { pillsContainer.classList.add('show'); });
          }, 180);
        }
        if (isCaseStudyPage()) {
          renderFloatingCaseStudyPills(data.suggested_pills);
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

      // Action bar with 1-click Copy
      const actBar = document.createElement('div');
      actBar.className = 'chat-action-bar';
      actBar.innerHTML = `
        <button type="button" class="chat-copy-btn" title="Copy response" aria-label="Copy response">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          <span class="chat-copy-lbl">Copy</span>
        </button>
        <span class="chat-telemetry-tag">Verified Project Outcomes</span>
      `;
      const copyBtn = actBar.querySelector('.chat-copy-btn');
      const copyLbl = actBar.querySelector('.chat-copy-lbl');
      if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
          try {
            await navigator.clipboard.writeText(ans);
            copyBtn.classList.add('is-copied');
            if (copyLbl) copyLbl.textContent = 'Copied!';
            setTimeout(() => {
              copyBtn.classList.remove('is-copied');
              if (copyLbl) copyLbl.textContent = 'Copy';
            }, 2000);
          } catch {}
        });
      }
      thinking.appendChild(actBar);

      // Feature 1: Hire Intent card
      if (data && data.hire_intent === true) {
        renderHireCard(thinking);
      }

      // Trust: show which case(s) this answer is based on
      if (data && Array.isArray(data.context_cases) && data.context_cases.length) {
        renderContextCases(thinking, data.context_cases);
        scrollToBottom(true);
      }

      // Phase 2: DOM-Aware Navigation & Highlighting
      if (data && data.action_scroll_to) {
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

      if (data && data.action_highlight) {
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
      clearTimeout(timeoutTimer);
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

  window.rsChatWidget = {
    open: openPanel,
    close: closePanel,
    send: (msg) => {
      openPanel();
      send(msg);
    }
  };

  if (new URLSearchParams(window.location.search).has('chat')) {
    setTimeout(() => openPanel(), 350);
  }
})();
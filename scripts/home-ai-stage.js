// scripts/home-ai-stage.js
// Main-Stage AI & CLI Experience for index.html ("The Spatial Atelier Agent")
// Works seamlessly alongside scripts/cli-mode.js (⌘K) and scripts/rs-chat-widget.js (on subpages).
(() => {
  if (!document.body.classList.contains('is-home')) return;
  const stageRoot = document.getElementById('home-ai-stage');
  const omnibarInput = document.getElementById('home-omnibar-input');
  const omnibarSend = document.getElementById('home-omnibar-send');
  const omnibarForm = document.getElementById('home-omnibar-form');
  const stageStream = document.getElementById('home-stage-stream');
  const stageView = document.getElementById('home-stage-view');
  const stageResetBtn = document.getElementById('home-stage-reset');
  const stagePillsEl = document.getElementById('home-stage-pills');
  const slashMenuBtn = document.getElementById('home-slash-btn');
  const slashPopover = document.getElementById('home-slash-popover');

  if (!stageRoot || !omnibarInput || !stageStream || !stageView) return;

  const SESSION_KEY = 'rs_chat_session_token';
  function getOrCreateSessionToken() {
    try {
      let token = sessionStorage.getItem(SESSION_KEY);
      if (token) return token;
      token = crypto.randomUUID
        ? crypto.randomUUID()
        : 's_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem(SESSION_KEY, token);
      return token;
    } catch {
      return 's_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    }
  }

  const CASE_STUDIES = [
    {
      id: 'dashboards',
      eyebrow: 'FEATURED CASE STUDY · D-TOOLS CLOUD',
      metric: '+71% Beta Engagement',
      secondaryMetric: '62% Multi-View Adoption',
      title: 'AI-Powered BI Dashboards & Opportunity Signals',
      summary:
        'Redesigned static reporting into role-based executive views with anchored AI summaries grounded in verifiable KPIs.',
      tags: ['B2B SaaS', 'AI UX', 'Data Visualization', 'Design Systems'],
      url: 'pages/dashboard.html',
      image: 'assets/case-studies/dashboards/rename-dashboard.webp',
      aiPrompt: 'Walk me through how Ryan drove +71% engagement on the AI-Powered Dashboards project.'
    },
    {
      id: 'member-portal',
      eyebrow: 'ENTERPRISE AI & IA · i4cp',
      metric: '+500% AI Activation',
      secondaryMetric: 'Unified Ask-Ahri Omnibar',
      title: 'i4cp Member Portal & AI Search Overhaul',
      summary:
        'Restructured enterprise HR research taxonomy and introduced a unified AI discovery omnibar with verified citations.',
      tags: ['Information Architecture', 'RAG Search', 'Member Experience'],
      url: 'pages/member-portal-overhaul.html',
      image: 'assets/case-studies/member-portal/design-highlights/Home_new.webp',
      aiPrompt: 'How did Ryan lift AI feature adoption by 500% on the i4cp Member Portal overhaul?'
    },
    {
      id: 'inventory',
      eyebrow: '0→1 WORKFLOW MVP · D-TOOLS CLOUD',
      metric: '+18% Recurring Revenue',
      secondaryMetric: '+8% YoY Platform Adoption',
      title: 'Real-Time Inventory, Purchasing & Receiving',
      summary:
        'Connected purchase orders directly to warehouse bins and active jobs, eliminating spreadsheet reconciliations.',
      tags: ['0→1 MVP', 'Field Research', 'Auditable Workflows'],
      url: 'pages/inventory.html',
      image: 'assets/case-studies/inventory/inventory-controls.webp',
      aiPrompt: 'Why did Ryan focus the Real-Time Inventory MVP on the PO-received loop, and how did it drive +18% MRR?'
    },
    {
      id: 'ai-portfolio',
      eyebrow: 'UX ENGINEERING · LIVE ARCHITECTURE',
      metric: 'Zero-Build Stack',
      secondaryMetric: 'Gemini 2.5 Flash RAG',
      title: 'Engineering an AI-Native Portfolio in Code',
      summary:
        'Designed and shipped directly in semantic HTML, tokenized CSS, and vanilla ES6 with a custom RAG assistant and ⌘K inspector.',
      tags: ['Design Tokens', 'Prototyping in Code', 'Cursor + Claude'],
      url: 'pages/ai-coding-portfolio.html',
      image: 'assets/case-studies/ai-coding-portfolio/cursor-files.webp',
      aiPrompt: 'How did Ryan architect and code this portfolio using design tokens and Gemini 2.5 RAG?'
    }
  ];

  const DEFAULT_PILLS = [
    'Strongest projects?',
    'How do you use AI?',
    'Check role fit'
  ];

  const state = {
    history: [],
    kb: null,
    inFlight: false,
    controller: null
  };

  async function ensureKbLoaded() {
    if (state.kb) return state.kb;
    try {
      const r = await fetch('/assets/portfolio-kb.json', { cache: 'force-cache' });
      if (!r.ok) return null;
      state.kb = await r.json();
      return state.kb;
    } catch {
      return null;
    }
  }
  ensureKbLoaded();

  function escapeHtml(value = '') {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function isSafeHref(href = '') {
    const value = String(href || '').trim();
    if (value.startsWith('//')) return false;
    return (
      /^https:\/\//i.test(value) ||
      /^http:\/\//i.test(value) ||
      /^\//.test(value) ||
      /^\.\//.test(value) ||
      /^pages\//i.test(value) ||
      /^assets\//i.test(value) ||
      /^#/.test(value) ||
      /^mailto:/i.test(value)
    );
  }

  function normalizeInternalHref(href = '') {
    const clean = String(href || '').trim();
    if (/^https?:\/\/(www\.)?ryanschmidt\.design\/(dashboard|inventory|member-portal-overhaul|ai-coding-portfolio|about)(\.html)?/i.test(clean)) {
      const match = clean.match(/\/(dashboard|inventory|member-portal-overhaul|ai-coding-portfolio|about)(\.html)?/i);
      if (match) return `pages/${match[1]}.html`;
    }
    if (/^\/(dashboard|inventory|member-portal-overhaul|ai-coding-portfolio|about)(\.html)?$/i.test(clean)) {
      const slug = clean.replace(/^\//, '').replace(/\.html$/i, '');
      return `pages/${slug}.html`;
    }
    return clean;
  }

  function renderInlineMarkdown(text = '') {
    const linkTokens = [];
    let tokenized = String(text || '').replace(
      /\[([^\]]+)\]\(((?:[^()]|\([^)]*\))+)\)/g,
      (match, label, href) => {
        const idx = linkTokens.length;
        linkTokens.push({ label, href });
        return `\u0000LINK${idx}\u0000`;
      }
    );

    let html = escapeHtml(tokenized);
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // KPI & Metric Telemetry Badges (e.g., +71%, +500%, +18%, 62%, 92%, +38%)
    html = html.replace(/(\+?\d+(?:\.\d+)?%)/g, '<span class="home-chat-kpi-badge">$1</span>');

    html = html.replace(/\u0000LINK(\d+)\u0000/g, (match, idx) => {
      const token = linkTokens[Number(idx)];
      if (!token) return match;
      const { label, href } = token;
      const safeHref = normalizeInternalHref(String(href || '').trim());
      if (!isSafeHref(safeHref)) return escapeHtml(label);

      const safeLabel = escapeHtml(label)
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
      const escapedHref = escapeHtml(safeHref);
      const isExternal = /^https?:\/\//i.test(safeHref);
      const targetAttrs = isExternal ? ' target="_blank" rel="noopener noreferrer"' : '';
      return `<a href="${escapedHref}"${targetAttrs}>${safeLabel}</a>`;
    });

    return html;
  }

  function parseMarkdown(text = '') {
    const rawLines = String(text || '').replace(/\r/g, '').split('\n');
    const blocks = [];
    let paragraph = [];
    let listItems = [];
    let inCodeBlock = false;
    let codeBlockLang = '';
    let codeBlockLines = [];

    function flushParagraph() {
      if (!paragraph.length) return;
      const html = paragraph.join(' ').trim();
      if (html) blocks.push(`<p>${renderInlineMarkdown(html)}</p>`);
      paragraph = [];
    }

    function flushList() {
      if (!listItems.length) return;
      const items = listItems.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join('');
      blocks.push(`<ul>${items}</ul>`);
      listItems = [];
    }

    function flushCodeBlock() {
      if (!inCodeBlock) return;
      const rawCode = codeBlockLines.join('\n');
      const escapedCode = escapeHtml(rawCode);
      const langLabel = escapeHtml(codeBlockLang || 'code');
      blocks.push(
        `<div class="home-chat-codeblock"><div class="home-chat-codeblock__header"><span class="home-chat-codeblock__lang">${langLabel}</span><button type="button" class="home-chat-codeblock__copy" data-code="${escapeHtml(rawCode)}" title="Copy code" aria-label="Copy code"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg><span>Copy</span></button></div><pre><code>${escapedCode}</code></pre></div>`
      );
      codeBlockLines = [];
      inCodeBlock = false;
      codeBlockLang = '';
    }

    for (const rawLine of rawLines) {
      const line = rawLine.trim();

      // Check code block fence
      const fenceMatch = line.match(/^```([a-zA-Z0-9_-]*)/);
      if (fenceMatch) {
        if (!inCodeBlock) {
          flushParagraph();
          flushList();
          inCodeBlock = true;
          codeBlockLang = fenceMatch[1] || '';
          codeBlockLines = [];
        } else {
          flushCodeBlock();
        }
        continue;
      }

      if (inCodeBlock) {
        codeBlockLines.push(rawLine);
        continue;
      }

      if (!line) {
        flushParagraph();
        flushList();
        continue;
      }

      // Headings (### or ## or #)
      const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
      if (headingMatch) {
        flushParagraph();
        flushList();
        blocks.push(`<h3>${renderInlineMarkdown(headingMatch[2])}</h3>`);
        continue;
      }

      // Blockquotes (> quote)
      const quoteMatch = line.match(/^>\s*(.+)$/);
      if (quoteMatch) {
        flushParagraph();
        flushList();
        blocks.push(`<blockquote>${renderInlineMarkdown(quoteMatch[1])}</blockquote>`);
        continue;
      }

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
    if (inCodeBlock) flushCodeBlock();
    return blocks.join('');
  }

  function sanitizeAnswer(text) {
    let s = String(text || '');
    s = s.replace(/^\s*\{\s*"answer"\s*:\s*"/, '');
    s = s.replace(/"\s*,?\s*"suggested_pills"[\s\S]*$/, '');
    s = s.replace(/"\s*\}\s*$/, '');
    s = s.replace(/\\n/g, '\n').replace(/\\t/g, ' ').replace(/\\"/g, '"');
    s = s.replace(/^(\s*[-*•]\s+.+),\s*$/gm, '$1.');
    return s.trim();
  }

  function activateStage() {
    stageRoot.classList.add('is-stage-active');
    stageView.hidden = false;
    if (omnibarInput) omnibarInput.placeholder = 'Ask a follow up...';
  }

  function resetStage() {
    if (state.controller) {
      try { state.controller.abort(); } catch {}
    }
    state.inFlight = false;
    state.history = [];
    stageStream.innerHTML = '';
    stageView.hidden = true;
    stageRoot.classList.remove('is-stage-active');
    document.querySelectorAll('.home-intent-card.is-active').forEach((c) => c.classList.remove('is-active'));
    if (omnibarInput) {
      omnibarInput.value = '';
      omnibarInput.placeholder = 'Ask me anything...';
    }
    renderPills(DEFAULT_PILLS);
  }

  function scrollToNewestCard(el) {
    if (!stageStream) return;
    requestAnimationFrame(() => {
      if (el && typeof el.offsetTop === 'number') {
        const targetTop = Math.max(0, el.offsetTop - 8);
        stageStream.scrollTo({
          top: targetTop,
          behavior: 'smooth'
        });
      } else {
        stageStream.scrollTo({
          top: stageStream.scrollHeight,
          behavior: 'smooth'
        });
      }
    });
  }

  function renderPills(pills = DEFAULT_PILLS) {
    if (!stagePillsEl) return;
    stagePillsEl.innerHTML = '';
    pills.slice(0, 3).forEach((text) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'home-prompt-pill';
      btn.dataset.prompt = text;
      btn.textContent = text;
      btn.addEventListener('click', () => {
        handleInputOrAction(text);
      });
      stagePillsEl.appendChild(btn);
    });
  }

  // ---------------------------------------------------------------------------
  // Linear / Vercel / Aerospace UX Helpers: Telemetry Header, Toolbars & Actions
  // ---------------------------------------------------------------------------

  const userPromptHistory = [];
  let promptHistoryIndex = -1;

  function createAssistantHeader(tagText = 'RAG Grounded · Gemini 2.5') {
    return `
      <div class="home-chat-bot-header">
        <div class="home-chat-bot-identity">
          <span class="home-chat-bot-spark" aria-hidden="true">✦</span>
          <span class="home-chat-bot-name">Ryan Schmidt AI</span>
        </div>
        <div class="home-chat-telemetry-tag">
          <span class="home-chat-telemetry-dot" aria-hidden="true"></span>
          <span class="home-chat-telemetry-lbl">${escapeHtml(tagText)}</span>
        </div>
      </div>
    `;
  }

  function createAssistantToolbar(provenance = 'Austin, TX · Shipped Evidence') {
    return `
      <div class="home-chat-toolbar">
        <div class="home-chat-toolbar__left">
          <button type="button" class="home-chat-action-btn home-chat-copy-btn" title="Copy response" aria-label="Copy response">
            <svg class="home-chat-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span class="home-chat-action-lbl">Copy</span>
          </button>
        </div>
        <div class="home-chat-toolbar__right">
          <span class="home-chat-telemetry-model">${escapeHtml(provenance)}</span>
        </div>
      </div>
    `;
  }

  function createUserMessage(promptText) {
    const userMsg = document.createElement('div');
    userMsg.className = 'home-chat-msg home-chat-msg--user';
    userMsg.innerHTML = `
      <div class="home-chat-bubble home-chat-bubble--user">
        <span class="home-chat-bubble__text">${escapeHtml(promptText)}</span>
        <button type="button" class="home-chat-user-copy" title="Copy prompt" aria-label="Copy prompt">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        </button>
      </div>
    `;
    const copyBtn = userMsg.querySelector('.home-chat-user-copy');
    if (copyBtn) {
      copyBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(promptText);
          copyBtn.classList.add('is-copied');
          setTimeout(() => copyBtn.classList.remove('is-copied'), 1500);
        } catch {}
      });
    }
    return userMsg;
  }

  function attachBotToolbar(botMsg, textToCopy) {
    const toolbar = botMsg.querySelector('.home-chat-toolbar');
    if (!toolbar) return;
    const copyBtn = toolbar.querySelector('.home-chat-copy-btn');
    const copyLbl = toolbar.querySelector('.home-chat-action-lbl');
    if (copyBtn) {
      copyBtn.addEventListener('click', async () => {
        try {
          const content = typeof textToCopy === 'function' ? textToCopy() : (textToCopy || botMsg.querySelector('.home-chat-prose')?.innerText || '');
          await navigator.clipboard.writeText(content.trim());
          copyBtn.classList.add('is-copied');
          if (copyLbl) copyLbl.textContent = 'Copied!';
          setTimeout(() => {
            copyBtn.classList.remove('is-copied');
            if (copyLbl) copyLbl.textContent = 'Copy';
          }, 2000);
        } catch (e) {
          console.warn('Copy failed:', e);
        }
      });
    }
  }

  function bindCodeblockCopies(container) {
    if (!container) return;
    container.querySelectorAll('.home-chat-codeblock__copy').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const code = btn.getAttribute('data-code');
        if (!code) return;
        try {
          await navigator.clipboard.writeText(code);
          const span = btn.querySelector('span');
          if (span) span.textContent = 'Copied!';
          btn.classList.add('is-copied');
          setTimeout(() => {
            if (span) span.textContent = 'Copy';
            btn.classList.remove('is-copied');
          }, 2000);
        } catch {}
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Rich Interactive Stage Renderers (Work Showcase, Approach, Resume, CLI)
  // ---------------------------------------------------------------------------

  function renderWorkShowcaseCard() {
    activateStage();
    const userMsg = createUserMessage('Show me your case studies with real impact');
    stageStream.appendChild(userMsg);

    const botMsg = document.createElement('div');
    botMsg.className = 'home-chat-msg home-chat-msg--assistant';
    botMsg.innerHTML = `
      <div class="home-chat-bubble home-chat-bubble--assistant">
        ${createAssistantHeader('Featured Work · Shipped Impact')}
        <div class="home-chat-prose">
          <p>Here are 4 featured case studies with verifiable product and business impact:</p>
        </div>
        <div class="home-work-grid">
          ${CASE_STUDIES.map(
            (c) => `
            <article class="home-work-card">
              <div class="home-work-card__body">
                <div class="home-work-card__top-row">
                  <span class="home-work-card__eyebrow">${escapeHtml(c.eyebrow)}</span>
                  <span class="home-work-kpi">${escapeHtml(c.metric)}</span>
                </div>
                <h3 class="home-work-card__title">
                  <a href="${c.url}">${escapeHtml(c.title)}</a>
                </h3>
                <p class="home-work-card__summary">${escapeHtml(c.summary)}</p>
                <div class="home-work-card__actions">
                  <a href="${c.url}" class="home-work-btn home-work-btn--primary">
                    <span>Read Case Study</span>
                    <span aria-hidden="true">→</span>
                  </a>
                  <button type="button" class="home-work-btn home-work-btn--ai" data-ai-prompt="${escapeHtml(c.aiPrompt)}">
                    <span aria-hidden="true">✦</span>
                    <span>Ask AI Summary</span>
                  </button>
                </div>
              </div>
            </article>
          `
          ).join('')}
        </div>
        ${createAssistantToolbar('4 Shipped Case Studies · Austin, TX')}
      </div>
    `;

    botMsg.querySelectorAll('[data-ai-prompt]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const prompt = btn.getAttribute('data-ai-prompt');
        if (prompt) askGeminiOnStage(prompt);
      });
    });

    stageStream.appendChild(botMsg);
    attachBotToolbar(botMsg, () => 'Featured Case Studies by Ryan Schmidt:\n- AI-Powered BI Dashboards (+71% Beta Engagement)\n- i4cp Member Portal Overhaul (+500% AI Activation)\n- Real-Time Inventory MVP (+18% Recurring Revenue)\n- Engineering an AI-Native Portfolio in Code');
    scrollToNewestCard(botMsg);
    renderPills([
      'Which case study should I read first?',
      'How did you drive 71% more dashboard engagement?',
      'How did you lift AI adoption by 500% at i4cp?'
    ]);
  }

  function renderResumeDossierCard() {
    activateStage();
    const userMsg = createUserMessage('Can I see your resume and career highlights?');
    stageStream.appendChild(userMsg);

    const botMsg = document.createElement('div');
    botMsg.className = 'home-chat-msg home-chat-msg--assistant';
    botMsg.innerHTML = `
      <div class="home-chat-bubble home-chat-bubble--assistant">
        ${createAssistantHeader('Career Dossier · Austin, TX')}
        <div class="home-chat-prose">
          <p>Here is my executive summary, career highlights, and downloadable resume:</p>
        </div>
        <div class="home-dossier-metrics">
          <div class="home-dossier-stat">
            <span class="home-dossier-stat__val">+500%</span>
            <span class="home-dossier-stat__lbl">AI Search Activation (i4cp)</span>
          </div>
          <div class="home-dossier-stat">
            <span class="home-dossier-stat__val">+71%</span>
            <span class="home-dossier-stat__lbl">Beta BI Engagement (D-Tools)</span>
          </div>
          <div class="home-dossier-stat">
            <span class="home-dossier-stat__val">92%</span>
            <span class="home-dossier-stat__lbl">Eng Adoption (100+ Components)</span>
          </div>
          <div class="home-dossier-stat">
            <span class="home-dossier-stat__val">+18%</span>
            <span class="home-dossier-stat__lbl">Recurring Revenue Lift (Inventory)</span>
          </div>
        </div>

        <div class="home-dossier-timeline">
          <div class="home-dossier-role">
            <div class="home-dossier-role__head">
              <div>
                <strong>Senior Product / CX-UX Designer</strong> · <span class="home-dossier-org">i4cp</span>
              </div>
              <span class="home-dossier-date">Feb 2026 – Present</span>
            </div>
            <p>Lead platform experience strategy across member portal, AI research synthesis (Ask Ahri), and internal admin tools. Ship interactive HTML/CSS/JS prototypes via Cursor to eliminate spec ambiguity.</p>
          </div>

          <div class="home-dossier-role">
            <div class="home-dossier-role__head">
              <div>
                <strong>Senior Product Designer</strong> · <span class="home-dossier-org">D-Tools, Inc.</span>
              </div>
              <span class="home-dossier-date">Oct 2021 – Feb 2026</span>
            </div>
            <p>Owned Cloud UX across 5 core B2B SaaS modules as platform scaled from 6,500 to 18,000+ active users. Architected the 0→1 real-time inventory MVP (+18% MRR), AI BI dashboard suite (+71% engagement), and 100+ component tokenized design system.</p>
          </div>

          <div class="home-dossier-role">
            <div class="home-dossier-role__head">
              <div>
                <strong>Senior Design Group Critique Facilitator</strong> · <span class="home-dossier-org">Designlab</span>
              </div>
              <span class="home-dossier-date">May 2021 – Apr 2026</span>
            </div>
            <p>Facilitated 400+ live critique sessions and mentored 1,500+ product designers on problem framing, UX research synthesis, and systems thinking.</p>
          </div>
        </div>

        <div class="home-dossier-footer">
          <a href="assets/ryan-schmidt-resume.pdf" target="_blank" rel="noopener" class="home-work-btn home-work-btn--primary">
            <span>Download Resume PDF</span>
            <span aria-hidden="true">↓</span>
          </a>
          <a href="pages/about.html" class="home-work-btn home-work-btn--ghost">
            <span>Read Full Leadership &amp; Bio</span>
            <span aria-hidden="true">→</span>
          </a>
          <a href="https://www.linkedin.com/in/ryanschmidt1989/" target="_blank" rel="noopener" class="home-work-btn home-work-btn--ghost">
            <span>Connect on LinkedIn</span>
            <span aria-hidden="true">↗</span>
          </a>
        </div>
        ${createAssistantToolbar('Austin, TX · Senior SaaS Product Designer')}
      </div>
    `;

    stageStream.appendChild(botMsg);
    attachBotToolbar(botMsg, () => 'Ryan Schmidt — Senior SaaS Product Designer\nAustin, TX\nHighlights: +500% AI Activation at i4cp, +71% BI Engagement at D-Tools, 92% Design System Adoption.\nResume: assets/ryan-schmidt-resume.pdf');
    scrollToNewestCard(botMsg);
    renderPills([
      'Is Ryan a fit for a Staff Product Designer role?',
      'Tell me about his design system experience',
      'How does he collaborate with engineers?'
    ]);
  }

  function renderApproachBlueprintCard() {
    activateStage();
    const userMsg = createUserMessage('What is your product design approach and philosophy?');
    stageStream.appendChild(userMsg);

    const botMsg = document.createElement('div');
    botMsg.className = 'home-chat-msg home-chat-msg--assistant';
    botMsg.innerHTML = `
      <div class="home-chat-bubble home-chat-bubble--assistant">
        ${createAssistantHeader('Design Philosophy · Browser-Native Prototyping')}
        <div class="home-chat-prose">
          <p>Here is my approach to product design, systems architecture, and AI in practice:</p>
        </div>
        <div class="home-pillars-grid">
          <div class="home-pillar-card">
            <div class="home-pillar-card__num">01 // TRUST BEFORE AI</div>
            <h4>Anchor AI on Verifiable Data</h4>
            <p>AI shouldn't be the first thing a user sees in a workflow they don't trust yet. Layering synthesis on verifiable KPIs drove +71% to +500% adoption.</p>
          </div>
          <div class="home-pillar-card">
            <div class="home-pillar-card__num">02 // THE DESIGN-ENG SEAM</div>
            <h4>Prototype in the Browser</h4>
            <p>Static handoffs lose nuance. Ryan pairs Figma token architecture with live HTML/CSS/JS prototypes in Cursor &amp; Claude alongside engineers.</p>
          </div>
          <div class="home-pillar-card">
            <div class="home-pillar-card__num">03 // TOKENS OVER PATCHES</div>
            <h4>Systemize What Works</h4>
            <p>Most legacy UI debt is a token problem. Scaling a 100+ component tokenized system achieved 92% engineer adoption and cut UI defects by 38%.</p>
          </div>
        </div>
        ${createAssistantToolbar('Systems Thinking · Prototyping in Code')}
      </div>
    `;

    stageStream.appendChild(botMsg);
    attachBotToolbar(botMsg, () => 'Product Design Approach:\n1. Trust Before AI: Anchor AI on verifiable KPIs.\n2. The Design-Eng Seam: Prototype in the browser with live tokens.\n3. Tokens Over Patches: Systemize what works to cut defect rates.');
    scrollToNewestCard(botMsg);
    renderPills([
      'How do you validate AI features with users?',
      'Tell me about your 100+ component design system',
      'How do you use Cursor and Claude in your workflow?'
    ]);
  }

  function renderCLITelemetryStageCard(command) {
    activateStage();
    const cmd = command.replace(/^\//, '').toLowerCase().trim();

    if (cmd === 'work' || cmd === 'ls' || cmd === 'projects') {
      renderWorkShowcaseCard();
      return;
    }
    if (cmd === 'resume' || cmd === 'cv') {
      renderResumeDossierCard();
      return;
    }
    if (cmd === 'xray' || cmd === 'inspect') {
      if (window.rsCommandPalette && typeof window.rsCommandPalette.toggleInspector === 'function') {
        window.rsCommandPalette.toggleInspector(true);
      }
      return;
    }
    if (cmd === 'tokens' || cmd === 'theme') {
      if (window.rsCommandPalette && typeof window.rsCommandPalette.cycleTheme === 'function') {
        window.rsCommandPalette.cycleTheme();
      }
    }

    const domCount = document.querySelectorAll('*').length;
    const scriptsCount = document.querySelectorAll('script').length;
    const navTiming = performance.getEntriesByType('navigation')[0];
    const domInteractive = navTiming ? `${Math.round(navTiming.domInteractive)}ms` : '< 42ms';
    const currentAccent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#0033FF';

    const userMsg = createUserMessage(`/${escapeHtml(cmd || 'perf')}`);
    stageStream.appendChild(userMsg);

    const botMsg = document.createElement('div');
    botMsg.className = 'home-chat-msg home-chat-msg--assistant';
    botMsg.innerHTML = `
      <div class="home-chat-bubble home-chat-bubble--assistant">
        ${createAssistantHeader('Telemetry Console · Zero-Build ES6')}
        <div class="home-chat-prose">
          <p>Live runtime telemetry &amp; UX engineering controls:</p>
        </div>
        <div class="home-cli-grid">
          <div class="home-cli-card">
            <span class="home-cli-card__lbl">DOM Interactive</span>
            <strong class="home-cli-card__val">${domInteractive}</strong>
            <span class="home-cli-card__sub">${domCount} live nodes · ${scriptsCount} scripts</span>
          </div>
          <div class="home-cli-card">
            <span class="home-cli-card__lbl">Stack Architecture</span>
            <strong class="home-cli-card__val">Zero-Build ES6</strong>
            <span class="home-cli-card__sub">Strict 1.250 Major Third CSS Tokens</span>
          </div>
          <div class="home-cli-card">
            <span class="home-cli-card__lbl">Active Accent Token</span>
            <strong class="home-cli-card__val">${escapeHtml(currentAccent)}</strong>
            <span class="home-cli-card__sub">Live CSS Custom Property</span>
          </div>
        </div>

        <div class="home-cli-actions">
          <button type="button" class="home-cli-btn" data-cli-act="xray">
            <span>⌖ Toggle Live DOM X-Ray Inspector</span>
          </button>
          <button type="button" class="home-cli-btn" data-cli-act="tokens">
            <span>◈ Cycle Live Accent Token (--accent)</span>
          </button>
          <button type="button" class="home-cli-btn" data-cli-act="cmdk">
            <span>⌘K Open Full Command Palette</span>
          </button>
        </div>
        ${createAssistantToolbar('Client Telemetry · Performance Observer')}
      </div>
    `;

    botMsg.querySelectorAll('[data-cli-act]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const act = btn.getAttribute('data-cli-act');
        if (act === 'xray' && window.rsCommandPalette) {
          window.rsCommandPalette.toggleInspector();
        } else if (act === 'tokens' && window.rsCommandPalette) {
          window.rsCommandPalette.cycleTheme();
          const updatedAccent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
          const valEl = botMsg.querySelectorAll('.home-cli-card__val')[2];
          if (valEl && updatedAccent) valEl.textContent = updatedAccent;
        } else if (act === 'cmdk' && window.rsCommandPalette) {
          window.rsCommandPalette.open();
        }
      });
    });

    stageStream.appendChild(botMsg);
    attachBotToolbar(botMsg, () => `Telemetry: DOM Interactive: ${domInteractive}, Nodes: ${domCount}, Accent: ${currentAccent}`);
    scrollToNewestCard(botMsg);
  }

  // ---------------------------------------------------------------------------
  // Live Gemini 2.5 Flash RAG Streaming on the Main Stage (Copilot Chat Flow)
  // ---------------------------------------------------------------------------

  async function askGeminiOnStage(rawQuestion, options = {}) {
    const question = String(rawQuestion || '').trim();
    if (!question || state.inFlight) return;

    activateStage();
    state.inFlight = true;
    omnibarSend.disabled = true;

    if (state.controller) {
      try { state.controller.abort(); } catch {}
    }
    state.controller = new AbortController();

    // 1. User Message (with 1-click micro-copy prompt action)
    const userMsg = createUserMessage(question);
    stageStream.appendChild(userMsg);

    // 2. Assistant Message Container (Linear / Vercel telemetry header & actions)
    const botMsg = document.createElement('div');
    botMsg.className = 'home-chat-msg home-chat-msg--assistant';
    botMsg.innerHTML = `
      <div class="home-chat-bubble home-chat-bubble--assistant">
        ${createAssistantHeader('RAG Grounded · Gemini 2.5')}
        <div class="home-chat-loading">
          <span class="home-chat-loading__dot"></span>
          <span class="home-chat-loading__dot"></span>
          <span class="home-chat-loading__dot"></span>
        </div>
        <div class="home-chat-prose"></div>
        <div class="home-chat-sources" hidden></div>
        <div class="home-chat-followups" hidden></div>
        ${createAssistantToolbar('Austin, TX · Shipped Evidence')}
      </div>
    `;
    stageStream.appendChild(botMsg);
    requestAnimationFrame(() => {
      stageStream.scrollTo({ top: stageStream.scrollHeight, behavior: 'smooth' });
    });

    const loadingEl = botMsg.querySelector('.home-chat-loading');
    const proseEl = botMsg.querySelector('.home-chat-prose');
    const sourcesEl = botMsg.querySelector('.home-chat-sources');
    const followupsEl = botMsg.querySelector('.home-chat-followups');

    state.history.push({ role: 'user', content: question });

    try {
      await ensureKbLoaded();
      const payload = {
        sessionToken: getOrCreateSessionToken(),
        messages: state.history.slice(-10),
        answerStyle: question.length > 65 ? 'detailed' : 'concise',
        pageContext: {
          url: '/',
          title: document.title
        }
      };
      if (state.kb) payload.kb = state.kb;

      const res = await fetch(window.RS_CHAT_API || '/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream'
        },
        body: JSON.stringify(payload),
        signal: state.controller.signal
      });

      const contentType = (res.headers.get('content-type') || '').toLowerCase();
      let data = null;

      if (contentType.includes('text/event-stream')) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';
        let accumulatedText = '';

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
                  if (loadingEl && !loadingEl.hidden) loadingEl.hidden = true;
                  proseEl.innerHTML = parseMarkdown(sanitizeAnswer(accumulatedText)) + '<span class="home-chat-cursor" aria-hidden="true"></span>';
                  scrollToNewestCard(botMsg);
                } else if (parsed.type === 'done') {
                  data = parsed.data || {};
                  if (!data.answer && accumulatedText) {
                    data.answer = accumulatedText;
                  }
                }
              } catch {}
            }
          }
        }

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          processSseBuffer();
        }
        processSseBuffer();
        reader.releaseLock();

        if (!data && accumulatedText) {
          data = { answer: accumulatedText };
        }
      } else {
        data = await res.json().catch(() => ({}));
      }

      if (loadingEl) loadingEl.remove();

      if (!res.ok && !data) {
        throw new Error(`Status ${res.status}`);
      }

      const rawAns =
        data && data.answer
          ? String(data.answer)
          : "Here's how Ryan approaches complex B2B SaaS & AI systems: he combines deep qualitative research with tokenized design systems and browser-native prototyping. Ask about a specific project like **AI-Powered Dashboards (+71% engagement)** or **i4cp Member Portal (+500% AI activation)**.";

      const cleanHtml = parseMarkdown(sanitizeAnswer(rawAns));
      proseEl.innerHTML = cleanHtml;
      bindCodeblockCopies(proseEl);
      attachBotToolbar(botMsg, () => proseEl.innerText.trim());
      state.history.push({ role: 'assistant', content: rawAns });

      // Render cited case study pills/links if returned
      if (data && Array.isArray(data.context_cases) && data.context_cases.length) {
        sourcesEl.hidden = false;
        sourcesEl.innerHTML = `
          <span class="home-chat-sources__label">Sources:</span>
          <div class="home-chat-sources__chips">
            ${data.context_cases
              .slice(0, 3)
              .map((c) => {
                const href = normalizeInternalHref(c.url || '#');
                return `<a href="${escapeHtml(href)}" class="home-chat-source-chip"><span>${escapeHtml(c.title || 'Case Study')}</span><span aria-hidden="true">↗</span></a>`;
              })
              .join('')}
          </div>
        `;
      }

      // Render follow-up pills if returned
      if (data && Array.isArray(data.suggested_pills) && data.suggested_pills.length) {
        followupsEl.hidden = false;
        followupsEl.innerHTML = `
          ${data.suggested_pills
            .slice(0, 3)
            .map((p) => `<button type="button" class="home-chat-followup-pill" data-prompt="${escapeHtml(p)}">${escapeHtml(p)}</button>`)
            .join('')}
        `;
        followupsEl.querySelectorAll('.home-chat-followup-pill').forEach((btn) => {
          btn.addEventListener('click', () => {
            const p = btn.getAttribute('data-prompt');
            if (p) askGeminiOnStage(p);
          });
        });
        renderPills(data.suggested_pills);
      }
      scrollToNewestCard(botMsg);
    } catch (err) {
      if (err.name === 'AbortError') return;
      if (loadingEl) loadingEl.remove();
      proseEl.innerHTML = `
        <p><strong>Ryan Schmidt</strong> is a Senior SaaS Product Designer in Austin, TX who works at the seam of design and engineering.</p>
        <ul>
          <li><strong>AI-Powered Dashboards (D-Tools):</strong> Drove <strong>+71% beta engagement</strong> and <strong>62% multi-dashboard adoption</strong> by anchoring AI opportunity summaries on verifiable KPIs. <a href="pages/dashboard.html">Read case study →</a></li>
          <li><strong>i4cp Member Portal Overhaul:</strong> Restructured enterprise research IA and launched the Ask Ahri AI search omnibar, lifting <strong>AI feature activation by +500%</strong>. <a href="pages/member-portal-overhaul.html">Read case study →</a></li>
          <li><strong>Real-Time Inventory MVP (D-Tools):</strong> Connected POs to warehouse bins and active jobs, driving an <strong>+18% recurring revenue lift</strong>. <a href="pages/inventory.html">Read case study →</a></li>
        </ul>
      `;
      bindCodeblockCopies(proseEl);
      attachBotToolbar(botMsg, () => proseEl.innerText.trim());
      scrollToNewestCard(botMsg);
    } finally {
      state.inFlight = false;
      omnibarSend.disabled = false;
      if (omnibarInput) omnibarInput.placeholder = 'Ask a follow up...';
    }
  }

  // ---------------------------------------------------------------------------
  //Unified Router for Intent Cards, Omnibar, Slash Commands, and Global Hooks
  // ---------------------------------------------------------------------------

  function handleInputOrAction(rawInput) {
    const text = String(rawInput || '').trim();
    if (!text) return;

    userPromptHistory.push(text);
    promptHistoryIndex = -1;

    const lower = text.toLowerCase();

    // Direct CLI or Slash commands
    if (
      lower.startsWith('/') ||
      ['ls', 'work', 'projects', 'perf', 'skills', 'tokens', 'xray', 'whoami', 'resume', 'clear'].includes(lower)
    ) {
      const cmd = lower.replace(/^\//, '');
      if (cmd === 'clear' || cmd === 'reset') {
        resetStage();
        return;
      }
      renderCLITelemetryStageCard(cmd);
      return;
    }

    askGeminiOnStage(text);
  }

  // Expose to window so Command Palette (⌘K) on index.html can route AI queries directly onto the stage
  window.rsHomeStageAsk = (query) => {
    handleInputOrAction(query);
  };

  // Bind 2x2 Intent Cards
  document.querySelectorAll('[data-home-intent]').forEach((card) => {
    card.addEventListener('click', (e) => {
      e.preventDefault();
      const intent = card.getAttribute('data-home-intent');
      document.querySelectorAll('.home-intent-card').forEach((c) => c.classList.toggle('is-active', c === card));

      if (intent === 'work') {
        renderWorkShowcaseCard();
      } else if (intent === 'approach') {
        renderApproachBlueprintCard();
      } else if (intent === 'resume') {
        renderResumeDossierCard();
      } else if (intent === 'cli') {
        renderCLITelemetryStageCard('perf');
        omnibarInput.focus();
      }
    });
  });

  // Bind Omnibar keyboard history (ArrowUp recalls previous prompts)
  if (omnibarInput) {
    omnibarInput.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp') {
        if (omnibarInput.value === '' || promptHistoryIndex !== -1) {
          if (userPromptHistory.length > 0) {
            e.preventDefault();
            if (promptHistoryIndex === -1) {
              promptHistoryIndex = userPromptHistory.length - 1;
            } else if (promptHistoryIndex > 0) {
              promptHistoryIndex--;
            }
            omnibarInput.value = userPromptHistory[promptHistoryIndex];
            requestAnimationFrame(() => {
              omnibarInput.selectionStart = omnibarInput.selectionEnd = omnibarInput.value.length;
            });
          }
        }
      } else if (e.key === 'ArrowDown') {
        if (promptHistoryIndex !== -1) {
          e.preventDefault();
          if (promptHistoryIndex < userPromptHistory.length - 1) {
            promptHistoryIndex++;
            omnibarInput.value = userPromptHistory[promptHistoryIndex];
            requestAnimationFrame(() => {
              omnibarInput.selectionStart = omnibarInput.selectionEnd = omnibarInput.value.length;
            });
          } else {
            promptHistoryIndex = -1;
            omnibarInput.value = '';
          }
        }
      }
    });
  }

  // Bind Omnibar form submit
  if (omnibarForm) {
    omnibarForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = omnibarInput.value.trim();
      if (!val) {
        omnibarInput.focus();
        return;
      }
      omnibarInput.value = '';
      if (slashPopover) slashPopover.hidden = true;
      handleInputOrAction(val);
    });
  }

  // Bind Reset / Clear stage button
  if (stageResetBtn) {
    stageResetBtn.addEventListener('click', () => {
      resetStage();
    });
  }

  // Bind '+' Slash Command Menu popover inside the omnibar
  if (slashMenuBtn && slashPopover) {
    slashMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = slashPopover.hidden;
      slashPopover.hidden = !isHidden;
      slashMenuBtn.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
    });

    slashPopover.querySelectorAll('[data-slash-cmd]').forEach((item) => {
      item.addEventListener('click', () => {
        const cmd = item.getAttribute('data-slash-cmd');
        slashPopover.hidden = true;
        slashMenuBtn.setAttribute('aria-expanded', 'false');
        if (cmd === 'work') renderWorkShowcaseCard();
        else if (cmd === 'resume') renderResumeDossierCard();
        else if (cmd === 'approach') renderApproachBlueprintCard();
        else if (cmd) renderCLITelemetryStageCard(cmd);
      });
    });

    document.addEventListener('click', (e) => {
      if (!slashPopover.hidden && !slashPopover.contains(e.target) && e.target !== slashMenuBtn) {
        slashPopover.hidden = true;
        slashMenuBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Initialize default prompt pills
  renderPills(DEFAULT_PILLS);

  // URL Parameter support (?intent=work or ?q=...)
  const params = new URLSearchParams(window.location.search);
  const qParam = params.get('q');
  const intentParam = params.get('intent');
  if (intentParam === 'work') {
    renderWorkShowcaseCard();
  } else if (qParam) {
    handleInputOrAction(qParam);
  }
})();

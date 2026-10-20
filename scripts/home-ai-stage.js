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
    'Design a better dashboard',
    'How do you use AI in design?',
    'What are his strongest projects?',
    'Is Ryan a fit for a Senior/Staff role?'
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
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    html = html.replace(/\u0000LINK(\d+)\u0000/g, (match, idx) => {
      const token = linkTokens[Number(idx)];
      if (!token) return match;
      const { label, href } = token;
      const safeHref = normalizeInternalHref(String(href || '').trim());
      if (!isSafeHref(safeHref)) return escapeHtml(label);

      const safeLabel = escapeHtml(label).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      const escapedHref = escapeHtml(safeHref);
      const isExternal = /^https?:\/\//i.test(safeHref);
      const targetAttrs = isExternal ? ' target="_blank" rel="noopener noreferrer"' : '';
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
      if (html) blocks.push(`<p>${renderInlineMarkdown(html)}</p>`);
      paragraph = [];
    }

    function flushList() {
      if (!listItems.length) return;
      const items = listItems.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join('');
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
  }

  function resetStage() {
    if (state.controller) {
      try { state.controller.abort(); } catch {}
    }
    state.inFlight = false;
    stageStream.innerHTML = '';
    stageView.hidden = true;
    stageRoot.classList.remove('is-stage-active');
    document.querySelectorAll('.home-intent-card.is-active').forEach((c) => c.classList.remove('is-active'));
    renderPills(DEFAULT_PILLS);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function scrollToNewestCard(el) {
    if (!el) return;
    setTimeout(() => {
      const rect = el.getBoundingClientRect();
      const offset = window.scrollY + rect.top - 108;
      window.scrollTo({ top: Math.max(0, offset), behavior: 'smooth' });
    }, 60);
  }

  function renderPills(pills = DEFAULT_PILLS) {
    if (!stagePillsEl) return;
    stagePillsEl.innerHTML = '';
    pills.slice(0, 4).forEach((text) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'home-prompt-pill';
      btn.dataset.prompt = text;
      btn.innerHTML = `<span class="home-prompt-pill__spark" aria-hidden="true">✦</span><span>${escapeHtml(text)}</span>`;
      btn.addEventListener('click', () => {
        handleInputOrAction(text);
      });
      stagePillsEl.appendChild(btn);
    });
  }

  // ---------------------------------------------------------------------------
  // Rich Interactive Stage Renderers (Work Showcase, Approach, Resume, CLI)
  // ---------------------------------------------------------------------------

  function renderWorkShowcaseCard() {
    activateStage();
    const block = document.createElement('section');
    block.className = 'home-stage-block home-stage-block--work';
    block.innerHTML = `
      <div class="home-stage-block__header">
        <div class="home-stage-block__meta">
          <span class="home-stage-badge">✦ SELECTED WORK · 4 SHIPPED CASE STUDIES</span>
          <span class="home-stage-sub">Click any case study to read the full deep dive, or ask the AI about a specific project</span>
        </div>
      </div>
      <div class="home-work-grid">
        ${CASE_STUDIES.map(
          (c) => `
          <article class="home-work-card">
            <a href="${c.url}" class="home-work-card__media" aria-label="Read ${escapeHtml(c.title)} case study">
              <img src="${c.image}" alt="${escapeHtml(c.title)}" loading="lazy" />
              <div class="home-work-card__badges">
                <span class="home-work-kpi">${escapeHtml(c.metric)}</span>
                <span class="home-work-kpi home-work-kpi--subtle">${escapeHtml(c.secondaryMetric)}</span>
              </div>
            </a>
            <div class="home-work-card__body">
              <div class="home-work-card__eyebrow">${escapeHtml(c.eyebrow)}</div>
              <h3 class="home-work-card__title">
                <a href="${c.url}">${escapeHtml(c.title)}</a>
              </h3>
              <p class="home-work-card__summary">${escapeHtml(c.summary)}</p>
              <div class="home-work-card__tags">
                ${c.tags.map((t) => `<span class="home-work-tag">${escapeHtml(t)}</span>`).join('')}
              </div>
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
    `;

    block.querySelectorAll('[data-ai-prompt]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const prompt = btn.getAttribute('data-ai-prompt');
        if (prompt) askGeminiOnStage(prompt);
      });
    });

    stageStream.appendChild(block);
    scrollToNewestCard(block);
    renderPills([
      'Which case study should I read first?',
      'How did you drive 71% more dashboard engagement?',
      'How did you lift AI adoption by 500% at i4cp?',
      'Paste a job link to check role fit'
    ]);
  }

  function renderResumeDossierCard() {
    activateStage();
    const block = document.createElement('section');
    block.className = 'home-stage-block home-stage-block--resume';
    block.innerHTML = `
      <div class="home-stage-block__header">
        <div class="home-stage-block__meta">
          <span class="home-stage-badge home-stage-badge--emerald">● EXECUTIVE DOSSIER · CURRICULUM VITAE</span>
          <span class="home-stage-sub">Austin, TX · Open to Remote, Hybrid, or Austin-based Senior / Staff / UX Engineer Roles</span>
        </div>
        <div class="home-stage-block__cta">
          <a href="assets/ryan-schmidt-resume.pdf" target="_blank" rel="noopener" class="home-dossier-pdf-btn">
            <span>Open Full Resume (PDF)</span>
            <span aria-hidden="true">↗</span>
          </a>
        </div>
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
              <strong>Senior Product / CX-UX Designer</strong> · <span class="home-dossier-org">i4cp (Institute for Corporate Productivity)</span>
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
    `;

    stageStream.appendChild(block);
    scrollToNewestCard(block);
    renderPills([
      'Is Ryan a fit for a Staff Product Designer role?',
      'Tell me about his design system experience',
      'How does he collaborate with engineers?',
      'What roles is Ryan looking for?'
    ]);
  }

  function renderApproachBlueprintCard() {
    activateStage();
    const block = document.createElement('section');
    block.className = 'home-stage-block home-stage-block--approach';
    block.innerHTML = `
      <div class="home-stage-block__header">
        <div class="home-stage-block__meta">
          <span class="home-stage-badge home-stage-badge--amber">✦ DESIGN PHILOSOPHY · SYSTEMS &amp; AI IN PRACTICE</span>
          <span class="home-stage-sub">How Ryan turns messy enterprise research and legacy interfaces into shippable code</span>
        </div>
      </div>

      <div class="home-pillars-grid">
        <div class="home-pillar-card">
          <div class="home-pillar-card__num">01 // TRUST BEFORE AI</div>
          <h4>Anchor AI on Verifiable Data</h4>
          <p>AI should never be the first thing a user sees in a workflow they don't trust yet. On D-Tools BI and i4cp Ask Ahri, layering conversational synthesis on top of verifiable KPIs and citations drove +71% to +500% adoption.</p>
        </div>
        <div class="home-pillar-card">
          <div class="home-pillar-card__num">02 // THE DESIGN-ENG SEAM</div>
          <h4>Prototype in the Browser, Not Over a Fence</h4>
          <p>Static handoffs lose interaction nuance. Ryan pairs Figma token architecture with live HTML/CSS/JS prototypes in Cursor &amp; Claude so engineers build from working state machines.</p>
        </div>
        <div class="home-pillar-card">
          <div class="home-pillar-card__num">03 // TOKENS OVER PATCHES</div>
          <h4>Systemize What Works</h4>
          <p>Most legacy B2B UI debt isn't a visual redesign problem—it's a token architecture problem. Scaling a 100+ component tokenized system achieved 92% engineer adoption and cut UI defects by 38%.</p>
        </div>
      </div>
    `;

    stageStream.appendChild(block);
    scrollToNewestCard(block);
    // Also stream a tailored AI synthesis right below it for conversational depth
    askGeminiOnStage('How do you approach product design, information architecture, and using AI in your workflow?', { skipScrollOnStart: true });
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

    const block = document.createElement('section');
    block.className = 'home-stage-block home-stage-block--cli';
    block.innerHTML = `
      <div class="home-stage-block__header">
        <div class="home-stage-block__meta">
          <span class="home-stage-badge home-stage-badge--violet">&gt;_ CLI TELEMETRY · /${escapeHtml(cmd || 'status')}</span>
          <span class="home-stage-sub">Live runtime inspection &amp; UX engineering controls</span>
        </div>
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
    `;

    block.querySelectorAll('[data-cli-act]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const act = btn.getAttribute('data-cli-act');
        if (act === 'xray' && window.rsCommandPalette) {
          window.rsCommandPalette.toggleInspector();
        } else if (act === 'tokens' && window.rsCommandPalette) {
          window.rsCommandPalette.cycleTheme();
          const updatedAccent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
          const valEl = block.querySelectorAll('.home-cli-card__val')[2];
          if (valEl && updatedAccent) valEl.textContent = updatedAccent;
        } else if (act === 'cmdk' && window.rsCommandPalette) {
          window.rsCommandPalette.open();
        }
      });
    });

    stageStream.appendChild(block);
    scrollToNewestCard(block);
  }

  // ---------------------------------------------------------------------------
  // Live Gemini 2.5 Flash RAG Streaming on the Main Stage
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

    const turnEl = document.createElement('article');
    turnEl.className = 'home-ai-turn';
    turnEl.innerHTML = `
      <div class="home-ai-turn__user">
        <span class="home-ai-turn__user-label">You asked</span>
        <div class="home-ai-turn__user-bubble">${escapeHtml(question)}</div>
      </div>
      <div class="home-ai-turn__bot">
        <div class="home-ai-turn__bot-header">
          <span class="home-ai-turn__dot"></span>
          <span class="home-ai-turn__bot-title">Ryan's Portfolio AI</span>
          <span class="home-ai-turn__bot-tag">Gemini 2.5 RAG · Grounded in Shipped Work</span>
        </div>
        <div class="home-ai-turn__body">
          <div class="home-ai-loading">
            <span class="home-ai-loading__text">Synthesizing evidence from case studies &amp; career dossier...</span>
            <span class="loading-dots" aria-hidden="true"><span></span><span></span><span></span></span>
          </div>
        </div>
        <div class="home-ai-turn__sources" hidden></div>
      </div>
    `;

    stageStream.appendChild(turnEl);
    if (!options.skipScrollOnStart) {
      scrollToNewestCard(turnEl);
    }

    const bodyEl = turnEl.querySelector('.home-ai-turn__body');
    const sourcesEl = turnEl.querySelector('.home-ai-turn__sources');

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

      if (!res.ok && !data) {
        throw new Error(`Status ${res.status}`);
      }

      const rawAns =
        data && data.answer
          ? String(data.answer)
          : "Here's how Ryan approaches complex B2B SaaS & AI systems: he combines deep qualitative research with tokenized design systems and browser-native prototyping. Ask about a specific project like **AI-Powered Dashboards (+71% engagement)** or **i4cp Member Portal (+500% AI activation)**.";

      const cleanHtml = parseMarkdown(sanitizeAnswer(rawAns));
      bodyEl.innerHTML = `<div class="home-ai-prose">${cleanHtml}</div>`;

      state.history.push({ role: 'assistant', content: rawAns });

      // Render cited case study pills/links if returned
      if (data && Array.isArray(data.context_cases) && data.context_cases.length) {
        sourcesEl.hidden = false;
        sourcesEl.innerHTML = `
          <span class="home-ai-sources__lbl">Verified Sources:</span>
          <div class="home-ai-sources__list">
            ${data.context_cases
              .slice(0, 3)
              .map((c) => {
                const href = normalizeInternalHref(c.url || '#');
                return `<a href="${escapeHtml(href)}" class="home-ai-source-chip"><span>${escapeHtml(c.title || 'Case Study')}</span><span aria-hidden="true">→</span></a>`;
              })
              .join('')}
          </div>
        `;
      }

      if (data && Array.isArray(data.suggested_pills) && data.suggested_pills.length) {
        renderPills(data.suggested_pills);
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      // Graceful local KB synthesis fallback so the homepage stage always feels instant and authoritative
      bodyEl.innerHTML = `
        <div class="home-ai-prose">
          <p><strong>Ryan Schmidt</strong> is a Senior B2B SaaS Product Designer &amp; UX Engineer in Austin, TX who works at the seam of design and engineering.</p>
          <ul>
            <li><strong>AI-Powered Dashboards (D-Tools):</strong> Drove <strong>+71% beta engagement</strong> and <strong>62% multi-dashboard adoption</strong> by anchoring AI opportunity summaries on verifiable KPIs. <a href="pages/dashboard.html">Read case study →</a></li>
            <li><strong>i4cp Member Portal Overhaul:</strong> Restructured enterprise research IA and launched the Ask Ahri AI search omnibar, lifting <strong>AI feature activation by +500%</strong>. <a href="pages/member-portal-overhaul.html">Read case study →</a></li>
            <li><strong>Real-Time Inventory MVP (D-Tools):</strong> Connected POs to warehouse bins and active jobs, driving an <strong>+18% recurring revenue lift</strong>. <a href="pages/inventory.html">Read case study →</a></li>
          </ul>
        </div>
      `;
    } finally {
      state.inFlight = false;
      omnibarSend.disabled = false;
    }
  }

  // ---------------------------------------------------------------------------
  //Unified Router for Intent Cards, Omnibar, Slash Commands, and Global Hooks
  // ---------------------------------------------------------------------------

  function handleInputOrAction(rawInput) {
    const text = String(rawInput || '').trim();
    if (!text) return;

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

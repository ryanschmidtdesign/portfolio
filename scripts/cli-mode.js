/**
 * Command Palette (⌘K): Atelier Editorial & Clean Navigation
 * High-craft command palette matching the warm paper & ceramic aesthetic.
 * Instant search, clean keyboard shortcuts, zero noise, zero latency.
 */
(function () {
    'use strict';

    const ACCENT_THEMES = [
        { name: 'Terracotta', value: '#C85A32' },
        { name: 'Ember', value: '#E07844' },
        { name: 'Sedona', value: '#D46D3B' }
    ];

    class AtelierCommandPalette {
        constructor() {
            this.isOpen = false;
            this.themeIndex = 0;
            this.activeIndex = 0;
            this.filteredItems = [];
            this.lastFocusedEl = null;

            this.injectStyles();
            this.buildDOM();
            this.bindEvents();
        }

        injectStyles() {
            const existing = document.getElementById('rs-cmdk-styles');
            if (existing) existing.remove();
            const style = document.createElement('style');
            style.id = 'rs-cmdk-styles';
            style.textContent = `
                .rs-cmd-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(12, 10, 9, 0.65);
                    backdrop-filter: blur(14px);
                    -webkit-backdrop-filter: blur(14px);
                    z-index: 2147483000;
                    display: flex;
                    align-items: flex-start;
                    justify-content: center;
                    padding-top: clamp(40px, 11vh, 100px);
                    padding-inline: 16px;
                    opacity: 0;
                    visibility: hidden;
                    pointer-events: none;
                    transition: opacity 180ms cubic-bezier(0.16, 1, 0.3, 1), visibility 0s linear 180ms;
                }

                .rs-cmd-overlay.is-open {
                    opacity: 1;
                    visibility: visible;
                    pointer-events: auto;
                    transition: opacity 200ms cubic-bezier(0.16, 1, 0.3, 1), visibility 0s linear 0s;
                }

                .rs-cmd-modal {
                    position: relative;
                    z-index: 1;
                    width: min(560px, 100%);
                    max-height: 80vh;
                    background: var(--obsidian-glass, rgba(18, 15, 13, 0.94));
                    backdrop-filter: blur(24px) saturate(160%);
                    -webkit-backdrop-filter: blur(24px) saturate(160%);
                    border: 1px solid var(--obsidian-border-strong, rgba(255, 255, 255, 0.14));
                    border-radius: 4px;
                    box-shadow:
                        0 28px 72px -12px rgba(24, 18, 14, 0.75),
                        0 6px 20px rgba(24, 18, 14, 0.40),
                        0 0 0 1px rgba(0, 0, 0, 0.50),
                        inset 0 1px 0 rgba(255, 255, 255, 0.18);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    transform: translateY(-8px) scale(0.985);
                    transition: transform 200ms cubic-bezier(0.16, 1, 0.3, 1);
                    color: #F7F5F2;
                }

                .rs-cmd-modal::before {
                    content: "";
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 1px;
                    background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.22) 50%, transparent 100%);
                    pointer-events: none;
                    z-index: 2;
                }

                .rs-cmd-overlay.is-open .rs-cmd-modal {
                    transform: translateY(0) scale(1);
                }

                /* Search bar */
                .rs-cmd-search {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 13px 16px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                    background: transparent;
                }

                .rs-cmd-search-icon {
                    width: 16px;
                    height: 16px;
                    color: #A8A29E;
                    flex-shrink: 0;
                }

                .rs-cmd-input {
                    flex: 1;
                    border: none;
                    background: transparent;
                    font-family: var(--font-sans);
                    font-size: 0.95rem;
                    font-weight: var(--weight-medium, 500);
                    color: #F7F5F2;
                    outline: none;
                    padding: 0;
                    margin: 0;
                    caret-color: var(--accent, #C85A32);
                }

                .rs-cmd-input::placeholder {
                    color: #8C8680;
                    font-weight: 400;
                }

                .rs-cmd-esc {
                    display: inline-flex;
                    align-items: center;
                    padding: 2px 6px;
                    font-family: var(--font-mono);
                    font-size: 0.62rem;
                    font-weight: 600;
                    letter-spacing: 0.04em;
                    text-transform: uppercase;
                    border-radius: 3px;
                    background: rgba(255, 255, 255, 0.05);
                    color: #A8A29E;
                    border: 1px solid rgba(255, 255, 255, 0.09);
                    flex-shrink: 0;
                    user-select: none;
                    cursor: pointer;
                    transition: background-color 120ms cubic-bezier(0.16, 1, 0.3, 1), border-color 120ms cubic-bezier(0.16, 1, 0.3, 1), color 120ms cubic-bezier(0.16, 1, 0.3, 1);
                }

                .rs-cmd-esc:hover,
                .rs-cmd-esc:focus-visible {
                    background: rgba(255, 255, 255, 0.10);
                    border-color: rgba(255, 255, 255, 0.18);
                    color: #F7F5F2;
                }

                .rs-cmd-esc:focus-visible {
                    outline: 2px solid var(--accent, #C85A32);
                    outline-offset: 2px;
                }

                /* Results */
                .rs-cmd-results {
                    flex: 1;
                    overflow-y: auto;
                    padding: 6px 8px 10px;
                    max-height: 380px;
                    overscroll-behavior: contain;
                    scrollbar-width: thin;
                    scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
                }

                .rs-cmd-group-title {
                    font-family: var(--font-sans);
                    font-size: 0.68rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.07em;
                    color: #A8A29E;
                    padding: 9px 10px 4px;
                    user-select: none;
                }

                .rs-cmd-item {
                    position: relative;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                    padding: 8px 10px;
                    border-radius: 4px;
                    cursor: pointer;
                    text-decoration: none;
                    color: inherit;
                    transition: background 100ms ease;
                    user-select: none;
                    margin-bottom: 1px;
                    border: 1px solid transparent;
                    background: transparent;
                }

                .rs-cmd-item:hover,
                .rs-cmd-item.is-selected {
                    background: rgba(255, 255, 255, 0.07);
                    border-color: rgba(255, 255, 255, 0.12);
                    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
                }

                .rs-cmd-item.is-selected::before {
                    content: "";
                    position: absolute;
                    left: 0;
                    top: 6px;
                    bottom: 6px;
                    width: 2px;
                    border-radius: 1px;
                    background: var(--accent, #C85A32);
                }

                .rs-cmd-item__left {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    min-width: 0;
                    flex: 1;
                }

                .rs-cmd-item__icon {
                    width: 22px;
                    height: 22px;
                    border-radius: 3px;
                    background: rgba(255, 255, 255, 0.04);
                    border: 1px solid rgba(255, 255, 255, 0.07);
                    color: #A8A29E;
                    font-family: var(--font-mono);
                    font-size: 0.65rem;
                    font-weight: 600;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    transition: background-color 100ms cubic-bezier(0.16, 1, 0.3, 1), border-color 100ms cubic-bezier(0.16, 1, 0.3, 1), color 100ms cubic-bezier(0.16, 1, 0.3, 1);
                }

                .rs-cmd-item.is-selected .rs-cmd-item__icon,
                .rs-cmd-item:hover .rs-cmd-item__icon {
                    background: rgba(255, 255, 255, 0.09);
                    border-color: rgba(255, 255, 255, 0.14);
                    color: #F7F5F2;
                }

                .rs-cmd-item__content {
                    display: flex;
                    flex-direction: column;
                    min-width: 0;
                    gap: 1px;
                }

                .rs-cmd-item__title {
                    font-size: 0.88rem;
                    font-weight: 500;
                    color: #F7F5F2;
                    line-height: 1.25;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    letter-spacing: -0.01em;
                }

                .rs-cmd-item__sub {
                    font-size: 0.73rem;
                    color: #A8A29E;
                    line-height: 1.3;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .rs-cmd-mark {
                    background: rgba(200, 90, 50, 0.25);
                    color: #F7F5F2;
                    border-radius: 2px;
                    padding: 0 2px;
                    font-weight: 600;
                }

                .rs-cmd-item__right {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    flex-shrink: 0;
                }

                .rs-cmd-item__kpi {
                    font-family: var(--font-mono);
                    font-size: 0.64rem;
                    font-weight: 500;
                    padding: 2px 6px;
                    border-radius: 2px;
                    letter-spacing: 0.02em;
                    white-space: nowrap;
                }

                .rs-cmd-kpi--cobalt,
                .rs-cmd-kpi--terracotta {
                    background: rgba(200, 90, 50, 0.15);
                    color: #E07844;
                    border: 1px solid rgba(200, 90, 50, 0.30);
                }

                .rs-cmd-kpi--emerald {
                    background: rgba(22, 101, 52, 0.18);
                    color: #4ADE80;
                    border: 1px solid rgba(22, 101, 52, 0.36);
                }

                .rs-cmd-kpi--slate {
                    background: rgba(255, 255, 255, 0.05);
                    color: #A8A29E;
                    border: 1px solid rgba(255, 255, 255, 0.08);
                }

                .rs-cmd-item__badge {
                    font-family: var(--font-mono);
                    font-size: 0.63rem;
                    font-weight: 500;
                    padding: 2px 6px;
                    border-radius: 2px;
                    background: rgba(255, 255, 255, 0.04);
                    color: #A8A29E;
                    border: 1px solid rgba(255, 255, 255, 0.07);
                    white-space: nowrap;
                }

                .rs-cmd-item__return {
                    font-family: var(--font-mono);
                    font-size: 0.72rem;
                    font-weight: 600;
                    color: #A8A29E;
                    opacity: 0;
                    transform: translateX(-3px);
                    transition: opacity 100ms cubic-bezier(0.16, 1, 0.3, 1), transform 100ms cubic-bezier(0.16, 1, 0.3, 1), color 100ms cubic-bezier(0.16, 1, 0.3, 1);
                }

                .rs-cmd-item.is-selected .rs-cmd-item__return,
                .rs-cmd-item:hover .rs-cmd-item__return {
                    opacity: 1;
                    transform: translateX(0);
                    color: var(--accent, #C85A32);
                }

                /* Footer */
                .rs-cmd-footer {
                    display: flex;
                    align-items: center;
                    justify-content: flex-end;
                    padding: 8px 14px;
                    border-top: 1px solid rgba(255, 255, 255, 0.06);
                    background: transparent;
                    font-size: 0.68rem;
                    color: #A8A29E;
                    font-family: var(--font-sans);
                    user-select: none;
                }

                .rs-cmd-footer__shortcuts {
                    display: inline-flex;
                    align-items: center;
                    gap: 12px;
                    flex-shrink: 0;
                }

                .rs-cmd-key {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    min-width: 17px;
                    padding: 1px 4px;
                    border-radius: 2px;
                    background: rgba(255, 255, 255, 0.05);
                    color: #A8A29E;
                    border: 1px solid rgba(255, 255, 255, 0.10);
                    font-size: 0.60rem;
                    font-family: var(--font-mono);
                    font-weight: 600;
                    margin-right: 3px;
                }

                @media (max-width: 640px) {
                    .rs-cmd-overlay {
                        padding-top: calc(16px + env(safe-area-inset-top, 0px));
                        padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
                        padding-inline: 12px;
                    }
                    .rs-cmd-modal {
                        max-height: calc(100vh - 32px);
                    }
                    .rs-cmd-item__sub {
                        display: none;
                    }
                    .rs-cmd-footer {
                        justify-content: center;
                        padding-bottom: calc(8px + env(safe-area-inset-bottom, 0px));
                    }
                    .rs-cmd-esc {
                        padding: 3px 6px;
                        font-size: 0.68rem;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        buildDOM() {
            this.overlay = document.createElement('div');
            this.overlay.className = 'rs-cmd-overlay';
            this.overlay.setAttribute('role', 'dialog');
            this.overlay.setAttribute('aria-modal', 'true');
            this.overlay.setAttribute('aria-label', 'Command Palette');

            this.overlay.innerHTML = `
                <div class="rs-cmd-modal" id="rsCmdModal">
                    <div class="rs-cmd-search">
                        <svg class="rs-cmd-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                        <input
                            type="text"
                            class="rs-cmd-input"
                            id="rsCmdInput"
                            role="combobox"
                            aria-expanded="false"
                            aria-autocomplete="list"
                            aria-controls="rsCmdResults"
                            aria-label="Search case studies, pages, or commands"
                            placeholder="Search projects, pages, or commands..."
                            autocomplete="off"
                            spellcheck="false"
                        />
                        <button type="button" class="rs-cmd-esc" id="rsCmdEscBtn" aria-label="Close command palette" title="Close (Esc)">esc</button>
                    </div>

                    <div class="rs-cmd-results" id="rsCmdResults" role="listbox"></div>

                    <div class="rs-cmd-footer">
                        <div class="rs-cmd-footer__shortcuts">
                            <span><kbd class="rs-cmd-key">↑↓</kbd>navigate</span>
                            <span><kbd class="rs-cmd-key">↵</kbd>select</span>
                            <span><kbd class="rs-cmd-key">esc</kbd>close</span>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(this.overlay);

            this.modalEl = this.overlay.querySelector('#rsCmdModal');
            this.inputEl = this.overlay.querySelector('#rsCmdInput');
            this.resultsEl = this.overlay.querySelector('#rsCmdResults');
            this.escBtn = this.overlay.querySelector('#rsCmdEscBtn');
        }

        getCommands() {
            const path = window.location.pathname || '/';
            const inPagesDir = path.includes('/pages/');
            const prefix = inPagesDir ? '' : 'pages/';
            const homeHref = inPagesDir ? '../index.html' : 'index.html';
            const resumePath = inPagesDir ? '../assets/ryan-schmidt-resume.pdf' : 'assets/ryan-schmidt-resume.pdf';

            return [
                // Case Studies
                {
                    id: 'nav-dashboard',
                    group: 'Case Studies',
                    icon: '01',
                    title: 'Custom Dashboards & AI Summaries',
                    sub: 'D-Tools Cloud · 71% multi-dashboard adoption',
                    badge: 'Case Study',
                    kpi: '+64% Views',
                    kpiType: 'terracotta',
                    targetPath: 'pages/dashboard.html',
                    keywords: 'dashboard bi analytics d-tools cloud opportunity signals custom dashboards ai summaries kpi pipeline b2b data visualization metrics revenue 71% sustained views',
                    action: () => { window.location.href = `${prefix}dashboard.html`; }
                },
                {
                    id: 'nav-member-portal',
                    group: 'Case Studies',
                    icon: '02',
                    title: 'i4cp Member Portal & Research Discovery',
                    sub: 'i4cp Enterprise · Research IA and conversational AI',
                    badge: 'Case Study',
                    kpi: '+500% AI',
                    kpiType: 'terracotta',
                    targetPath: 'pages/member-portal-overhaul.html',
                    keywords: 'i4cp member portal ai search synthesis rag overhaul enterprise research membership 500% sessions daily activity',
                    action: () => { window.location.href = `${prefix}member-portal-overhaul.html`; }
                },
                {
                    id: 'nav-inventory',
                    group: 'Case Studies',
                    icon: '03',
                    title: 'Inventory, Purchasing & Receiving',
                    sub: 'D-Tools Cloud · Desktop supply chain ledger',
                    badge: 'Case Study',
                    kpi: '+8% ARR',
                    kpiType: 'emerald',
                    targetPath: 'pages/inventory.html',
                    keywords: 'inventory purchasing po receiving ledger stepper d-tools supply chain warehouse enterprise 8% mrr recurring revenue',
                    action: () => { window.location.href = `${prefix}inventory.html`; }
                },
                {
                    id: 'nav-ai-portfolio',
                    group: 'Case Studies',
                    icon: '04',
                    title: 'Building My Portfolio in Code',
                    sub: 'Zero-build stack · Vector search · Design tokens',
                    badge: 'Architecture',
                    kpi: 'Zero-Build',
                    kpiType: 'slate',
                    targetPath: 'pages/ai-coding-portfolio.html',
                    keywords: 'portfolio architecture zero-build vector search grounding coding tokens design systems vanilla web components cursor',
                    action: () => { window.location.href = `${prefix}ai-coding-portfolio.html`; }
                },

                // Pages & Navigation
                {
                    id: 'nav-work-overview',
                    group: 'Navigation',
                    icon: '★',
                    title: 'Selected Work',
                    sub: 'Four enterprise case studies',
                    badge: 'Work',
                    targetPath: 'index.html#work',
                    keywords: 'work selected projects case studies shipped outcomes portfolio overview index',
                    action: () => {
                        this.close();
                        const target = document.getElementById('work');
                        if (target) {
                            target.scrollIntoView({ behavior: 'smooth' });
                        } else {
                            window.location.href = `${homeHref}#work`;
                        }
                    }
                },
                {
                    id: 'nav-about',
                    group: 'Navigation',
                    icon: 'RS',
                    title: 'About Ryan Schmidt',
                    sub: 'Background, seniority, and personal craft',
                    badge: 'About',
                    targetPath: 'pages/about.html',
                    keywords: 'about bio leadership experience career history philosophy background ryan schmidt mentor designlab 6+ years',
                    action: () => { window.location.href = `${prefix}about.html`; }
                },
                {
                    id: 'nav-home',
                    group: 'Navigation',
                    icon: '⌂',
                    title: 'Homepage',
                    sub: 'Senior B2B SaaS Product Designer',
                    badge: 'Home',
                    targetPath: 'index.html#top',
                    keywords: 'home index start main portfolio top hero',
                    action: () => {
                        this.close();
                        const top = document.getElementById('top') || document.body;
                        if (path.endsWith('index.html') || path === '/' || path.endsWith('/')) {
                            top.scrollIntoView({ behavior: 'smooth' });
                        } else {
                            window.location.href = homeHref;
                        }
                    }
                },

                // Quick Actions & Direct Links
                {
                    id: 'act-resume',
                    group: 'Connect',
                    icon: '↓',
                    title: 'Resume (PDF)',
                    sub: 'Download or view dossier in new tab',
                    badge: 'PDF ↗',
                    targetPath: 'assets/ryan-schmidt-resume.pdf',
                    keywords: 'resume cv pdf download hire background experience skills ryan schmidt',
                    action: () => {
                        if (typeof window.trackResumeDownload === 'function') window.trackResumeDownload();
                        window.open(resumePath, '_blank', 'noopener');
                        this.close();
                    }
                },
                {
                    id: 'act-email',
                    group: 'Connect',
                    icon: '@',
                    title: 'Email',
                    sub: 'ryanschmidt1989@gmail.com',
                    badge: 'Email ↗',
                    targetPath: 'mailto:ryanschmidt1989@gmail.com',
                    keywords: 'email contact hire reach out message ryanschmidt1989 gmail write direct inbox mailto',
                    action: () => {
                        window.location.href = 'mailto:ryanschmidt1989@gmail.com';
                        this.close();
                    }
                },
                {
                    id: 'act-linkedin',
                    group: 'Connect',
                    icon: '↗',
                    title: 'LinkedIn',
                    sub: 'linkedin.com/in/ryanschmidt1989',
                    badge: 'LinkedIn ↗',
                    targetPath: 'linkedin.com/in/ryanschmidt1989',
                    keywords: 'linkedin contact hire reach out message connect social network',
                    action: () => {
                        window.open('https://www.linkedin.com/in/ryanschmidt1989/', '_blank', 'noopener');
                        this.close();
                    }
                }
            ];
        }

        escapeHtml(str) {
            return String(str || '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');
        }

        highlightText(text, tokens) {
            const safe = this.escapeHtml(text);
            if (!tokens || !tokens.length) return safe;
            const pattern = tokens
                .map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
                .filter(Boolean)
                .join('|');
            if (!pattern) return safe;
            try {
                const regex = new RegExp(`(${pattern})`, 'gi');
                return safe.replace(regex, '<mark class="rs-cmd-mark">$1</mark>');
            } catch {
                return safe;
            }
        }

        bindEvents() {
            // Global ⌘K / Ctrl+K keyboard shortcut
            window.addEventListener('keydown', (e) => {
                if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                    e.preventDefault();
                    this.toggle();
                } else if (e.key === 'Escape' && this.isOpen) {
                    e.preventDefault();
                    this.close();
                }
            });

            // Click outside modal closes
            this.overlay.addEventListener('click', (e) => {
                if (e.target === this.overlay) {
                    this.close();
                }
            });

            // Modal focus trap for keyboard accessibility
            this.overlay.addEventListener('keydown', (e) => {
                if (e.key !== 'Tab' || !this.isOpen) return;
                const focusables = Array.from(
                    this.overlay.querySelectorAll('button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')
                ).filter(el => el.offsetParent !== null);
                if (!focusables.length) return;
                const first = focusables[0];
                const last = focusables[focusables.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            });

            if (this.escBtn) {
                this.escBtn.addEventListener('click', () => this.close());
            }

            // Search input live filtering
            this.inputEl.addEventListener('input', () => {
                this.renderList(this.inputEl.value);
            });

            // Keyboard navigation inside input
            this.inputEl.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    this.moveSelection(1);
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    this.moveSelection(-1);
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    this.executeActive();
                }
            });

            // Delegate clicks on [data-cmdk-trigger] or .ai-mini-cmdk
            document.addEventListener('click', (e) => {
                if (e.target.closest('[data-cmdk-trigger], .ai-mini-cmdk')) {
                    e.preventDefault();
                    this.open();
                }
            });
        }

        renderList(query) {
            const raw = (query || '').trim();
            const q = raw.toLowerCase();
            const all = this.getCommands();
            const tokens = q.split(/\s+/).filter(Boolean);

            if (!tokens.length) {
                this.filteredItems = all;
            } else {
                // First pass: match ALL tokens
                let matches = all.filter((item) => {
                    const text = `${item.title} ${item.sub} ${item.group} ${item.keywords || ''}`.toLowerCase();
                    return tokens.every(t => text.includes(t));
                });

                // Second pass: if no full match, match ANY token and score by relevance
                if (matches.length === 0) {
                    matches = all
                        .map(item => {
                            const text = `${item.title} ${item.sub} ${item.group} ${item.keywords || ''}`.toLowerCase();
                            const score = tokens.reduce((acc, t) => acc + (text.includes(t) ? 1 : 0), 0);
                            return { item, score };
                        })
                        .filter(scored => scored.score > 0)
                        .sort((a, b) => b.score - a.score)
                        .map(scored => scored.item);
                }

                // Append direct AI query dispatch option whenever user types a custom query
                matches.push({
                    id: 'act-ai-query',
                    group: 'Ask AI Assistant',
                    icon: '✦',
                    title: `Ask AI: "${raw}"`,
                    sub: 'Search Ryan’s case studies, shipped outcomes, and role fit',
                    badge: 'Ask AI ↵',
                    targetPath: 'AI Assistant',
                    action: () => {
                        this.triggerAIChat(raw);
                    }
                });

                this.filteredItems = matches;
            }

            this.resultsEl.innerHTML = '';
            let currentGroup = null;

            this.filteredItems.forEach((item, idx) => {
                if (item.group !== currentGroup) {
                    currentGroup = item.group;
                    const groupHeader = document.createElement('div');
                    groupHeader.className = 'rs-cmd-group-title';
                    groupHeader.textContent = currentGroup;
                    this.resultsEl.appendChild(groupHeader);
                }

                const row = document.createElement('div');
                row.id = `rs-cmd-item-${idx}`;
                row.className = `rs-cmd-item${idx === this.activeIndex ? ' is-selected' : ''}`;
                row.setAttribute('role', 'option');
                row.setAttribute('aria-selected', idx === this.activeIndex ? 'true' : 'false');
                row.dataset.index = idx;

                const highlightedTitle = item.id === 'act-ai-query'
                    ? this.escapeHtml(item.title)
                    : this.highlightText(item.title, tokens);
                const highlightedSub = this.highlightText(item.sub, tokens);

                row.innerHTML = `
                    <div class="rs-cmd-item__left">
                        <span class="rs-cmd-item__icon">${this.escapeHtml(item.icon)}</span>
                        <div class="rs-cmd-item__content">
                            <span class="rs-cmd-item__title">${highlightedTitle}</span>
                            <span class="rs-cmd-item__sub">${highlightedSub}</span>
                        </div>
                    </div>
                    <div class="rs-cmd-item__right">
                        ${item.kpi ? `<span class="rs-cmd-item__kpi rs-cmd-kpi--${this.escapeHtml(item.kpiType)}">${this.escapeHtml(item.kpi)}</span>` : `<span class="rs-cmd-item__badge">${this.escapeHtml(item.badge)}</span>`}
                        <span class="rs-cmd-item__return" aria-hidden="true">↵</span>
                    </div>
                `;

                row.addEventListener('click', () => {
                    item.action();
                });

                row.addEventListener('mouseenter', () => {
                    if (this.activeIndex !== idx) {
                        this.setActiveIndex(idx);
                    }
                });

                this.resultsEl.appendChild(row);
            });

            this.setActiveIndex(0);
        }

        setActiveIndex(index) {
            if (this.filteredItems.length === 0) {
                this.activeIndex = 0;
                this.inputEl.removeAttribute('aria-activedescendant');
                return;
            }
            this.activeIndex = Math.max(0, Math.min(index, this.filteredItems.length - 1));
            this.inputEl.setAttribute('aria-activedescendant', `rs-cmd-item-${this.activeIndex}`);
            const rows = this.resultsEl.querySelectorAll('.rs-cmd-item');
            rows.forEach((row, idx) => {
                const isSelected = idx === this.activeIndex;
                row.classList.toggle('is-selected', isSelected);
                row.setAttribute('aria-selected', isSelected ? 'true' : 'false');
                if (isSelected) {
                    row.scrollIntoView({ block: 'nearest' });
                }
            });
        }

        moveSelection(direction) {
            if (this.filteredItems.length === 0) return;
            const nextIndex = (this.activeIndex + direction + this.filteredItems.length) % this.filteredItems.length;
            this.setActiveIndex(nextIndex);
        }

        executeActive() {
            const activeItem = this.filteredItems[this.activeIndex];
            if (activeItem && typeof activeItem.action === 'function') {
                activeItem.action();
            }
        }

        triggerAIChat(query) {
            this.close();
            if (window.rsChatWidget && typeof window.rsChatWidget.send === 'function') {
                window.rsChatWidget.send(query);
                return;
            }
            const miniInput = document.getElementById('ai-mini-input') || document.getElementById('home-omnibar-input');
            const miniSend = document.getElementById('ai-mini-send') || document.getElementById('home-omnibar-send');
            if (miniInput && miniSend) {
                miniInput.value = query;
                miniSend.click();
            } else {
                document.dispatchEvent(new CustomEvent('rs:ask-section', {
                    detail: { prompt: query, sectionContext: { heading: 'Command Palette' } }
                }));
            }
        }

        cycleTheme() {
            this.themeIndex = (this.themeIndex + 1) % ACCENT_THEMES.length;
            const theme = ACCENT_THEMES[this.themeIndex];
            document.documentElement.style.setProperty('--accent', theme.value);
        }

        toggleInspector() {
            this.open();
        }

        open(initialQuery = '') {
            this.lastFocusedEl = document.activeElement;
            this.isOpen = true;
            this.overlay.classList.add('is-open');
            this.inputEl.setAttribute('aria-expanded', 'true');
            const q = String(initialQuery || '');
            this.inputEl.value = q;
            this.renderList(q);
            setTimeout(() => {
                this.inputEl.focus();
                if (q) {
                    this.inputEl.selectionStart = this.inputEl.selectionEnd = q.length;
                }
            }, 40);
        }

        close() {
            if (!this.isOpen) return;
            this.isOpen = false;
            this.overlay.classList.remove('is-open');
            this.inputEl.setAttribute('aria-expanded', 'false');
            this.inputEl.blur();
            if (this.lastFocusedEl && typeof this.lastFocusedEl.focus === 'function') {
                this.lastFocusedEl.focus();
            }
        }

        toggle() {
            if (this.isOpen) {
                this.close();
            } else {
                this.open();
            }
        }
    }

    function initRotatingPlaceholder() {
        const inputs = [
            document.getElementById('home-omnibar-input'),
            document.getElementById('ai-mini-input')
        ].filter(Boolean);

        if (inputs.length === 0) return;

        inputs.forEach(input => {
            if (!input.value || input.value.trim().length === 0) {
                input.placeholder = "Ask AI about Ryan's work...";
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.rsCommandPalette = new AtelierCommandPalette();
            initRotatingPlaceholder();
        });
    } else {
        window.rsCommandPalette = new AtelierCommandPalette();
        initRotatingPlaceholder();
    }
})();

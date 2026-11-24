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
                    background: rgba(28, 25, 23, 0.28);
                    backdrop-filter: blur(6px);
                    -webkit-backdrop-filter: blur(6px);
                    z-index: 2147483000;
                    display: flex;
                    align-items: flex-start;
                    justify-content: center;
                    padding-top: clamp(48px, 12vh, 112px);
                    padding-inline: 16px;
                    opacity: 0;
                    visibility: hidden;
                    pointer-events: none;
                    transition:
                        opacity 150ms var(--ease-out-strong, cubic-bezier(0.23, 1, 0.32, 1)),
                        visibility 0s linear 150ms;
                }

                .rs-cmd-overlay.is-open {
                    opacity: 1;
                    visibility: visible;
                    pointer-events: auto;
                    transition:
                        opacity 220ms var(--ease-out, cubic-bezier(0.16, 1, 0.3, 1)),
                        visibility 0s linear 0s;
                }

                .rs-cmd-modal {
                    position: relative;
                    z-index: 1;
                    width: min(560px, 100%);
                    max-height: 78vh;
                    background: var(--surface-elevated, #FAF7F2);
                    border: 1px solid rgba(28, 25, 23, 0.12);
                    border-radius: 8px;
                    box-shadow:
                        0 24px 60px rgba(28, 25, 23, 0.14),
                        0 2px 10px rgba(28, 25, 23, 0.06);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    transform: translateY(-6px) scale(0.985);
                    transform-origin: top center;
                    transition: transform 150ms var(--ease-out-strong, cubic-bezier(0.23, 1, 0.32, 1));
                    color: var(--text-primary, #171412);
                }

                .rs-cmd-overlay.is-open .rs-cmd-modal {
                    transform: translateY(0) scale(1);
                    transition: transform 240ms var(--ease-out, cubic-bezier(0.16, 1, 0.3, 1));
                }

                /* Search bar */
                .rs-cmd-search {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 15px 18px;
                    border-bottom: 1px solid rgba(28, 25, 23, 0.09);
                    background: transparent;
                    transition: border-color 140ms cubic-bezier(0.16, 1, 0.3, 1);
                }

                .rs-cmd-search:focus-within {
                    border-bottom-color: rgba(28, 25, 23, 0.16);
                }

                .rs-cmd-search-icon {
                    width: 16px;
                    height: 16px;
                    color: #8A8076;
                    flex-shrink: 0;
                    transition: color 140ms cubic-bezier(0.16, 1, 0.3, 1);
                }

                .rs-cmd-search:focus-within .rs-cmd-search-icon {
                    color: var(--accent, #C85A32);
                }

                .rs-cmd-input {
                    flex: 1;
                    border: none;
                    background: transparent;
                    font-family: var(--font-sans);
                    font-size: 0.96rem;
                    font-weight: var(--weight-regular, 400);
                    color: var(--text-primary, #171412);
                    outline: none;
                    box-shadow: none;
                    padding: 0;
                    margin: 0;
                    caret-color: var(--accent, #C85A32);
                }

                .rs-cmd-input:focus,
                .rs-cmd-input:focus-visible {
                    outline: none !important;
                    box-shadow: none !important;
                }

                .rs-cmd-input::placeholder {
                    color: #8A8076;
                    font-weight: 400;
                }

                .rs-cmd-esc {
                    display: inline-flex;
                    align-items: center;
                    padding: 3px 6px;
                    font-family: var(--font-mono);
                    font-size: 0.68rem;
                    font-weight: 500;
                    letter-spacing: 0.03em;
                    border-radius: 4px;
                    background: transparent;
                    color: #8A8076;
                    border: none;
                    flex-shrink: 0;
                    user-select: none;
                    cursor: pointer;
                    transition: background-color 120ms cubic-bezier(0.16, 1, 0.3, 1), color 120ms cubic-bezier(0.16, 1, 0.3, 1), transform 90ms cubic-bezier(0.16, 1, 0.3, 1);
                }

                .rs-cmd-esc:hover,
                .rs-cmd-esc:focus-visible {
                    background: rgba(28, 25, 23, 0.06);
                    color: var(--text-primary, #171412);
                }

                .rs-cmd-esc:focus-visible {
                    outline: 2px solid var(--accent, #C85A32);
                    outline-offset: 2px;
                }

                .rs-cmd-esc:active {
                    transform: scale(0.96);
                }

                /* Results */
                .rs-cmd-results {
                    flex: 1;
                    overflow-y: auto;
                    padding: 8px 10px 12px;
                    max-height: 400px;
                    overscroll-behavior: contain;
                    scrollbar-width: thin;
                    scrollbar-color: rgba(28, 25, 23, 0.16) transparent;
                }

                .rs-cmd-group-title {
                    font-family: var(--font-sans);
                    font-size: 0.68rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.08em;
                    color: #8A8076;
                    padding: 12px 12px 5px;
                    user-select: none;
                }

                .rs-cmd-group-title:first-child {
                    padding-top: 4px;
                }

                .rs-cmd-item {
                    position: relative;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 16px;
                    padding: 9px 12px;
                    border-radius: 5px;
                    cursor: pointer;
                    text-decoration: none;
                    color: inherit;
                    transition:
                        background-color 140ms var(--ease-out-strong, cubic-bezier(0.23, 1, 0.32, 1)),
                        transform var(--dur-press, 100ms) var(--ease-out-strong, cubic-bezier(0.23, 1, 0.32, 1));
                    user-select: none;
                    margin-bottom: 1px;
                    border: none;
                    background: transparent;
                }

                .rs-cmd-item::before {
                    content: "";
                    position: absolute;
                    left: 0;
                    top: 8px;
                    bottom: 8px;
                    width: 2px;
                    border-radius: 1px;
                    background: var(--accent, #C85A32);
                    transform: scaleY(0);
                    transform-origin: center;
                    transition: transform 160ms var(--ease-out, cubic-bezier(0.16, 1, 0.3, 1));
                }

                .rs-cmd-item.is-selected {
                    background: rgba(200, 90, 50, 0.07);
                }

                .rs-cmd-item.is-selected::before {
                    transform: scaleY(1);
                }

                .rs-cmd-item:active {
                    transform: scale(0.992);
                }

                .rs-cmd-item__content {
                    display: flex;
                    flex-direction: column;
                    min-width: 0;
                    flex: 1;
                    gap: 2px;
                }

                .rs-cmd-item__title {
                    font-size: 0.9rem;
                    font-weight: 500;
                    color: var(--text-primary, #171412);
                    line-height: 1.3;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    letter-spacing: -0.01em;
                }

                .rs-cmd-item__sub {
                    font-size: 0.76rem;
                    color: var(--text-secondary, #5C554E);
                    line-height: 1.35;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .rs-cmd-mark {
                    background: rgba(200, 90, 50, 0.14);
                    color: var(--accent-text, #8C3B1E);
                    border-radius: 2px;
                    padding: 0 2px;
                    font-weight: 600;
                }

                .rs-cmd-item__right {
                    display: inline-flex;
                    align-items: center;
                    gap: 10px;
                    flex-shrink: 0;
                }

                .rs-cmd-item__meta {
                    font-family: var(--font-sans);
                    font-size: 0.74rem;
                    font-weight: 400;
                    color: #8A8076;
                    white-space: nowrap;
                    transition: color 140ms var(--ease-out-strong, cubic-bezier(0.23, 1, 0.32, 1));
                }

                .rs-cmd-item.is-selected .rs-cmd-item__meta {
                    color: var(--text-secondary, #5C554E);
                }

                .rs-cmd-item__return {
                    font-family: var(--font-mono);
                    font-size: 0.74rem;
                    font-weight: 500;
                    color: var(--accent, #C85A32);
                    opacity: 0;
                    transform: translateX(-3px);
                    transition:
                        opacity 140ms var(--ease-out-strong, cubic-bezier(0.23, 1, 0.32, 1)),
                        transform 160ms var(--ease-out, cubic-bezier(0.16, 1, 0.3, 1));
                }

                .rs-cmd-item.is-selected .rs-cmd-item__return {
                    opacity: 1;
                    transform: translateX(0);
                }

                /* Footer */
                .rs-cmd-footer {
                    display: flex;
                    align-items: center;
                    justify-content: flex-end;
                    padding: 10px 18px;
                    border-top: 1px solid rgba(28, 25, 23, 0.08);
                    background: transparent;
                    font-size: 0.71rem;
                    color: #8A8076;
                    font-family: var(--font-sans);
                    letter-spacing: 0.01em;
                    user-select: none;
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
                        padding-bottom: calc(10px + env(safe-area-inset-bottom, 0px));
                    }
                }

                @media (prefers-reduced-motion: reduce) {
                    .rs-cmd-overlay,
                    .rs-cmd-overlay.is-open,
                    .rs-cmd-modal,
                    .rs-cmd-search,
                    .rs-cmd-search-icon,
                    .rs-cmd-item,
                    .rs-cmd-item::before,
                    .rs-cmd-item__meta,
                    .rs-cmd-item__return,
                    .rs-cmd-esc {
                        transition-duration: 0.01ms !important;
                        animation-duration: 0.01ms !important;
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
                        <button type="button" class="rs-cmd-esc" id="rsCmdEscBtn" aria-label="Close command palette" title="Close (Esc)">Esc</button>
                    </div>

                    <div class="rs-cmd-results" id="rsCmdResults" role="listbox"></div>

                    <div class="rs-cmd-footer">
                        <span>↑↓ Navigate · ↵ Open · Esc Close</span>
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
                    title: 'Custom Dashboards & AI Summaries',
                    sub: 'Role-based executive analytics and deterministic AI reporting',
                    meta: 'D-Tools · 71% adoption',
                    keywords: 'dashboard bi analytics d-tools cloud opportunity signals custom dashboards ai summaries kpi pipeline b2b data visualization metrics revenue 71% sustained views 64%',
                    action: () => { window.location.href = `${prefix}dashboard.html`; }
                },
                {
                    id: 'nav-member-portal',
                    group: 'Case Studies',
                    title: 'i4cp Member Portal & Research Discovery',
                    sub: 'Enterprise research IA and conversational AI search',
                    meta: 'i4cp · +500% sessions',
                    keywords: 'i4cp member portal ai search synthesis rag overhaul enterprise research membership 500% sessions daily activity',
                    action: () => { window.location.href = `${prefix}member-portal-overhaul.html`; }
                },
                {
                    id: 'nav-inventory',
                    group: 'Case Studies',
                    title: 'Inventory, Purchasing & Receiving',
                    sub: 'Desktop-first supply chain ledger and warehouse receiving',
                    meta: 'D-Tools · +8% ARR',
                    keywords: 'inventory purchasing po receiving ledger stepper d-tools supply chain warehouse enterprise 8% mrr recurring revenue',
                    action: () => { window.location.href = `${prefix}inventory.html`; }
                },
                {
                    id: 'nav-ai-portfolio',
                    group: 'Case Studies',
                    title: 'Building My Portfolio in Code',
                    sub: 'Zero-build HTML/CSS/JS · In-memory RAG · Design tokens',
                    meta: 'This site',
                    keywords: 'portfolio architecture zero-build rag grounding coding tokens design systems vanilla web components cursor',
                    action: () => { window.location.href = `${prefix}ai-coding-portfolio.html`; }
                },

                // Pages & Navigation
                {
                    id: 'nav-work-overview',
                    group: 'Navigation',
                    title: 'Selected Work',
                    sub: 'Four enterprise case studies',
                    meta: 'Section',
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
                    title: 'About Ryan Schmidt',
                    sub: 'Background, seniority, and personal craft',
                    meta: 'Page',
                    keywords: 'about bio leadership experience career history philosophy background ryan schmidt mentor designlab 6+ years',
                    action: () => { window.location.href = `${prefix}about.html`; }
                },
                {
                    id: 'nav-home',
                    group: 'Navigation',
                    title: 'Homepage',
                    sub: 'Senior B2B SaaS Product Designer',
                    meta: 'Home',
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
                    title: 'Resume (PDF)',
                    sub: 'Download or view resume in a new tab',
                    meta: 'PDF ↗',
                    keywords: 'resume cv pdf download hire background experience skills ryan schmidt',
                    action: () => {
                        window.open(resumePath, '_blank', 'noopener');
                        this.close();
                    }
                },
                {
                    id: 'act-email',
                    group: 'Connect',
                    title: 'Email',
                    sub: 'ryanschmidt1989@gmail.com',
                    meta: 'Mail ↗',
                    keywords: 'email contact hire reach out message ryanschmidt1989 gmail write direct inbox mailto',
                    action: () => {
                        window.location.href = 'mailto:ryanschmidt1989@gmail.com';
                        this.close();
                    }
                },
                {
                    id: 'act-linkedin',
                    group: 'Connect',
                    title: 'LinkedIn',
                    sub: 'linkedin.com/in/ryanschmidt1989',
                    meta: 'External ↗',
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
                const key = (e.key || '').toLowerCase();
                if ((e.metaKey || e.ctrlKey) && key === 'k') {
                    e.preventDefault();
                    this.toggle('keyboard');
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
                    this.open('', 'button');
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
                    title: `Ask AI: "${raw}"`,
                    sub: 'Search Ryan’s case studies, shipped outcomes, and role fit',
                    meta: 'Ask AI',
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
                    <div class="rs-cmd-item__content">
                        <span class="rs-cmd-item__title">${highlightedTitle}</span>
                        <span class="rs-cmd-item__sub">${highlightedSub}</span>
                    </div>
                    <div class="rs-cmd-item__right">
                        ${item.meta ? `<span class="rs-cmd-item__meta">${this.escapeHtml(item.meta)}</span>` : ''}
                        <span class="rs-cmd-item__return" aria-hidden="true">↵</span>
                    </div>
                `;

                row.addEventListener('click', () => {
                    this.runCommandItem(item, 'click');
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

        runCommandItem(item) {
            if (!item) return;
            window.rsTrack?.('cmdk_select', {
                source: item.id || 'unknown',
                label: item.title || ''
            });
            if (item.id === 'act-resume') {
                window.rsTrack?.('resume_click', { source: 'cmdk', label: 'Resume (PDF)' });
            } else if (item.id === 'act-email') {
                window.rsTrack?.('copy_email', { source: 'cmdk_mailto', label: 'ryanschmidt1989@gmail.com' });
            } else if (item.id === 'act-linkedin') {
                window.rsTrack?.('linkedin_click', { source: 'cmdk', label: 'LinkedIn' });
            }
            if (typeof item.action === 'function') {
                item.action();
            }
        }

        executeActive() {
            const activeItem = this.filteredItems[this.activeIndex];
            if (activeItem && typeof activeItem.action === 'function') {
                this.runCommandItem(activeItem);
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

        open(initialQuery = '', source = 'programmatic') {
            const wasOpen = this.isOpen;
            this.lastFocusedEl = document.activeElement;
            this.isOpen = true;
            this.overlay.classList.add('is-open');
            this.inputEl.setAttribute('aria-expanded', 'true');
            const q = String(initialQuery || '');
            this.inputEl.value = q;
            this.renderList(q);
            if (!wasOpen) {
                window.rsTrack?.('cmdk_open', { source });
            }
            requestAnimationFrame(() => {
                this.inputEl.focus({ preventScroll: true });
                if (q) {
                    this.inputEl.selectionStart = this.inputEl.selectionEnd = q.length;
                }
            });
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

        toggle(source = 'programmatic') {
            if (this.isOpen) {
                this.close();
            } else {
                this.open('', source);
            }
        }
    }

    const TYPEWRITER_PROMPTS = {
        home: {
            desktop: [
                "Ask AI about Ryan's work...",
                "How did Ryan drive 71% dashboard adoption?",
                "How did he lift AI search by 500% at i4cp?",
                "Walk me through the +8% ARR inventory MVP",
                "Is Ryan a fit for a Senior Product Designer role?"
            ],
            mobile: [
                "Ask AI about Ryan's work...",
                "How did he hit 71% adoption?",
                "How did AI search grow 500%?",
                "Walk through the +8% ARR MVP",
                "Is Ryan a fit for our role?"
            ]
        },
        dashboard: {
            desktop: [
                "Ask AI about Ryan's work...",
                "How did Ryan drive 71% dashboard adoption?",
                "Walk me through Ryan's UX research process",
                "What were the key tradeoffs on this dashboard?",
                "Why modular templates over department views?"
            ],
            mobile: [
                "Ask AI about Ryan's work...",
                "How did he hit 71% adoption?",
                "What was his UX research flow?",
                "Key dashboard design tradeoffs?",
                "Why use modular templates?"
            ]
        },
        portal: {
            desktop: [
                "Ask AI about Ryan's work...",
                "How did Ryan lift AI search sessions by 500%?",
                "Why progressive disclosure over flat navigation?",
                "What was the hardest tradeoff on this portal?",
                "How did member task research shape the IA?"
            ],
            mobile: [
                "Ask AI about Ryan's work...",
                "How did AI search grow 500%?",
                "Why progressive disclosure?",
                "Hardest portal design tradeoff?",
                "How did research shape the IA?"
            ]
        },
        inventory: {
            desktop: [
                "Ask AI about Ryan's work...",
                "Walk me through the +8% ARR inventory MVP",
                "Why did Ryan start with an MVP scope?",
                "How did he get engineering & stakeholder buy-in?",
                "What were the biggest workflow tradeoffs?"
            ],
            mobile: [
                "Ask AI about Ryan's work...",
                "Walk through the +8% ARR MVP",
                "Why start with an MVP scope?",
                "How did he get team buy-in?",
                "Biggest workflow tradeoffs?"
            ]
        },
        portfolio: {
            desktop: [
                "Ask AI about Ryan's work...",
                "What AI tools and workflow did Ryan use?",
                "How are the CSS design tokens structured?",
                "Why build with vanilla HTML, CSS, and JS?",
                "How does the custom Gemini AI assistant work?"
            ],
            mobile: [
                "Ask AI about Ryan's work...",
                "What AI workflow did he use?",
                "How do the CSS tokens work?",
                "Why vanilla HTML, CSS & JS?",
                "How does the AI chat work?"
            ]
        },
        about: {
            desktop: [
                "Ask AI about Ryan's work...",
                "What is Ryan's product design philosophy?",
                "What does Ryan's design mentorship look like?",
                "How does Ryan prototype in code with Cursor?",
                "Is Ryan a fit for a Senior Product Designer role?"
            ],
            mobile: [
                "Ask AI about Ryan's work...",
                "What is his design philosophy?",
                "How does Ryan mentor designers?",
                "How does he prototype in code?",
                "Is Ryan a fit for our role?"
            ]
        }
    };

    function getPagePromptKey() {
        const path = (window.location.pathname || '/').toLowerCase();
        if (path.includes('dashboard')) return 'dashboard';
        if (path.includes('member-portal')) return 'portal';
        if (path.includes('inventory')) return 'inventory';
        if (path.includes('ai-coding-portfolio')) return 'portfolio';
        if (path.includes('about')) return 'about';
        return 'home';
    }

    function getActivePrompts() {
        const key = getPagePromptKey();
        const group = TYPEWRITER_PROMPTS[key] || TYPEWRITER_PROMPTS.home;
        return window.innerWidth <= 600 ? group.mobile : group.desktop;
    }

    function initRotatingPlaceholder() {
        const inputs = [
            document.getElementById('home-omnibar-input'),
            document.getElementById('ai-mini-input')
        ].filter(Boolean);

        if (inputs.length === 0) return;

        const STATIC_PLACEHOLDER = "Ask AI about Ryan's work...";

        inputs.forEach(input => {
            input.placeholder = STATIC_PLACEHOLDER;

            const topContainer = input.closest('.home-omnibar-top, .subpage-omnibar-top') || input.parentElement;
            if (!topContainer || topContainer.querySelector('.omnibar-typewriter')) return;

            let promptIndex = 0;
            const overlay = document.createElement('div');
            overlay.className = 'omnibar-typewriter';
            overlay.setAttribute('aria-hidden', 'true');

            const track = document.createElement('span');
            track.className = 'omnibar-typewriter__track';

            const copy = document.createElement('span');
            copy.className = 'omnibar-typewriter__copy';
            copy.textContent = getActivePrompts()[0] || STATIC_PLACEHOLDER;

            const caret = document.createElement('span');
            caret.className = 'omnibar-typewriter__caret';

            track.appendChild(copy);
            track.appendChild(caret);
            overlay.appendChild(track);
            input.insertAdjacentElement('afterend', overlay);
            input.classList.add('has-typewriter');

            // Advance to the next idea at the end of each 6s wipe-retract cycle (when text is 100% clipped at 0%)
            copy.addEventListener('animationiteration', () => {
                const list = getActivePrompts();
                promptIndex = (promptIndex + 1) % list.length;
                copy.textContent = list[promptIndex] || STATIC_PLACEHOLDER;
            });

            // Restart cleanly from the first prompt when focus leaves an empty input
            input.addEventListener('blur', () => {
                if (!input.value) {
                    const list = getActivePrompts();
                    promptIndex = 0;
                    copy.textContent = list[0] || STATIC_PLACEHOLDER;
                    copy.style.animation = 'none';
                    caret.style.animation = 'none';
                    void track.offsetWidth;
                    copy.style.animation = '';
                    caret.style.animation = '';
                }
            });
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

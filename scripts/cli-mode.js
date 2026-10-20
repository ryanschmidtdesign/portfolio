/**
 * Atelier Command Palette (⌘K) — Raycast & Spotlight Style
 * Clean, fast, zero-latency search across case studies, actions, and portfolio AI.
 */
(function () {
    'use strict';

    const ACCENT_THEMES = [
        { name: 'Cobalt Tension', value: '#0033FF' },
        { name: 'Terracotta Atelier', value: '#C86446' },
        { name: 'Emerald Signal', value: '#10B981' }
    ];

    class AtelierCommandPalette {
        constructor() {
            this.isOpen = false;
            this.themeIndex = 0;
            this.activeIndex = 0;
            this.filteredItems = [];

            this.injectStyles();
            this.buildDOM();
            this.bindEvents();
        }

        injectStyles() {
            if (document.getElementById('rs-cmdk-styles')) return;
            const style = document.createElement('style');
            style.id = 'rs-cmdk-styles';
            style.textContent = `
                .rs-cmd-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(15, 23, 42, 0.48);
                    backdrop-filter: blur(20px) saturate(180%);
                    -webkit-backdrop-filter: blur(20px) saturate(180%);
                    z-index: 10000;
                    display: flex;
                    align-items: flex-start;
                    justify-content: center;
                    padding-top: clamp(48px, 12vh, 120px);
                    padding-inline: 16px;
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity 180ms cubic-bezier(0.16, 1, 0.3, 1);
                }
                .rs-cmd-overlay.is-open {
                    opacity: 1;
                    pointer-events: auto;
                }
                .rs-cmd-modal {
                    width: min(590px, 100%);
                    max-height: 80vh;
                    background: #FAF9F6;
                    border: 1px solid rgba(15, 23, 42, 0.09);
                    border-radius: 18px;
                    box-shadow:
                        inset 0 1px 0 rgba(255, 255, 255, 0.95),
                        0 32px 72px -16px rgba(15, 23, 42, 0.28),
                        0 4px 16px rgba(15, 23, 42, 0.05);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    transform: translateY(-8px) scale(0.985);
                    transition: transform 180ms cubic-bezier(0.16, 1, 0.3, 1);
                }
                .rs-cmd-overlay.is-open .rs-cmd-modal {
                    transform: translateY(0) scale(1);
                }
                .rs-cmd-search {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 14px 18px;
                    border-bottom: 1px solid rgba(15, 23, 42, 0.07);
                    background: #FFFFFF;
                }
                .rs-cmd-search__icon {
                    color: #8E8D87;
                    flex-shrink: 0;
                }
                .rs-cmd-input {
                    flex: 1;
                    border: none;
                    background: transparent;
                    font-family: var(--font-sans, -apple-system, sans-serif);
                    font-size: 0.98rem;
                    font-weight: 500;
                    color: #141413;
                    outline: none;
                    padding: 2px 0;
                    margin: 0;
                }
                .rs-cmd-input::placeholder {
                    color: #94A3B8;
                    font-weight: 400;
                }
                .rs-cmd-esc {
                    display: inline-flex;
                    align-items: center;
                    padding: 2px 6px;
                    font-family: var(--font-mono, monospace);
                    font-size: 0.65rem;
                    font-weight: 600;
                    border-radius: 5px;
                    background: #FFFFFF;
                    color: #64748B;
                    border: 1px solid rgba(15, 23, 42, 0.12);
                    box-shadow: 0 1px 1px rgba(15, 23, 42, 0.06), inset 0 1px 0 #fff;
                    flex-shrink: 0;
                    user-select: none;
                }
                .rs-cmd-results {
                    flex: 1;
                    overflow-y: auto;
                    padding: 8px;
                    max-height: 380px;
                    overscroll-behavior: contain;
                }
                .rs-cmd-group-title {
                    font-family: var(--font-mono, monospace);
                    font-size: 0.65rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.06em;
                    color: #8E8D87;
                    padding: 8px 10px 4px;
                    user-select: none;
                }
                .rs-cmd-item {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                    padding: 9px 10px;
                    border-radius: 10px;
                    cursor: pointer;
                    text-decoration: none;
                    color: inherit;
                    transition: all 120ms ease;
                    user-select: none;
                    margin-bottom: 2px;
                    border-left: 2.5px solid transparent;
                }
                .rs-cmd-item:hover,
                .rs-cmd-item.is-selected {
                    background: rgba(0, 51, 255, 0.055);
                    border-left-color: var(--accent, #0033FF);
                    border-radius: 4px 10px 10px 4px;
                }
                .rs-cmd-item.is-selected .rs-cmd-item__title {
                    color: var(--accent, #0033FF);
                }
                .rs-cmd-item__left {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    min-width: 0;
                    flex: 1;
                }
                .rs-cmd-item__icon {
                    width: 24px;
                    height: 24px;
                    border-radius: 6px;
                    background: rgba(15, 23, 42, 0.05);
                    color: #475569;
                    font-family: var(--font-mono, monospace);
                    font-size: 0.68rem;
                    font-weight: 600;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }
                .rs-cmd-item__content {
                    display: flex;
                    flex-direction: column;
                    min-width: 0;
                    gap: 2px;
                }
                .rs-cmd-item__title {
                    font-size: 0.86rem;
                    font-weight: 600;
                    color: #141413;
                    line-height: 1.25;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .rs-cmd-item__sub {
                    font-size: 0.72rem;
                    color: #787772;
                    line-height: 1.25;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .rs-cmd-item__right {
                    display: inline-flex;
                    align-items: center;
                    gap: 7px;
                    flex-shrink: 0;
                }
                .rs-cmd-item__kpi {
                    font-family: var(--font-mono, monospace);
                    font-size: 0.65rem;
                    font-weight: 600;
                    padding: 2px 7px;
                    border-radius: 6px;
                    letter-spacing: -0.01em;
                    white-space: nowrap;
                }
                .rs-cmd-kpi--cobalt {
                    background: rgba(0, 51, 255, 0.08);
                    color: #0033FF;
                    border: 1px solid rgba(0, 51, 255, 0.18);
                }
                .rs-cmd-kpi--emerald {
                    background: rgba(16, 185, 129, 0.09);
                    color: #059669;
                    border: 1px solid rgba(16, 185, 129, 0.22);
                }
                .rs-cmd-kpi--terracotta {
                    background: rgba(200, 100, 70, 0.1);
                    color: #C86446;
                    border: 1px solid rgba(200, 100, 70, 0.22);
                }
                .rs-cmd-kpi--slate {
                    background: rgba(15, 23, 42, 0.05);
                    color: #475569;
                    border: 1px solid rgba(15, 23, 42, 0.08);
                }
                .rs-cmd-item__badge {
                    font-family: var(--font-mono, monospace);
                    font-size: 0.65rem;
                    font-weight: 500;
                    padding: 2px 7px;
                    border-radius: 6px;
                    background: rgba(15, 23, 42, 0.04);
                    color: #64748B;
                    border: 1px solid rgba(15, 23, 42, 0.06);
                    white-space: nowrap;
                }
                .rs-cmd-item__return {
                    font-family: var(--font-mono, monospace);
                    font-size: 0.72rem;
                    color: var(--accent, #0033FF);
                    opacity: 0;
                    transform: translateX(-2px);
                    transition: all 120ms ease;
                }
                .rs-cmd-item.is-selected .rs-cmd-item__return,
                .rs-cmd-item:hover .rs-cmd-item__return {
                    opacity: 1;
                    transform: translateX(0);
                }
                .rs-cmd-footer {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 8px 16px;
                    border-top: 1px solid rgba(15, 23, 42, 0.07);
                    background: #FAF9F6;
                    font-size: 0.68rem;
                    color: #8E8D87;
                    font-family: var(--font-mono, monospace);
                }
                .rs-cmd-footer__brand {
                    letter-spacing: 0.02em;
                    color: #64748B;
                }
                .rs-cmd-footer__shortcuts {
                    display: inline-flex;
                    align-items: center;
                    gap: 10px;
                }
                .rs-cmd-key {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    min-width: 17px;
                    padding: 1.5px 5px;
                    border-radius: 4px;
                    background: #FFFFFF;
                    color: #475569;
                    border: 1px solid rgba(15, 23, 42, 0.14);
                    box-shadow: 0 1px 1px rgba(15, 23, 42, 0.08), inset 0 1px 0 #fff;
                    font-size: 0.65rem;
                    font-weight: 600;
                }
                @media (max-width: 600px) {
                    .rs-cmd-footer__brand {
                        display: none;
                    }
                    .rs-cmd-item__sub {
                        display: none;
                    }
                    .rs-cmd-modal {
                        max-height: 88vh;
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
                <div class="rs-cmd-modal">
                    <div class="rs-cmd-search">
                        <svg class="rs-cmd-search__icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                        <input
                            type="text"
                            class="rs-cmd-input"
                            id="rsCmdInput"
                            placeholder="Search case studies, pages, or quick actions..."
                            autocomplete="off"
                            spellcheck="false"
                        />
                        <kbd class="rs-cmd-esc">esc</kbd>
                    </div>
                    <div class="rs-cmd-results" id="rsCmdResults" role="listbox"></div>
                    <div class="rs-cmd-footer">
                        <div class="rs-cmd-footer__brand">Ryan Schmidt · Senior Product Designer</div>
                        <div class="rs-cmd-footer__shortcuts">
                            <span><kbd class="rs-cmd-key">↑↓</kbd> navigate</span>
                            <span><kbd class="rs-cmd-key">↵</kbd> select</span>
                            <span><kbd class="rs-cmd-key">esc</kbd> close</span>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(this.overlay);

            this.inputEl = this.overlay.querySelector('#rsCmdInput');
            this.resultsEl = this.overlay.querySelector('#rsCmdResults');
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
                    title: 'BI Analytics & Opportunity Signals — D-Tools Cloud',
                    sub: '+71% Beta Engagement · Executive KPI system & pipeline forecasting',
                    badge: 'Case Study',
                    kpi: '+71% Beta',
                    kpiType: 'cobalt',
                    keywords: 'dashboard bi analytics d-tools cloud opportunity signals kpi pipeline b2b',
                    action: () => { window.location.href = `${prefix}dashboard.html`; }
                },
                {
                    id: 'nav-inventory',
                    group: 'Case Studies',
                    icon: '02',
                    title: 'Inventory, Purchasing & Receiving — D-Tools Cloud',
                    sub: '+18% Recurring Revenue · Auditable ledger & interactive stepper',
                    badge: 'Case Study',
                    kpi: '+18% MRR',
                    kpiType: 'emerald',
                    keywords: 'inventory purchasing po receiving ledger stepper d-tools supply chain',
                    action: () => { window.location.href = `${prefix}inventory.html`; }
                },
                {
                    id: 'nav-member-portal',
                    group: 'Case Studies',
                    icon: '03',
                    title: 'AI Search & Member Portal Overhaul — i4cp',
                    sub: '+500% AI Activation · Conversational synthesis & enterprise research',
                    badge: 'Case Study',
                    kpi: '+500% AI',
                    kpiType: 'terracotta',
                    keywords: 'i4cp member portal ai search synthesis rag overhaul enterprise',
                    action: () => { window.location.href = `${prefix}member-portal-overhaul.html`; }
                },
                {
                    id: 'nav-ai-portfolio',
                    group: 'Case Studies',
                    icon: '04',
                    title: 'Designing & Building an AI-Native Portfolio',
                    sub: 'Zero-Build Stack · Gemini 2.5 Flash RAG · Token Architecture',
                    badge: 'Architecture',
                    kpi: 'Zero-Build',
                    kpiType: 'slate',
                    keywords: 'portfolio ai rag gemini coding tokens architecture vanilla',
                    action: () => { window.location.href = `${prefix}ai-coding-portfolio.html`; }
                },

                // Pages & Navigation
                {
                    id: 'nav-about',
                    group: 'Pages & Profile',
                    icon: 'RS',
                    title: 'About Ryan Schmidt — Leadership & Background',
                    sub: '15+ years leading B2B SaaS, Design Systems, and AI-accelerated teams',
                    badge: 'Profile',
                    keywords: 'about bio leadership experience career history philosophy background',
                    action: () => { window.location.href = `${prefix}about.html`; }
                },
                {
                    id: 'nav-home',
                    group: 'Pages & Profile',
                    icon: '⌂',
                    title: 'Home — Editorial Index & Studio Stage',
                    sub: 'Return to the conversational stage and primary portfolio index',
                    badge: 'Index',
                    keywords: 'home index start main stage portfolio',
                    action: () => { window.location.href = homeHref; }
                },

                // Quick Actions
                {
                    id: 'act-resume',
                    group: 'Quick Actions',
                    icon: '↓',
                    title: 'View Resume (PDF)',
                    sub: 'Open ryan-schmidt-resume.pdf in a new tab',
                    badge: 'PDF ↗',
                    keywords: 'resume cv pdf download hire background experience',
                    action: () => {
                        window.open(resumePath, '_blank', 'noopener');
                        this.close();
                    }
                },
                {
                    id: 'act-linkedin',
                    group: 'Quick Actions',
                    icon: '↗',
                    title: 'Connect on LinkedIn',
                    sub: 'linkedin.com/in/ryanschmidt1989 — Message or network directly',
                    badge: 'Connect ↗',
                    keywords: 'linkedin contact hire reach out message connect social',
                    action: () => {
                        window.open('https://www.linkedin.com/in/ryanschmidt1989/', '_blank', 'noopener');
                        this.close();
                    }
                },
                {
                    id: 'act-ai-projects',
                    group: 'Interactive Inquiries',
                    icon: '↗',
                    title: 'Strongest projects and verified business impact',
                    sub: 'Outcomes across D-Tools Cloud, i4cp, and design systems',
                    badge: 'Inquiry ↗',
                    keywords: 'strongest projects outcomes impact metrics results case studies d-tools i4cp',
                    action: () => {
                        this.close();
                        this.triggerAIChat('What are his strongest projects and measurable outcomes?');
                    }
                },
                {
                    id: 'act-ai-leadership',
                    group: 'Interactive Inquiries',
                    icon: '↗',
                    title: 'Design leadership, team workflows & prototyping',
                    sub: 'Player-coach leadership, token governance, and browser prototyping',
                    badge: 'Inquiry ↗',
                    keywords: 'leadership style philosophy management workflow craft team design systems',
                    action: () => {
                        this.close();
                        this.triggerAIChat('What is his leadership style and design approach?');
                    }
                }
            ];
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

            // Wire subpage slash popover if present
            const subSlashBtn = document.getElementById('subpage-slash-btn');
            const subSlashPopover = document.getElementById('subpage-slash-popover');
            if (subSlashBtn && subSlashPopover) {
                subSlashBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const isHidden = subSlashPopover.hidden;
                    subSlashPopover.hidden = !isHidden;
                    subSlashBtn.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
                });

                subSlashPopover.querySelectorAll('[data-slash-cmd]').forEach((btn) => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const cmd = btn.getAttribute('data-slash-cmd');
                        subSlashPopover.hidden = true;
                        subSlashBtn.setAttribute('aria-expanded', 'false');
                        const path = window.location.pathname || '/';
                        const inPagesDir = path.includes('/pages/');
                        const resumePath = inPagesDir ? '../assets/ryan-schmidt-resume.pdf' : 'assets/ryan-schmidt-resume.pdf';
                        const aboutPath = inPagesDir ? 'about.html' : 'pages/about.html';

                        if (cmd === 'work') {
                            this.open();
                        } else if (cmd === 'resume') {
                            window.open(resumePath, '_blank', 'noopener');
                        } else if (cmd === 'about') {
                            window.location.href = aboutPath;
                        } else if (cmd === 'contact') {
                            window.open('https://www.linkedin.com/in/ryanschmidt1989/', '_blank', 'noopener');
                        } else if (cmd === 'approach') {
                            document.dispatchEvent(new CustomEvent('rs:ask-section', {
                                detail: {
                                    prompt: "What is Ryan's design philosophy and approach to AI?",
                                    sectionContext: { heading: "Design Philosophy" }
                                }
                            }));
                        } else if (cmd === 'tokens') {
                            this.cycleTheme();
                        }
                    });
                });

                document.addEventListener('click', (e) => {
                    if (!subSlashPopover.hidden && !subSlashPopover.contains(e.target) && e.target !== subSlashBtn) {
                        subSlashPopover.hidden = true;
                        subSlashBtn.setAttribute('aria-expanded', 'false');
                    }
                });
            }
        }

        renderList(query) {
            const q = (query || '').trim().toLowerCase();
            const all = this.getCommands();

            this.filteredItems = q
                ? all.filter((item) =>
                    item.title.toLowerCase().includes(q) ||
                    item.sub.toLowerCase().includes(q) ||
                    item.group.toLowerCase().includes(q) ||
                    item.keywords.toLowerCase().includes(q)
                )
                : all;

            if (q && this.filteredItems.length === 0) {
                this.filteredItems = [
                    {
                        id: 'ai-fallback',
                        group: 'Ask Portfolio AI',
                        icon: '✦',
                        title: `Ask AI: "${query.trim()}"`,
                        sub: 'Press Enter to submit this question directly to the AI assistant',
                        badge: 'Enter ↵',
                        keywords: '',
                        action: () => {
                            this.close();
                            this.triggerAIChat(query.trim());
                        }
                    }
                ];
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
                row.className = `rs-cmd-item${idx === this.activeIndex ? ' is-selected' : ''}`;
                row.setAttribute('role', 'option');
                row.setAttribute('aria-selected', idx === this.activeIndex ? 'true' : 'false');
                row.dataset.index = idx;

                row.innerHTML = `
                    <div class="rs-cmd-item__left">
                        <span class="rs-cmd-item__icon">${item.icon}</span>
                        <div class="rs-cmd-item__content">
                            <span class="rs-cmd-item__title">${item.title}</span>
                            <span class="rs-cmd-item__sub">${item.sub}</span>
                        </div>
                    </div>
                    <div class="rs-cmd-item__right">
                        ${item.kpi ? `<span class="rs-cmd-item__kpi rs-cmd-kpi--${item.kpiType}">${item.kpi}</span>` : ''}
                        <span class="rs-cmd-item__badge">${item.badge}</span>
                        <span class="rs-cmd-item__return" aria-hidden="true">↵</span>
                    </div>
                `;

                row.addEventListener('click', () => {
                    item.action();
                });

                row.addEventListener('mouseenter', () => {
                    this.setActiveIndex(idx);
                });

                this.resultsEl.appendChild(row);
            });

            this.setActiveIndex(0);
        }

        setActiveIndex(index) {
            if (this.filteredItems.length === 0) {
                this.activeIndex = 0;
                return;
            }
            this.activeIndex = Math.max(0, Math.min(index, this.filteredItems.length - 1));
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
            if (typeof window.rsHomeStageAsk === 'function' && document.body.classList.contains('is-home')) {
                window.rsHomeStageAsk(query);
                return;
            }
            const miniInput = document.getElementById('ai-mini-input');
            const miniSend = document.getElementById('ai-mini-send');
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
            // Graceful toggle for compatibility
            this.open();
        }

        open() {
            this.isOpen = true;
            this.overlay.classList.add('is-open');
            this.inputEl.value = '';
            this.renderList('');
            setTimeout(() => this.inputEl.focus(), 50);
        }

        close() {
            this.isOpen = false;
            this.overlay.classList.remove('is-open');
            this.inputEl.blur();
        }

        toggle() {
            if (this.isOpen) {
                this.close();
            } else {
                this.open();
            }
        }
    }

    // Initialize when DOM is ready
    function initSubpagePlaceholder() {
        const miniInput = document.getElementById('ai-mini-input');
        if (miniInput && window.innerWidth <= 600) {
            miniInput.placeholder = 'Search case studies...';
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.rsCommandPalette = new AtelierCommandPalette();
            initSubpagePlaceholder();
        });
    } else {
        window.rsCommandPalette = new AtelierCommandPalette();
        initSubpagePlaceholder();
    }
    window.addEventListener('resize', initSubpagePlaceholder);
})();

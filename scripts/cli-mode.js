/**
 * Command Palette (⌘K) — Atelier Editorial & Clean Navigation
 * High-craft command palette matching the warm paper & ceramic aesthetic.
 * Instant search, clean keyboard shortcuts, zero noise, zero latency.
 */
(function () {
    'use strict';

    /**
     * Silent audio interface (no audio synthesis / no audio context)
     */
    class SilentAudioEngine {
        playBoot() {}
        playKey() {}
        playTick() {}
        playExec() {}
        playClose() {}
        toggle() { return false; }
    }

    const audioFX = new SilentAudioEngine();
    window.rsAudioFX = audioFX;

    class AtelierCommandPalette {
        constructor() {
            this.isOpen = false;
            this.themeIndex = 0;
            this.activeIndex = 0;
            this.filteredItems = [];
            this.lastFocusedEl = null;
            this.pointerX = 0.5;
            this.pointerY = 0.5;

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
                    transition: opacity 200ms cubic-bezier(0.16, 1, 0.3, 1), visibility 200ms;
                }

                .rs-cmd-overlay.is-open {
                    opacity: 1;
                    visibility: visible;
                    pointer-events: auto;
                }

                .rs-cmd-modal {
                    position: relative;
                    z-index: 1;
                    width: min(620px, 100%);
                    max-height: 80vh;
                    background: rgba(12, 11, 15, 0.78);
                    backdrop-filter: blur(20px) saturate(190%);
                    -webkit-backdrop-filter: blur(20px) saturate(190%);
                    border: 1px solid rgba(255, 255, 255, 0.18);
                    border-radius: 2px;
                    box-shadow:
                        0 24px 64px -12px rgba(0, 0, 0, 0.8),
                        0 4px 16px rgba(0, 0, 0, 0.4),
                        inset 0 1px 0 rgba(255, 255, 255, 0.22);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    transform: translateY(-8px) scale(0.985);
                    transition: transform 220ms cubic-bezier(0.16, 1, 0.3, 1);
                    color: #F7F5F2;
                }

                .rs-cmd-overlay.is-open .rs-cmd-modal {
                    transform: translateY(0) scale(1);
                }

                /* Header bar */
                .rs-cmd-telemetry {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 10px;
                    padding: 8px 16px;
                    background: rgba(255, 255, 255, 0.02);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
                    font-family: var(--font-sans);
                    font-size: 0.72rem;
                    font-weight: 500;
                    color: #A8A29E;
                    user-select: none;
                }

                .rs-cmd-telemetry__left {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                }

                .rs-cmd-sys-tag {
                    font-weight: 600;
                    color: #F7F5F2;
                }

                .rs-cmd-sys-divider {
                    color: rgba(255, 255, 255, 0.20);
                }

                .rs-cmd-sys-meta {
                    color: #78716C;
                }

                /* Search bar */
                .rs-cmd-search {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px 16px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                    background: rgba(16, 14, 18, 0.70);
                }

                .rs-cmd-prompt-glyph {
                    font-family: var(--font-mono);
                    font-size: 0.95rem;
                    font-weight: 700;
                    color: var(--accent, #C85A32);
                    flex-shrink: 0;
                    user-select: none;
                }

                .rs-cmd-input {
                    flex: 1;
                    border: none;
                    background: transparent;
                    font-family: var(--font-sans);
                    font-size: 0.98rem;
                    font-weight: var(--weight-medium);
                    color: #F7F5F2;
                    outline: none;
                    padding: 0;
                    margin: 0;
                    caret-color: var(--accent, #C85A32);
                }

                .rs-cmd-input::placeholder {
                    color: #78716C;
                    font-weight: 400;
                }

                .rs-cmd-node-count {
                    font-family: var(--font-mono);
                    font-size: 0.64rem;
                    font-weight: 600;
                    letter-spacing: 0.04em;
                    padding: 2px 7px;
                    border-radius: 2px;
                    background: rgba(255, 255, 255, 0.05);
                    color: #A8A29E;
                    border: 1px solid rgba(255, 255, 255, 0.09);
                    flex-shrink: 0;
                    user-select: none;
                }

                .rs-cmd-esc {
                    display: inline-flex;
                    align-items: center;
                    padding: 2px 7px;
                    font-family: var(--font-mono);
                    font-size: 0.64rem;
                    font-weight: 600;
                    letter-spacing: 0.04em;
                    text-transform: uppercase;
                    border-radius: 2px;
                    background: rgba(255, 255, 255, 0.06);
                    color: #A8A29E;
                    border: 1px solid rgba(255, 255, 255, 0.12);
                    flex-shrink: 0;
                    user-select: none;
                    cursor: pointer;
                    transition: all 140ms ease;
                }

                .rs-cmd-esc:hover {
                    background: rgba(200, 90, 50, 0.20);
                    border-color: rgba(200, 90, 50, 0.45);
                    color: #F7F5F2;
                }

                /* Results */
                .rs-cmd-results {
                    flex: 1;
                    overflow-y: auto;
                    padding: 8px 10px 14px;
                    max-height: 400px;
                    overscroll-behavior: contain;
                    scrollbar-width: thin;
                    scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
                }

                .rs-cmd-group-title {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-family: var(--font-sans);
                    font-size: 0.70rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.06em;
                    color: #78716C;
                    padding: 10px 8px 4px;
                    user-select: none;
                }

                .rs-cmd-group-title::after {
                    content: "";
                    flex: 1;
                    height: 1px;
                    background: rgba(255, 255, 255, 0.07);
                }

                .rs-cmd-item {
                    position: relative;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                    padding: 9px 12px;
                    border-radius: 2px;
                    cursor: pointer;
                    text-decoration: none;
                    color: inherit;
                    transition: background 120ms ease, border-color 120ms ease;
                    user-select: none;
                    margin-bottom: 2px;
                    border: 1px solid transparent;
                    border-left: 2.5px solid transparent;
                    background: transparent;
                }

                .rs-cmd-item:hover,
                .rs-cmd-item.is-selected {
                    background: rgba(200, 90, 50, 0.10);
                    border-color: rgba(200, 90, 50, 0.25);
                    border-left-color: var(--accent, #C85A32);
                }

                .rs-cmd-item__left {
                    display: flex;
                    align-items: center;
                    gap: 11px;
                    min-width: 0;
                    flex: 1;
                }

                .rs-cmd-item__icon {
                    width: 24px;
                    height: 24px;
                    border-radius: 2px;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    color: #A8A29E;
                    font-family: var(--font-mono);
                    font-size: 0.68rem;
                    font-weight: 600;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    transition: all 120ms ease;
                }

                .rs-cmd-item.is-selected .rs-cmd-item__icon,
                .rs-cmd-item:hover .rs-cmd-item__icon {
                    background: rgba(200, 90, 50, 0.20);
                    border-color: rgba(200, 90, 50, 0.45);
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
                    font-weight: 600;
                    color: #F7F5F2;
                    line-height: 1.25;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    letter-spacing: -0.01em;
                }

                .rs-cmd-item__sub {
                    font-size: 0.74rem;
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
                    font-size: 0.65rem;
                    font-weight: 600;
                    padding: 2px 7px;
                    border-radius: 4px;
                    letter-spacing: 0.02em;
                    white-space: nowrap;
                }

                .rs-cmd-kpi--cobalt,
                .rs-cmd-kpi--terracotta {
                    background: rgba(200, 90, 50, 0.15);
                    color: #E07A5F;
                    border: 1px solid rgba(200, 90, 50, 0.35);
                }

                .rs-cmd-kpi--emerald {
                    background: rgba(34, 197, 94, 0.12);
                    color: #4ADE80;
                    border: 1px solid rgba(34, 197, 94, 0.25);
                }

                .rs-cmd-kpi--slate {
                    background: rgba(255, 255, 255, 0.05);
                    color: #A8A29E;
                    border: 1px solid rgba(255, 255, 255, 0.09);
                }

                .rs-cmd-item__badge {
                    font-family: var(--font-mono);
                    font-size: 0.64rem;
                    font-weight: 500;
                    padding: 2px 7px;
                    border-radius: 4px;
                    background: rgba(255, 255, 255, 0.05);
                    color: #78716C;
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    white-space: nowrap;
                }

                .rs-cmd-item__return {
                    font-family: var(--font-mono);
                    font-size: 0.72rem;
                    font-weight: 700;
                    color: var(--accent, #C85A32);
                    opacity: 0;
                    transform: translateX(-3px);
                    transition: all 120ms ease;
                }

                .rs-cmd-item.is-selected .rs-cmd-item__return,
                .rs-cmd-item:hover .rs-cmd-item__return {
                    opacity: 1;
                    transform: translateX(0);
                }

                /* Footer */
                .rs-cmd-footer {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                    padding: 8px 16px;
                    border-top: 1px solid rgba(255, 255, 255, 0.06);
                    background: rgba(255, 255, 255, 0.02);
                    font-size: 0.68rem;
                    color: #78716C;
                    font-family: var(--font-sans);
                    user-select: none;
                }

                .rs-cmd-footer__brand {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    color: #A8A29E;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .rs-cmd-footer__shortcuts {
                    display: inline-flex;
                    align-items: center;
                    gap: 10px;
                    flex-shrink: 0;
                }

                .rs-cmd-key {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    min-width: 18px;
                    padding: 1px 5px;
                    border-radius: 4px;
                    background: rgba(255, 255, 255, 0.06);
                    color: #A8A29E;
                    border: 1px solid rgba(255, 255, 255, 0.12);
                    font-size: 0.62rem;
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
                    .rs-cmd-telemetry {
                        padding: 7px 12px 6px;
                    }
                    .rs-cmd-sys-meta,
                    .rs-cmd-node-count,
                    .rs-cmd-footer__brand {
                        display: none;
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
                    <div class="rs-cmd-telemetry">
                        <div class="rs-cmd-telemetry__left">
                            <span class="rs-cmd-sys-tag">Command Palette</span>
                            <span class="rs-cmd-sys-divider" aria-hidden="true">·</span>
                            <span class="rs-cmd-sys-meta" id="rsCmdTelemetryCoord">Navigation &amp; Actions</span>
                        </div>
                    </div>

                    <div class="rs-cmd-search">
                        <span class="rs-cmd-prompt-glyph" aria-hidden="true">❯</span>
                        <input
                            type="text"
                            class="rs-cmd-input"
                            id="rsCmdInput"
                            role="combobox"
                            aria-expanded="false"
                            aria-autocomplete="list"
                            aria-controls="rsCmdResults"
                            aria-label="Search case studies, pages, or execute commands"
                            placeholder="Search case studies, pages, or ask portfolio AI..."
                            autocomplete="off"
                            spellcheck="false"
                        />
                        <span class="rs-cmd-node-count" id="rsCmdNodeCount">11 ITEMS</span>
                        <kbd class="rs-cmd-esc" id="rsCmdEscBtn" title="Close (Esc)">esc</kbd>
                    </div>

                    <div class="rs-cmd-results" id="rsCmdResults" role="listbox"></div>

                    <div class="rs-cmd-footer">
                        <div class="rs-cmd-footer__brand">
                            <span id="rsCmdFooterTarget">Ryan Schmidt · Product Design Portfolio</span>
                        </div>
                        <div class="rs-cmd-footer__shortcuts">
                            <span><kbd class="rs-cmd-key">↑↓</kbd>navigate</span>
                            <span><kbd class="rs-cmd-key">↵</kbd>open</span>
                            <span><kbd class="rs-cmd-key">esc</kbd>close</span>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(this.overlay);

            this.modalEl = this.overlay.querySelector('#rsCmdModal');
            this.inputEl = this.overlay.querySelector('#rsCmdInput');
            this.resultsEl = this.overlay.querySelector('#rsCmdResults');
            this.nodeCountEl = this.overlay.querySelector('#rsCmdNodeCount');
            this.footerTargetEl = this.overlay.querySelector('#rsCmdFooterTarget');
            this.coordEl = this.overlay.querySelector('#rsCmdTelemetryCoord');
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
                    title: 'Custom Dashboards & AI Summaries (D-Tools Cloud)',
                    sub: '+71% Sustained Views · 62% Multi-dashboard adoption',
                    badge: 'Case Study',
                    kpi: '+71% Views',
                    kpiType: 'terracotta',
                    targetPath: 'pages/dashboard.html',
                    keywords: 'dashboard bi analytics d-tools cloud opportunity signals custom dashboards ai summaries kpi pipeline b2b data visualization metrics revenue 71% sustained views',
                    action: () => { window.location.href = `${prefix}dashboard.html`; }
                },
                {
                    id: 'nav-inventory',
                    group: 'Case Studies',
                    icon: '02',
                    title: 'Inventory, Purchasing & Receiving (D-Tools Cloud)',
                    sub: '+8% Recurring Revenue · 8% YoY adoption growth',
                    badge: 'Case Study',
                    kpi: '+8% MRR',
                    kpiType: 'emerald',
                    targetPath: 'pages/inventory.html',
                    keywords: 'inventory purchasing po receiving ledger stepper d-tools supply chain warehouse enterprise 8% mrr recurring revenue',
                    action: () => { window.location.href = `${prefix}inventory.html`; }
                },
                {
                    id: 'nav-member-portal',
                    group: 'Case Studies',
                    icon: '03',
                    title: 'i4cp Member Portal & Research Discovery',
                    sub: '+500% Ahri Sessions · Research IA & conversational AI discovery',
                    badge: 'Case Study',
                    kpi: '+500% Sessions',
                    kpiType: 'terracotta',
                    targetPath: 'pages/member-portal-overhaul.html',
                    keywords: 'i4cp member portal ai search synthesis rag overhaul enterprise research membership 500% sessions daily activity',
                    action: () => { window.location.href = `${prefix}member-portal-overhaul.html`; }
                },
                {
                    id: 'nav-ai-portfolio',
                    group: 'Case Studies',
                    icon: '04',
                    title: 'Designing & Building an AI-Native Portfolio',
                    sub: 'Zero-Build Stack · Vector Grounding · Design Token System',
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
                    title: 'Selected Work & Shipped Outcomes',
                    sub: '4 featured case studies across BI, supply chain, and enterprise AI',
                    badge: 'Index',
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
                    id: 'nav-approach',
                    group: 'Navigation',
                    icon: '◇',
                    title: 'Design Philosophy & Principles',
                    sub: 'Systemizer instinct, designing in code, and verifiable business outcomes',
                    badge: 'Philosophy',
                    targetPath: 'index.html#approach',
                    keywords: 'approach philosophy principles systemizer designing in code verifiable outcomes craft builder',
                    action: () => {
                        this.close();
                        const target = document.getElementById('approach');
                        if (target) {
                            target.scrollIntoView({ behavior: 'smooth' });
                        } else {
                            window.location.href = `${homeHref}#approach`;
                        }
                    }
                },
                {
                    id: 'nav-about',
                    group: 'Navigation',
                    icon: 'RS',
                    title: 'About Ryan Schmidt: Leadership & Background',
                    sub: '6+ years in B2B SaaS, Design Systems, and mentoring 1,500+ designers',
                    badge: 'About Page',
                    targetPath: 'pages/about.html',
                    keywords: 'about bio leadership experience career history philosophy background ryan schmidt mentor designlab 6+ years',
                    action: () => { window.location.href = `${prefix}about.html`; }
                },
                {
                    id: 'nav-home',
                    group: 'Navigation',
                    icon: '⌂',
                    title: 'Home: Editorial Index',
                    sub: 'Return to primary portfolio editorial hero and index',
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
                    group: 'Direct Links',
                    icon: '↓',
                    title: 'View Resume Dossier (PDF)',
                    sub: 'Open ryan-schmidt-resume.pdf in a new tab',
                    badge: 'PDF ↗',
                    targetPath: 'assets/ryan-schmidt-resume.pdf',
                    keywords: 'resume cv pdf download hire background experience skills ryan schmidt',
                    action: () => {
                        window.open(resumePath, '_blank', 'noopener');
                        this.close();
                    }
                },
                {
                    id: 'act-email',
                    group: 'Direct Links',
                    icon: '@',
                    title: 'Email Ryan Schmidt',
                    sub: 'ryanschmidt1989@gmail.com (opens default email client)',
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
                    group: 'Direct Links',
                    icon: '↗',
                    title: 'Connect on LinkedIn',
                    sub: 'linkedin.com/in/ryanschmidt1989 (message or network directly)',
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

            if (this.sfxBtn) {
                this.sfxBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const isOn = audioFX.toggle();
                    this.sfxBtn.classList.toggle('is-active', isOn);
                    this.sfxBtn.setAttribute('aria-pressed', isOn ? 'true' : 'false');
                    this.sfxBtn.innerHTML = `<span class="rs-cmd-btn-text">[SFX: ${isOn ? 'ON' : 'OFF'}]</span>`;
                    this.inputEl.focus();
                });
            }

            // Track pointer for modal ambient glow and HUD canvas parallax
            this.overlay.addEventListener('pointermove', (e) => {
                if (!this.isOpen) return;
                this.pointerX = e.clientX / Math.max(1, window.innerWidth);
                this.pointerY = e.clientY / Math.max(1, window.innerHeight);
                if (this.modalEl) {
                    const rect = this.modalEl.getBoundingClientRect();
                    const mx = e.clientX - rect.left;
                    const my = e.clientY - rect.top;
                    this.modalEl.style.setProperty('--modal-mx', `${mx.toFixed(0)}px`);
                    this.modalEl.style.setProperty('--modal-my', `${my.toFixed(0)}px`);
                }
                if (this.coordEl) {
                    this.coordEl.textContent = 'Navigation & Actions';
                }
            });

            // Search input live filtering
            this.inputEl.addEventListener('input', () => {
                this.hudPulse = 1;
                audioFX.playKey();
                this.renderList(this.inputEl.value);
            });

            // Keyboard navigation inside input
            this.inputEl.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    this.hudPulse = 0.65;
                    audioFX.playTick();
                    this.moveSelection(1);
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    this.hudPulse = 0.65;
                    audioFX.playTick();
                    this.moveSelection(-1);
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    audioFX.playExec();
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

            if (this.nodeCountEl) {
                const count = this.filteredItems.length;
                this.nodeCountEl.textContent = `${count} ${count === 1 ? 'ITEM' : 'ITEMS'}`;
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
                        ${item.kpi ? `<span class="rs-cmd-item__kpi rs-cmd-kpi--${this.escapeHtml(item.kpiType)}">${this.escapeHtml(item.kpi)}</span>` : ''}
                        <span class="rs-cmd-item__badge">${this.escapeHtml(item.badge)}</span>
                        <span class="rs-cmd-item__return" aria-hidden="true">↵</span>
                    </div>
                `;

                row.addEventListener('click', () => {
                    audioFX.playExec();
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

            const activeItem = this.filteredItems[this.activeIndex];
            if (this.footerTargetEl && activeItem) {
                this.footerTargetEl.textContent = activeItem.targetPath || 'RYAN_SCHMIDT · PRINCIPAL_PORTFOLIO';
            }
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
            if (typeof window.rsHomeStageAsk === 'function' && document.body.classList.contains('is-home')) {
                window.rsHomeStageAsk(query);
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
            if (this.themeLabelEl) {
                this.themeLabelEl.textContent = `[PHOSPHOR: ${theme.name}]`;
            }
        }

        toggleInspector() {
            this.open();
        }

        open(initialQuery = '') {
            this.lastFocusedEl = document.activeElement;
            this.isOpen = true;
            this.hudPulse = 1;
            this.overlay.classList.add('is-open');
            this.inputEl.setAttribute('aria-expanded', 'true');
            const q = String(initialQuery || '');
            this.inputEl.value = q;
            this.renderList(q);
            audioFX.playBoot();
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
            audioFX.playClose();
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

    function initObsidianDock() {
        const shells = document.querySelectorAll('.home-omnibar-shell, .subpage-omnibar-shell');
        shells.forEach((shell) => {
            // Remove legacy sci-fi elements
            shell.querySelectorAll('.rs-dock-reticle, .rs-dock-telemetry, .rs-dock-prompt-tag').forEach((el) => el.remove());

            // Track pointer over shell for dynamic vitreous specular radial highlight
            shell.addEventListener('pointermove', (e) => {
                const rect = shell.getBoundingClientRect();
                shell.style.setProperty('--mouse-x', `${(e.clientX - rect.left).toFixed(0)}px`);
                shell.style.setProperty('--mouse-y', `${(e.clientY - rect.top).toFixed(0)}px`);
            });
        });
    }

    function initSubpagePlaceholder() {
        const miniInput = document.getElementById('ai-mini-input');
        if (miniInput) {
            miniInput.placeholder = window.innerWidth <= 600
                ? 'Ask AI about Ryan’s work...'
                : 'Ask AI, execute /command, or press ⌘K...';
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.rsCommandPalette = new AtelierCommandPalette();
            initObsidianDock();
            initSubpagePlaceholder();
        });
    } else {
        window.rsCommandPalette = new AtelierCommandPalette();
        initObsidianDock();
        initSubpagePlaceholder();
    }
    window.addEventListener('resize', initSubpagePlaceholder);
})();

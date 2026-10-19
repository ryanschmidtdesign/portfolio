// Swiss/Atelier Command Palette & UX Engineer Inspector (⌘K)
// Replaces the legacy CRT terminal with a high-craft command palette,
// live DOM/Token X-Ray Inspector, live token tension switcher, and CLI drawer.
(() => {
    if (window.__rsCommandPaletteInitialized) return;
    window.__rsCommandPaletteInitialized = true;

    const ACCENT_THEMES = [
        {
            id: 'cobalt',
            name: 'Electric Cobalt (Default)',
            hex: '#0033FF',
            rgb: '0 51 255',
            hover: '#0026CC',
            soft: 'rgba(0, 51, 255, 0.08)'
        },
        {
            id: 'spark',
            name: 'Atelier Spark (Warm Signal)',
            hex: '#FF3366',
            rgb: '255 51 102',
            hover: '#E01E50',
            soft: 'rgba(255, 51, 102, 0.09)'
        },
        {
            id: 'emerald',
            name: 'Precision Emerald (Systems)',
            hex: '#059669',
            rgb: '5 150 105',
            hover: '#047857',
            soft: 'rgba(5, 150, 105, 0.09)'
        }
    ];

    class AtelierCommandPalette {
        constructor() {
            this.isOpen = false;
            this.activeIndex = 0;
            this.filteredItems = [];
            this.inspectorActive = false;
            this.themeIndex = 0;
            this.outputVisible = false;

            this.injectStyles();
            this.ensureDockTrigger();
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
                    z-index: 99999;
                    background: rgba(15, 23, 42, 0.36);
                    backdrop-filter: blur(10px) saturate(140%);
                    -webkit-backdrop-filter: blur(10px) saturate(140%);
                    display: flex;
                    align-items: flex-start;
                    justify-content: center;
                    padding: min(11vh, 96px) 16px 24px;
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity 0.22s cubic-bezier(0.16, 1, 0.3, 1);
                    font-family: var(--font-sans, 'Plus Jakarta Sans', -apple-system, sans-serif);
                }

                .rs-cmd-overlay.is-open {
                    opacity: 1;
                    pointer-events: auto;
                }

                .rs-cmd-modal {
                    width: 100%;
                    max-width: 660px;
                    background: rgba(255, 255, 255, 0.94);
                    backdrop-filter: blur(24px) saturate(180%);
                    -webkit-backdrop-filter: blur(24px) saturate(180%);
                    border: 1px solid rgba(15, 23, 42, 0.12);
                    border-radius: 20px;
                    box-shadow:
                        0 32px 72px -16px rgba(15, 23, 42, 0.26),
                        0 12px 28px -8px rgba(15, 23, 42, 0.1),
                        0 0 0 1px rgba(255, 255, 255, 0.85) inset;
                    overflow: hidden;
                    transform: translateY(14px) scale(0.975);
                    transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
                    display: flex;
                    flex-direction: column;
                    max-height: min(640px, 82vh);
                    color: #111111;
                }

                .rs-cmd-overlay.is-open .rs-cmd-modal {
                    transform: translateY(0) scale(1);
                }

                /* Top Telemetry Bar */
                .rs-cmd-telemetry {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                    padding: 10px 18px;
                    background: rgba(245, 245, 245, 0.85);
                    border-bottom: 1px solid rgba(15, 23, 42, 0.07);
                    font-family: var(--font-mono, 'JetBrains Mono', monospace);
                    font-size: 11px;
                    color: #555555;
                    letter-spacing: 0.02em;
                }

                .rs-cmd-telemetry__left {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    min-width: 0;
                }

                .rs-cmd-status-dot {
                    width: 7px;
                    height: 7px;
                    border-radius: 50%;
                    background: var(--accent, #0033FF);
                    box-shadow: 0 0 0 3px var(--accent-soft, rgba(0, 51, 255, 0.14));
                    flex-shrink: 0;
                }

                .rs-cmd-telemetry__badges {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    flex-shrink: 0;
                }

                .rs-cmd-pill {
                    padding: 2px 7px;
                    border-radius: 999px;
                    background: rgba(15, 23, 42, 0.05);
                    border: 1px solid rgba(15, 23, 42, 0.08);
                    color: #333333;
                    font-size: 10.5px;
                    white-space: nowrap;
                }

                /* Search Input Row */
                .rs-cmd-search {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 14px 18px;
                    border-bottom: 1px solid rgba(15, 23, 42, 0.08);
                    background: #FFFFFF;
                }

                .rs-cmd-search__prompt {
                    font-family: var(--font-mono, 'JetBrains Mono', monospace);
                    font-size: 13px;
                    font-weight: 700;
                    color: var(--accent, #0033FF);
                    background: var(--accent-soft, rgba(0, 51, 255, 0.08));
                    padding: 4px 8px;
                    border-radius: 6px;
                    user-select: none;
                    flex-shrink: 0;
                }

                .rs-cmd-input {
                    flex: 1;
                    border: none !important;
                    outline: none !important;
                    box-shadow: none !important;
                    background: transparent !important;
                    font-family: var(--font-sans, 'Plus Jakarta Sans', -apple-system, sans-serif);
                    font-size: 15.5px;
                    font-weight: 500;
                    color: #111111;
                    padding: 0;
                }

                .rs-cmd-input::placeholder {
                    color: #888888;
                    font-weight: 400;
                }

                .rs-cmd-esc {
                    font-family: var(--font-mono, 'JetBrains Mono', monospace);
                    font-size: 10.5px;
                    font-weight: 600;
                    padding: 4px 7px;
                    border-radius: 6px;
                    background: #F5F5F5;
                    border: 1px solid rgba(15, 23, 42, 0.12);
                    color: #666666;
                    cursor: pointer;
                    transition: all 0.15s ease;
                }

                .rs-cmd-esc:hover {
                    background: #EBEBEB;
                    color: #111111;
                }

                /* CLI Output Card Area (when running terminal commands) */
                .rs-cmd-output {
                    display: none;
                    padding: 14px 18px;
                    background: #FAFAFA;
                    border-bottom: 1px solid rgba(15, 23, 42, 0.08);
                    font-family: var(--font-mono, 'JetBrains Mono', monospace);
                    font-size: 12px;
                    line-height: 1.6;
                    color: #222222;
                    max-height: 210px;
                    overflow-y: auto;
                }

                .rs-cmd-output.is-visible {
                    display: block;
                }

                .rs-cmd-output__header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 8px;
                    font-size: 10.5px;
                    text-transform: uppercase;
                    letter-spacing: 0.08em;
                    color: var(--accent, #0033FF);
                    font-weight: 700;
                }

                .rs-cmd-output__close {
                    background: none;
                    border: none;
                    color: #666666;
                    font-family: inherit;
                    font-size: 11px;
                    cursor: pointer;
                    padding: 2px 6px;
                    border-radius: 4px;
                }

                .rs-cmd-output__close:hover {
                    background: rgba(15, 23, 42, 0.06);
                    color: #111111;
                }

                .rs-cmd-output__grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(175px, 1fr));
                    gap: 8px;
                    margin-top: 6px;
                }

                .rs-cmd-output__card {
                    padding: 8px 10px;
                    background: #FFFFFF;
                    border: 1px solid rgba(15, 23, 42, 0.08);
                    border-radius: 8px;
                }

                .rs-cmd-output__card-label {
                    font-size: 10px;
                    color: #777777;
                    text-transform: uppercase;
                    letter-spacing: 0.06em;
                }

                .rs-cmd-output__card-val {
                    font-size: 12.5px;
                    font-weight: 600;
                    color: #111111;
                    margin-top: 2px;
                }

                /* Command List */
                .rs-cmd-list {
                    flex: 1;
                    overflow-y: auto;
                    padding: 10px;
                    scroll-behavior: smooth;
                }

                .rs-cmd-group-label {
                    padding: 8px 10px 5px;
                    font-family: var(--font-mono, 'JetBrains Mono', monospace);
                    font-size: 10.5px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.08em;
                    color: #777777;
                }

                .rs-cmd-item {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                    padding: 10px 12px;
                    border-radius: 11px;
                    cursor: pointer;
                    transition: background 0.14s ease, transform 0.14s ease;
                    user-select: none;
                }

                .rs-cmd-item.is-active,
                .rs-cmd-item:hover {
                    background: var(--accent-soft, rgba(0, 51, 255, 0.075));
                }

                .rs-cmd-item__left {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    min-width: 0;
                }

                .rs-cmd-item__icon {
                    width: 32px;
                    height: 32px;
                    border-radius: 8px;
                    background: #F5F5F5;
                    border: 1px solid rgba(15, 23, 42, 0.08);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-family: var(--font-mono, 'JetBrains Mono', monospace);
                    font-size: 12px;
                    font-weight: 700;
                    color: #444444;
                    flex-shrink: 0;
                    transition: all 0.15s ease;
                }

                .rs-cmd-item.is-active .rs-cmd-item__icon,
                .rs-cmd-item:hover .rs-cmd-item__icon {
                    background: var(--accent, #0033FF);
                    border-color: var(--accent, #0033FF);
                    color: #FFFFFF;
                    transform: scale(1.04);
                }

                .rs-cmd-item__text {
                    display: flex;
                    flex-direction: column;
                    min-width: 0;
                }

                .rs-cmd-item__title {
                    font-size: 14px;
                    font-weight: 600;
                    color: #111111;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .rs-cmd-item__sub {
                    font-size: 12px;
                    color: #666666;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .rs-cmd-item__right {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    flex-shrink: 0;
                }

                .rs-cmd-item__badge {
                    font-family: var(--font-mono, 'JetBrains Mono', monospace);
                    font-size: 10.5px;
                    font-weight: 600;
                    padding: 3px 8px;
                    border-radius: 6px;
                    background: rgba(15, 23, 42, 0.05);
                    color: #555555;
                }

                .rs-cmd-item.is-active .rs-cmd-item__badge,
                .rs-cmd-item:hover .rs-cmd-item__badge {
                    background: rgba(0, 51, 255, 0.12);
                    color: var(--accent, #0033FF);
                }

                /* Footer Hints */
                .rs-cmd-footer {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                    padding: 10px 18px;
                    background: #F7F7F8;
                    border-top: 1px solid rgba(15, 23, 42, 0.08);
                    font-family: var(--font-mono, 'JetBrains Mono', monospace);
                    font-size: 11px;
                    color: #666666;
                }

                .rs-cmd-footer__keys {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .rs-cmd-footer kbd {
                    background: #FFFFFF;
                    border: 1px solid rgba(15, 23, 42, 0.14);
                    border-radius: 4px;
                    padding: 1px 5px;
                    font-size: 10px;
                    color: #222222;
                    box-shadow: 0 1px 0 rgba(15, 23, 42, 0.08);
                }

                /* Live DOM & Token X-Ray Inspector Overlay */
                .rs-xray-box {
                    position: fixed;
                    pointer-events: none;
                    z-index: 99997;
                    border: 1.5px solid var(--accent, #0033FF);
                    background: rgba(0, 51, 255, 0.05);
                    border-radius: 4px;
                    transition: all 0.06s cubic-bezier(0.16, 1, 0.3, 1);
                    display: none;
                }

                .rs-xray-hud {
                    position: fixed;
                    pointer-events: none;
                    z-index: 99998;
                    background: rgba(17, 17, 17, 0.94);
                    backdrop-filter: blur(12px);
                    color: #FFFFFF;
                    padding: 10px 12px;
                    border-radius: 10px;
                    border: 1px solid rgba(255, 255, 255, 0.14);
                    font-family: var(--font-mono, 'JetBrains Mono', monospace);
                    font-size: 11px;
                    line-height: 1.5;
                    box-shadow: 0 16px 36px rgba(0, 0, 0, 0.28);
                    max-width: 310px;
                    display: none;
                }

                .rs-xray-hud__tag {
                    color: #60A5FA;
                    font-weight: 700;
                    margin-bottom: 4px;
                    word-break: break-all;
                }

                .rs-xray-hud__row {
                    display: flex;
                    justify-content: space-between;
                    gap: 12px;
                    color: rgba(255, 255, 255, 0.72);
                }

                .rs-xray-hud__row span:last-child {
                    color: #FFFFFF;
                    font-weight: 600;
                }

                .rs-xray-pill {
                    position: fixed;
                    bottom: 24px;
                    left: 24px;
                    z-index: 99998;
                    display: none;
                    align-items: center;
                    gap: 10px;
                    padding: 9px 14px;
                    border-radius: 999px;
                    background: #111111;
                    color: #FFFFFF;
                    font-family: var(--font-mono, 'JetBrains Mono', monospace);
                    font-size: 11.5px;
                    font-weight: 600;
                    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.25);
                    border: 1px solid rgba(255, 255, 255, 0.15);
                    cursor: pointer;
                }

                .rs-xray-pill.is-active {
                    display: inline-flex;
                }

                .rs-xray-pill__dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: #10B981;
                    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.25);
                }

                @media (max-width: 640px) {
                    .rs-cmd-telemetry__badges {
                        display: none;
                    }
                    .rs-cmd-footer__cli-hint {
                        display: none;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        ensureDockTrigger() {
            const container = document.querySelector('.ai-mini-input-container');
            if (!container) return;
            if (!container.querySelector('[data-cmdk-trigger]')) {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'ai-mini-cmdk';
                btn.setAttribute('data-cmdk-trigger', '');
                btn.setAttribute('aria-label', 'Open Command Palette (Command + K)');
                btn.title = 'Open Command Palette & Inspector (⌘K)';
                btn.innerHTML = `<kbd class="ai-mini-cmdk__kbd">⌘K</kbd>`;
                const sendBtn = container.querySelector('#ai-mini-send');
                if (sendBtn) {
                    container.insertBefore(btn, sendBtn);
                } else {
                    container.appendChild(btn);
                }
            }
        }

        getCommands() {
            const path = window.location.pathname || '/';
            const inPagesDir = path.includes('/pages/');
            const prefix = inPagesDir ? '' : 'pages/';
            const homeHref = inPagesDir ? '../index.html' : 'index.html';

            return [
                // 1. Live UX Engineer Tools
                {
                    id: 'tool-xray',
                    group: 'UX Engineer Live Tools',
                    icon: '⌖',
                    title: this.inspectorActive ? 'Disable Live Token & Grid X-Ray Inspector' : 'Toggle Live Token & Grid X-Ray Inspector',
                    sub: 'Hover any element on the page to inspect live typography, spacing, and design tokens',
                    badge: 'LIVE HUD',
                    keywords: 'xray inspect tokens grid dom css spec measure debug',
                    action: () => {
                        this.close();
                        this.toggleInspector();
                    }
                },
                {
                    id: 'tool-tokens',
                    group: 'UX Engineer Live Tools',
                    icon: '◈',
                    title: 'Cycle Live Accent Token Tension',
                    sub: `Switch active --accent token (${ACCENT_THEMES[this.themeIndex].name}) across all components`,
                    badge: 'TOKENS',
                    keywords: 'theme color accent cobalt spark emerald tokens css variables',
                    action: () => {
                        this.cycleTheme();
                    }
                },
                {
                    id: 'tool-telemetry',
                    group: 'UX Engineer Live Tools',
                    icon: '⚡',
                    title: 'Run Page Architecture & Token Telemetry (`perf`)',
                    sub: 'Inspect live DOM complexity, zero-build bundle footprint, and active design system tokens',
                    badge: 'CLI: perf',
                    keywords: 'perf performance telemetry architecture bundle speed metrics',
                    action: () => {
                        this.runCLICommand('perf');
                    }
                },
                {
                    id: 'tool-skills',
                    group: 'UX Engineer Live Tools',
                    icon: '⌘',
                    title: 'Inspect Technical & Design Systems Stack (`skills`)',
                    sub: 'View core competencies across Design Systems, AI/RAG Prototyping, and Enterprise UX',
                    badge: 'CLI: skills',
                    keywords: 'skills stack code react figma tokens ai rag ux',
                    action: () => {
                        this.runCLICommand('skills');
                    }
                },

                // 2. Case Studies & Interactive Demos
                {
                    id: 'nav-dashboard',
                    group: 'Case Studies & Interactive Prototypes',
                    icon: '01',
                    title: 'BI Analytics & Opportunity Signals — D-Tools Cloud',
                    sub: '+71% Beta Engagement · Interactive Before/After Splitter & Executive KPI System',
                    badge: 'Case Study',
                    keywords: 'dashboard bi analytics d-tools opportunity signals kpi',
                    action: () => { window.location.href = `${prefix}dashboard.html`; }
                },
                {
                    id: 'nav-inventory',
                    group: 'Case Studies & Interactive Prototypes',
                    icon: '02',
                    title: 'Inventory, Purchasing & Receiving — D-Tools Cloud',
                    sub: '+18% Recurring Revenue · Interactive Quantity Stepper & Auditable Ledger Flow',
                    badge: 'Case Study',
                    keywords: 'inventory purchasing po receiving ledger stepper d-tools',
                    action: () => { window.location.href = `${prefix}inventory.html`; }
                },
                {
                    id: 'nav-member-portal',
                    group: 'Case Studies & Interactive Prototypes',
                    icon: '03',
                    title: 'AI Search & Member Portal Overhaul — i4cp',
                    sub: '+500% AI Activation · Interactive Keyword Filter & Conversational Synthesis',
                    badge: 'Case Study',
                    keywords: 'i4cp member portal ai search synthesis rag overhaul',
                    action: () => { window.location.href = `${prefix}member-portal-overhaul.html`; }
                },
                {
                    id: 'nav-ai-portfolio',
                    group: 'Case Studies & Interactive Prototypes',
                    icon: '04',
                    title: 'Designing & Building an AI-Native Portfolio',
                    sub: 'Token Architecture · Gemini 2.5 Flash RAG · Zero-Build Vanilla Stack',
                    badge: 'Architecture',
                    keywords: 'portfolio ai rag gemini architecture tokens case study',
                    action: () => { window.location.href = `${prefix}ai-coding-portfolio.html`; }
                },
                {
                    id: 'nav-about',
                    group: 'Case Studies & Interactive Prototypes',
                    icon: 'RS',
                    title: 'About Ryan Schmidt — Leadership & Experience',
                    sub: '15+ years leading B2B SaaS, Design Systems, and AI-accelerated product teams',
                    badge: 'Profile',
                    keywords: 'about bio leadership experience career history',
                    action: () => { window.location.href = `${prefix}about.html`; }
                },
                {
                    id: 'nav-home',
                    group: 'Case Studies & Interactive Prototypes',
                    icon: '⌂',
                    title: 'Home — Editorial Index',
                    sub: 'Return to the interactive kinetic index',
                    badge: 'Index',
                    keywords: 'home index start main',
                    action: () => { window.location.href = homeHref; }
                },

                // 3. Ask Portfolio AI
                {
                    id: 'ai-projects',
                    group: 'Ask Portfolio AI (Gemini RAG)',
                    icon: '✦',
                    title: 'Ask AI: "What are his strongest projects and measurable outcomes?"',
                    sub: 'Opens the AI Drawer with synthesized evidence across D-Tools and i4cp',
                    badge: 'Ask AI',
                    keywords: 'ask ai strongest projects outcomes impact metrics',
                    action: () => {
                        this.close();
                        this.triggerAIChat('What are his strongest projects?');
                    }
                },
                {
                    id: 'ai-leadership',
                    group: 'Ask Portfolio AI (Gemini RAG)',
                    icon: '✦',
                    title: 'Ask AI: "What is his leadership style and how does he use AI?"',
                    sub: 'Explores player-coach leadership, design systems governance, and AI prototyping',
                    badge: 'Ask AI',
                    keywords: 'ask ai leadership style management workflow',
                    action: () => {
                        this.close();
                        this.triggerAIChat('What is his leadership style?');
                    }
                },

                // 4. Direct Actions
                {
                    id: 'act-resume',
                    group: 'Direct Actions',
                    icon: '↓',
                    title: 'View Resume (PDF)',
                    sub: 'Open Ryan_Schmidt_Resume.pdf in a new tab',
                    badge: 'PDF',
                    keywords: 'resume cv pdf download hire',
                    action: () => {
                        const resumePath = inPagesDir ? '../assets/Ryan_Schmidt_Resume.pdf' : 'assets/Ryan_Schmidt_Resume.pdf';
                        window.open(resumePath, '_blank', 'noopener');
                        this.close();
                    }
                },
                {
                    id: 'act-email',
                    group: 'Direct Actions',
                    icon: '✉',
                    title: 'Copy Email Address (ryanschmidt@me.com)',
                    sub: 'Copy directly to clipboard for quick outreach',
                    badge: 'Copy',
                    keywords: 'email contact copy hire reach out',
                    action: () => {
                        if (navigator.clipboard) {
                            navigator.clipboard.writeText('ryanschmidt@me.com');
                        }
                        this.showOutputCard('Clipboard Updated', `
                            <div class="rs-cmd-output__grid">
                                <div class="rs-cmd-output__card">
                                    <div class="rs-cmd-output__card-label">Copied to Clipboard</div>
                                    <div class="rs-cmd-output__card-val">ryanschmidt@me.com</div>
                                </div>
                                <div class="rs-cmd-output__card">
                                    <div class="rs-cmd-output__card-label">LinkedIn</div>
                                    <div class="rs-cmd-output__card-val">linkedin.com/in/ryanschmidtdesign</div>
                                </div>
                            </div>
                        `);
                    }
                }
            ];
        }

        buildDOM() {
            this.overlay = document.createElement('div');
            this.overlay.className = 'rs-cmd-overlay';
            this.overlay.setAttribute('role', 'dialog');
            this.overlay.setAttribute('aria-modal', 'true');
            this.overlay.setAttribute('aria-label', 'Atelier Command Palette and CLI');

            const domNodes = document.querySelectorAll('*').length;
            const pageName = (window.location.pathname.split('/').pop() || 'index.html').replace('.html', '') || 'index';

            this.overlay.innerHTML = `
                <div class="rs-cmd-modal">
                    <div class="rs-cmd-telemetry">
                        <div class="rs-cmd-telemetry__left">
                            <span class="rs-cmd-status-dot"></span>
                            <span>ATELIER INSPECTOR &amp; CLI</span>
                            <span style="opacity:0.4">/</span>
                            <span id="rsCmdRouteLabel">${pageName}</span>
                        </div>
                        <div class="rs-cmd-telemetry__badges">
                            <span class="rs-cmd-pill" id="rsCmdThemePill">Token: #0033FF</span>
                            <span class="rs-cmd-pill">${domNodes} DOM nodes</span>
                            <span class="rs-cmd-pill">Zero-Build Stack</span>
                        </div>
                    </div>
                    <div class="rs-cmd-search">
                        <span class="rs-cmd-search__prompt">&gt;_</span>
                        <input
                            type="text"
                            class="rs-cmd-input"
                            id="rsCmdInput"
                            placeholder="Search case studies, toggle X-Ray inspector, or type a CLI command (ls, skills, perf, whoami)..."
                            autocomplete="off"
                            spellcheck="false"
                        />
                        <button type="button" class="rs-cmd-esc" id="rsCmdEsc">ESC</button>
                    </div>
                    <div class="rs-cmd-output" id="rsCmdOutput">
                        <div class="rs-cmd-output__header">
                            <span id="rsCmdOutputTitle">CLI Telemetry Output</span>
                            <button type="button" class="rs-cmd-output__close" id="rsCmdOutputClose">Clear [×]</button>
                        </div>
                        <div id="rsCmdOutputBody"></div>
                    </div>
                    <div class="rs-cmd-list" id="rsCmdList" role="listbox"></div>
                    <div class="rs-cmd-footer">
                        <div class="rs-cmd-footer__keys">
                            <span><kbd>↑</kbd><kbd>↓</kbd> Navigate</span>
                            <span><kbd>↵</kbd> Execute</span>
                            <span><kbd>ESC</kbd> Close</span>
                        </div>
                        <div class="rs-cmd-footer__cli-hint">CLI: <code>ls</code> · <code>skills</code> · <code>perf</code> · <code>tokens</code> · <code>sudo hire ryan</code></div>
                    </div>
                </div>
            `;

            document.body.appendChild(this.overlay);

            // Live X-Ray Inspector Overlay elements
            this.xrayBox = document.createElement('div');
            this.xrayBox.className = 'rs-xray-box';
            this.xrayHud = document.createElement('div');
            this.xrayHud.className = 'rs-xray-hud';
            this.xrayPill = document.createElement('button');
            this.xrayPill.type = 'button';
            this.xrayPill.className = 'rs-xray-pill';
            this.xrayPill.innerHTML = `<span class="rs-xray-pill__dot"></span><span>X-Ray Inspector Active · Click or press ESC to exit</span>`;

            document.body.appendChild(this.xrayBox);
            document.body.appendChild(this.xrayHud);
            document.body.appendChild(this.xrayPill);

            this.inputEl = this.overlay.querySelector('#rsCmdInput');
            this.listEl = this.overlay.querySelector('#rsCmdList');
            this.outputEl = this.overlay.querySelector('#rsCmdOutput');
            this.outputTitleEl = this.overlay.querySelector('#rsCmdOutputTitle');
            this.outputBodyEl = this.overlay.querySelector('#rsCmdOutputBody');
            this.themePillEl = this.overlay.querySelector('#rsCmdThemePill');

            this.renderList('');
        }

        bindEvents() {
            // Global keyboard shortcut: Cmd+K or Ctrl+K, plus Escape
            document.addEventListener('keydown', (e) => {
                if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                    e.preventDefault();
                    this.toggle();
                    return;
                }
                if (e.key === 'Escape') {
                    if (this.isOpen) {
                        e.preventDefault();
                        this.close();
                    } else if (this.inspectorActive) {
                        e.preventDefault();
                        this.toggleInspector(false);
                    }
                }
            });

            // Trigger buttons in dock or anywhere on page
            document.addEventListener('click', (e) => {
                const trigger = e.target.closest('[data-cmdk-trigger], .ai-mini-cmdk');
                if (trigger) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.open();
                }
            });

            // Backdrop click
            this.overlay.addEventListener('click', (e) => {
                if (e.target === this.overlay) this.close();
            });

            this.overlay.querySelector('#rsCmdEsc').addEventListener('click', () => this.close());
            this.overlay.querySelector('#rsCmdOutputClose').addEventListener('click', () => {
                this.outputEl.classList.remove('is-visible');
            });

            this.xrayPill.addEventListener('click', () => this.toggleInspector(false));

            // Input filtering + keyboard navigation
            this.inputEl.addEventListener('input', () => {
                this.activeIndex = 0;
                this.renderList(this.inputEl.value);
            });

            this.inputEl.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    if (this.filteredItems.length > 0) {
                        this.activeIndex = (this.activeIndex + 1) % this.filteredItems.length;
                        this.updateActiveItem();
                    }
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    if (this.filteredItems.length > 0) {
                        this.activeIndex = (this.activeIndex - 1 + this.filteredItems.length) % this.filteredItems.length;
                        this.updateActiveItem();
                    }
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    const raw = this.inputEl.value.trim();
                    if (this.isDirectCLICommand(raw)) {
                        this.runCLICommand(raw);
                        return;
                    }
                    const selected = this.filteredItems[this.activeIndex];
                    if (selected && typeof selected.action === 'function') {
                        selected.action();
                    } else if (raw) {
                        this.close();
                        this.triggerAIChat(raw);
                    }
                }
            });
        }

        isDirectCLICommand(raw) {
            const cmd = raw.toLowerCase().split(/\s+/)[0];
            return ['ls', 'cat', 'skills', 'perf', 'tokens', 'whoami', 'sudo', 'clear', 'help'].includes(cmd);
        }

        runCLICommand(raw) {
            const parts = raw.trim().toLowerCase().split(/\s+/);
            const cmd = parts[0];

            if (cmd === 'clear') {
                this.outputEl.classList.remove('is-visible');
                this.inputEl.value = '';
                this.renderList('');
                return;
            }

            if (cmd === 'perf') {
                const domCount = document.querySelectorAll('*').length;
                const scriptsCount = document.querySelectorAll('script').length;
                const navTiming = performance.getEntriesByType('navigation')[0];
                const domInteractive = navTiming ? `${Math.round(navTiming.domInteractive)}ms` : '< 45ms';

                this.showOutputCard('CLI // Architecture & Runtime Telemetry', `
                    <div class="rs-cmd-output__grid">
                        <div class="rs-cmd-output__card">
                            <div class="rs-cmd-output__card-label">DOM Interactive</div>
                            <div class="rs-cmd-output__card-val">${domInteractive}</div>
                        </div>
                        <div class="rs-cmd-output__card">
                            <div class="rs-cmd-output__card-label">Live DOM Nodes</div>
                            <div class="rs-cmd-output__card-val">${domCount} elements (${scriptsCount} scripts)</div>
                        </div>
                        <div class="rs-cmd-output__card">
                            <div class="rs-cmd-output__card-label">Build Pipeline</div>
                            <div class="rs-cmd-output__card-val">Zero-Build Vanilla ES6 + CSS Tokens</div>
                        </div>
                    </div>
                `);
                return;
            }

            if (cmd === 'skills') {
                this.showOutputCard('CLI // Core Capabilities Matrix', `
                    <div class="rs-cmd-output__grid">
                        <div class="rs-cmd-output__card">
                            <div class="rs-cmd-output__card-label">Product &amp; Strategy</div>
                            <div class="rs-cmd-output__card-val">0→1 SaaS, BI Analytics, Enterprise Workflows</div>
                        </div>
                        <div class="rs-cmd-output__card">
                            <div class="rs-cmd-output__card-label">Design Systems</div>
                            <div class="rs-cmd-output__card-val">Token Architecture, Figma-to-Code, WCAG AA</div>
                        </div>
                        <div class="rs-cmd-output__card">
                            <div class="rs-cmd-output__card-label">AI Engineering</div>
                            <div class="rs-cmd-output__card-val">Gemini 2.5 RAG, Prompt Architecture, JS/CSS</div>
                        </div>
                    </div>
                `);
                return;
            }

            if (cmd === 'tokens') {
                this.cycleTheme();
                return;
            }

            if (cmd === 'whoami' || cmd === 'sudo') {
                this.showOutputCard('CLI // Candidate Dossier', `
                    <div class="rs-cmd-output__grid">
                        <div class="rs-cmd-output__card">
                            <div class="rs-cmd-output__card-label">Role</div>
                            <div class="rs-cmd-output__card-val">Lead Product Designer &amp; Design Leader</div>
                        </div>
                        <div class="rs-cmd-output__card">
                            <div class="rs-cmd-output__card-label">Signature Impact</div>
                            <div class="rs-cmd-output__card-val">+71% BI Engagement · +500% AI Activation</div>
                        </div>
                        <div class="rs-cmd-output__card">
                            <div class="rs-cmd-output__card-label">Direct Contact</div>
                            <div class="rs-cmd-output__card-val">ryanschmidt@me.com</div>
                        </div>
                    </div>
                `);
                return;
            }

            if (cmd === 'ls' || cmd === 'help' || cmd === 'cat') {
                this.showOutputCard('CLI // Available Commands', `
                    <div>Type any keyword to filter commands below, or execute: <code>perf</code>, <code>skills</code>, <code>tokens</code>, <code>whoami</code>, <code>sudo hire ryan</code>, or <code>clear</code>.</div>
                `);
            }
        }

        showOutputCard(title, html) {
            this.outputTitleEl.textContent = title;
            this.outputBodyEl.innerHTML = html;
            this.outputEl.classList.add('is-visible');
        }

        cycleTheme() {
            this.themeIndex = (this.themeIndex + 1) % ACCENT_THEMES.length;
            const theme = ACCENT_THEMES[this.themeIndex];
            const root = document.documentElement;
            root.style.setProperty('--accent', theme.hex);
            root.style.setProperty('--accent-hover', theme.hover);
            root.style.setProperty('--accent-soft', theme.soft);
            root.style.setProperty('--rgb-cool', theme.rgb);
            root.style.setProperty('--rgb-blue', theme.rgb);

            if (this.themePillEl) {
                this.themePillEl.textContent = `Token: ${theme.hex}`;
            }

            this.showOutputCard('Live Design Token Mutation', `
                <div class="rs-cmd-output__grid">
                    <div class="rs-cmd-output__card">
                        <div class="rs-cmd-output__card-label">Active Preset</div>
                        <div class="rs-cmd-output__card-val">${theme.name}</div>
                    </div>
                    <div class="rs-cmd-output__card">
                        <div class="rs-cmd-output__card-label">--accent / --rgb-cool</div>
                        <div class="rs-cmd-output__card-val">${theme.hex} (${theme.rgb})</div>
                    </div>
                </div>
            `);
            this.renderList(this.inputEl.value);
        }

        toggleInspector(forceState) {
            this.inspectorActive = typeof forceState === 'boolean' ? forceState : !this.inspectorActive;
            this.xrayPill.classList.toggle('is-active', this.inspectorActive);

            if (!this.inspectorActive) {
                this.xrayBox.style.display = 'none';
                this.xrayHud.style.display = 'none';
                if (this._boundInspectMove) {
                    window.removeEventListener('mousemove', this._boundInspectMove, true);
                }
                return;
            }

            this._boundInspectMove = (e) => {
                if (!this.inspectorActive) return;
                const el = document.elementFromPoint(e.clientX, e.clientY);
                if (!el || el.closest('.rs-xray-pill, .rs-cmd-overlay')) {
                    this.xrayBox.style.display = 'none';
                    this.xrayHud.style.display = 'none';
                    return;
                }

                const rect = el.getBoundingClientRect();
                const cs = window.getComputedStyle(el);

                this.xrayBox.style.display = 'block';
                this.xrayBox.style.top = `${rect.top}px`;
                this.xrayBox.style.left = `${rect.left}px`;
                this.xrayBox.style.width = `${rect.width}px`;
                this.xrayBox.style.height = `${rect.height}px`;

                const tag = el.tagName.toLowerCase();
                const cls = el.className && typeof el.className === 'string'
                    ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
                    : '';
                const fontFamily = (cs.fontFamily.split(',')[0] || '').replace(/['"]/g, '');
                const fontSize = `${Math.round(parseFloat(cs.fontSize))}px`;
                const lineHeight = cs.lineHeight === 'normal' ? 'normal' : `${Math.round(parseFloat(cs.lineHeight))}px`;

                this.xrayHud.innerHTML = `
                    <div class="rs-xray-hud__tag">&lt;${tag}${cls}&gt;</div>
                    <div class="rs-xray-hud__row"><span>Dimensions</span><span>${Math.round(rect.width)} × ${Math.round(rect.height)}px</span></div>
                    <div class="rs-xray-hud__row"><span>Typography</span><span>${fontFamily} · ${fontSize}/${lineHeight}</span></div>
                    <div class="rs-xray-hud__row"><span>Color / Radius</span><span>${cs.color} · r:${cs.borderRadius}</span></div>
                `;
                this.xrayHud.style.display = 'block';

                const hudWidth = 290;
                const hudHeight = 105;
                let hudLeft = e.clientX + 16;
                let hudTop = e.clientY + 16;
                if (hudLeft + hudWidth > window.innerWidth - 12) hudLeft = e.clientX - hudWidth - 16;
                if (hudTop + hudHeight > window.innerHeight - 12) hudTop = e.clientY - hudHeight - 16;

                this.xrayHud.style.left = `${Math.max(12, hudLeft)}px`;
                this.xrayHud.style.top = `${Math.max(12, hudTop)}px`;
            };

            window.addEventListener('mousemove', this._boundInspectMove, true);
        }

        triggerAIChat(query) {
            const miniInput = document.getElementById('ai-mini-input');
            const miniSend = document.getElementById('ai-mini-send');
            if (miniInput && miniSend) {
                miniInput.value = query;
                miniSend.click();
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
                        title: `Ask Portfolio AI: "${query.trim()}"`,
                        sub: 'Press Enter to send this question directly to the Gemini 2.5 RAG assistant',
                        badge: 'Enter ↵',
                        keywords: '',
                        action: () => {
                            this.close();
                            this.triggerAIChat(query.trim());
                        }
                    }
                ];
            }

            this.listEl.innerHTML = '';
            let currentGroup = null;

            this.filteredItems.forEach((item, idx) => {
                if (item.group !== currentGroup) {
                    currentGroup = item.group;
                    const groupHeader = document.createElement('div');
                    groupHeader.className = 'rs-cmd-group-label';
                    groupHeader.textContent = currentGroup;
                    this.listEl.appendChild(groupHeader);
                }

                const row = document.createElement('div');
                row.className = `rs-cmd-item${idx === this.activeIndex ? ' is-active' : ''}`;
                row.setAttribute('role', 'option');
                row.setAttribute('aria-selected', idx === this.activeIndex ? 'true' : 'false');
                row.dataset.index = String(idx);

                row.innerHTML = `
                    <div class="rs-cmd-item__left">
                        <span class="rs-cmd-item__icon">${item.icon}</span>
                        <div class="rs-cmd-item__text">
                            <span class="rs-cmd-item__title">${item.title}</span>
                            <span class="rs-cmd-item__sub">${item.sub}</span>
                        </div>
                    </div>
                    <div class="rs-cmd-item__right">
                        <span class="rs-cmd-item__badge">${item.badge}</span>
                    </div>
                `;

                row.addEventListener('mouseenter', () => {
                    this.activeIndex = idx;
                    this.updateActiveItem(false);
                });

                row.addEventListener('click', (e) => {
                    e.preventDefault();
                    item.action();
                });

                this.listEl.appendChild(row);
            });
        }

        updateActiveItem(scrollIntoView = true) {
            const rows = this.listEl.querySelectorAll('.rs-cmd-item');
            rows.forEach((row, idx) => {
                const active = idx === this.activeIndex;
                row.classList.toggle('is-active', active);
                row.setAttribute('aria-selected', active ? 'true' : 'false');
                if (active && scrollIntoView) {
                    row.scrollIntoView({ block: 'nearest' });
                }
            });
        }

        open() {
            this.isOpen = true;
            this.activeIndex = 0;
            this.renderList(this.inputEl.value);
            this.overlay.classList.add('is-open');
            setTimeout(() => {
                this.inputEl.focus();
                this.inputEl.select();
            }, 30);
        }

        close() {
            this.isOpen = false;
            this.overlay.classList.remove('is-open');
        }

        toggle() {
            if (this.isOpen) this.close();
            else this.open();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.rsCommandPalette = new AtelierCommandPalette();
        });
    } else {
        window.rsCommandPalette = new AtelierCommandPalette();
    }
})();

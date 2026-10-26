/**
 * Obsidian Telemetry Command Palette (⌘K) — Westworld Delos / Star Wars HUD Edition
 * High-craft diagnostic console with on-demand vector HUD canvas, procedural Web Audio
 * micro-cues (muted by default), query phosphor highlighting, and zero-latency navigation.
 */
(function () {
    'use strict';

    const ACCENT_THEMES = [
        { name: 'TERRACOTTA', label: 'Terracotta Ember', value: '#C85A32' },
        { name: 'AMBER_HUD', label: 'Imperial Amber', value: '#D97706' },
        { name: 'EMERALD_SYS', label: 'Emerald Signal', value: '#10B981' }
    ];

    /**
     * Procedural Web Audio API Synthesizer (Zero External Assets)
     * Strictly muted by default to respect recruiter & open-office environments.
     */
    class ObsidianAudioEngine {
        constructor() {
            this.storageKey = 'rs_sfx_enabled';
            this.ctx = null;
            this.enabled = false;
            try {
                this.enabled = localStorage.getItem(this.storageKey) === 'true';
            } catch {
                this.enabled = false;
            }
        }

        ensureContext() {
            if (!this.enabled) return null;
            if (!this.ctx) {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (AudioCtx) {
                    this.ctx = new AudioCtx();
                }
            }
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume().catch(() => {});
            }
            return this.ctx;
        }

        toggle() {
            this.enabled = !this.enabled;
            try {
                localStorage.setItem(this.storageKey, this.enabled ? 'true' : 'false');
            } catch {}
            if (this.enabled) {
                this.playToggleOn();
            }
            return this.enabled;
        }

        playToggleOn() {
            const ctx = this.ensureContext();
            if (!ctx) return;
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(520, now);
            osc.frequency.exponentialRampToValueAtTime(1040, now + 0.065);
            gain.gain.setValueAtTime(0.03, now);
            gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.075);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.08);
        }

        playBoot() {
            const ctx = this.ensureContext();
            if (!ctx) return;
            const now = ctx.currentTime;
            // Subtle Westworld Delos console power-up harmonic sweep
            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gain = ctx.createGain();
            osc1.type = 'sine';
            osc2.type = 'triangle';
            osc1.frequency.setValueAtTime(190, now);
            osc1.frequency.exponentialRampToValueAtTime(580, now + 0.085);
            osc2.frequency.setValueAtTime(380, now);
            osc2.frequency.exponentialRampToValueAtTime(870, now + 0.085);
            gain.gain.setValueAtTime(0.001, now);
            gain.gain.linearRampToValueAtTime(0.028, now + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.095);
            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(ctx.destination);
            osc1.start(now);
            osc2.start(now);
            osc1.stop(now + 0.1);
            osc2.stop(now + 0.1);
        }

        playTick() {
            const ctx = this.ensureContext();
            if (!ctx) return;
            const now = ctx.currentTime;
            // Crisp 12ms high-frequency mechanical relay tick
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1380, now);
            osc.frequency.exponentialRampToValueAtTime(420, now + 0.014);
            gain.gain.setValueAtTime(0.022, now);
            gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.016);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.018);
        }

        playKey() {
            const ctx = this.ensureContext();
            if (!ctx) return;
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(920 + Math.random() * 160, now);
            osc.frequency.exponentialRampToValueAtTime(310, now + 0.01);
            gain.gain.setValueAtTime(0.015, now);
            gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.012);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.014);
        }

        playExec() {
            const ctx = this.ensureContext();
            if (!ctx) return;
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(540, now);
            osc.frequency.setValueAtTime(810, now + 0.032);
            gain.gain.setValueAtTime(0.03, now);
            gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.085);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.09);
        }

        playClose() {
            const ctx = this.ensureContext();
            if (!ctx) return;
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(360, now);
            osc.frequency.exponentialRampToValueAtTime(120, now + 0.055);
            gain.gain.setValueAtTime(0.022, now);
            gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.06);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.065);
        }
    }

    const audioFX = new ObsidianAudioEngine();
    window.rsAudioFX = audioFX;

    class AtelierCommandPalette {
        constructor() {
            this.isOpen = false;
            this.themeIndex = 0;
            this.activeIndex = 0;
            this.filteredItems = [];
            this.lastFocusedEl = null;
            this.hudCanvas = null;
            this.hudCtx = null;
            this.hudRaf = null;
            this.hudPulse = 0;
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
                @keyframes rsHudBootScan {
                    0% {
                        top: -10%;
                        opacity: 0.95;
                    }
                    100% {
                        top: 110%;
                        opacity: 0;
                    }
                }

                @keyframes rsLedPulse {
                    0%, 100% {
                        opacity: 1;
                        box-shadow: 0 0 8px var(--accent, #C85A32), 0 0 16px rgba(224, 107, 62, 0.5);
                    }
                    50% {
                        opacity: 0.45;
                        box-shadow: 0 0 3px var(--accent, #C85A32);
                    }
                }

                @keyframes rsCursorBlink {
                    0%, 49% { opacity: 1; }
                    50%, 100% { opacity: 0; }
                }

                .rs-cmd-overlay {
                    position: fixed;
                    inset: 0;
                    background: radial-gradient(circle at 50% 28%, rgba(18, 20, 28, 0.82) 0%, rgba(5, 6, 8, 0.92) 100%);
                    backdrop-filter: blur(22px) saturate(190%);
                    -webkit-backdrop-filter: blur(22px) saturate(190%);
                    z-index: 10000;
                    display: flex;
                    align-items: flex-start;
                    justify-content: center;
                    padding-top: clamp(36px, 10vh, 104px);
                    padding-inline: 16px;
                    opacity: 0;
                    visibility: hidden;
                    pointer-events: none;
                    transition: opacity 220ms cubic-bezier(0.16, 1, 0.3, 1), visibility 220ms;
                }

                .rs-cmd-overlay.is-open {
                    opacity: 1;
                    visibility: visible;
                    pointer-events: auto;
                }

                .rs-cmd-hud-canvas {
                    position: absolute;
                    inset: 0;
                    width: 100%;
                    height: 100%;
                    pointer-events: none;
                    z-index: 0;
                    opacity: 0.85;
                }

                .rs-cmd-modal {
                    position: relative;
                    z-index: 1;
                    width: min(650px, 100%);
                    max-height: 82vh;
                    background:
                        radial-gradient(550px circle at var(--modal-mx, 50%) var(--modal-my, 0%), rgba(200, 90, 50, 0.11), transparent 65%),
                        linear-gradient(180deg, #0D0F14 0%, #08090C 100%);
                    border: 1px solid rgba(255, 255, 255, 0.12);
                    border-radius: 12px;
                    box-shadow:
                        0 0 0 1px rgba(200, 90, 50, 0.16),
                        0 36px 90px -12px rgba(0, 0, 0, 0.88),
                        0 0 48px -10px rgba(200, 90, 50, 0.22),
                        inset 0 1px 0 rgba(255, 255, 255, 0.14);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    transform: translateY(-10px) scale(0.975);
                    transition: transform 260ms cubic-bezier(0.16, 1, 0.3, 1), border-color 200ms ease, box-shadow 200ms ease;
                    color: #F5F5F7;
                }

                /* Subtle CRT / Delos diagnostic micro-scanlines */
                .rs-cmd-modal::before {
                    content: "";
                    position: absolute;
                    inset: 0;
                    background: repeating-linear-gradient(
                        0deg,
                        rgba(255, 255, 255, 0.012) 0px,
                        rgba(255, 255, 255, 0.012) 1px,
                        transparent 1px,
                        transparent 3px
                    );
                    pointer-events: none;
                    z-index: 4;
                }

                /* Boot laser sweep line */
                .rs-cmd-modal::after {
                    content: "";
                    position: absolute;
                    left: 0;
                    right: 0;
                    top: -10%;
                    height: 2px;
                    background: linear-gradient(90deg, transparent 0%, rgba(224, 107, 62, 0.85) 50%, transparent 100%);
                    box-shadow: 0 0 18px 2px rgba(224, 107, 62, 0.55);
                    opacity: 0;
                    pointer-events: none;
                    z-index: 5;
                }

                .rs-cmd-overlay.is-open .rs-cmd-modal {
                    transform: translateY(0) scale(1);
                }

                .rs-cmd-overlay.is-open .rs-cmd-modal::after {
                    animation: rsHudBootScan 520ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }

                /* Precision corner reticle brackets */
                .rs-cmd-reticle {
                    position: absolute;
                    width: 10px;
                    height: 10px;
                    border-color: rgba(224, 107, 62, 0.65);
                    border-style: solid;
                    pointer-events: none;
                    z-index: 6;
                }
                .rs-cmd-reticle--tl { top: 5px; left: 5px; border-width: 1.5px 0 0 1.5px; border-top-left-radius: 3px; }
                .rs-cmd-reticle--tr { top: 5px; right: 5px; border-width: 1.5px 1.5px 0 0; border-top-right-radius: 3px; }
                .rs-cmd-reticle--bl { bottom: 5px; left: 5px; border-width: 0 0 1.5px 1.5px; border-bottom-left-radius: 3px; }
                .rs-cmd-reticle--br { bottom: 5px; right: 5px; border-width: 0 1.5px 1.5px 0; border-bottom-right-radius: 3px; }

                /* Top Telemetry Bar */
                .rs-cmd-telemetry {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 10px;
                    padding: 9px 16px 8px;
                    background: rgba(255, 255, 255, 0.025);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.07);
                    font-family: var(--font-mono, 'Space Mono', monospace);
                    font-size: 0.64rem;
                    letter-spacing: 0.08em;
                    text-transform: uppercase;
                    color: #8E929F;
                    user-select: none;
                }

                .rs-cmd-telemetry__left {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    min-width: 0;
                    overflow: hidden;
                }

                .rs-cmd-led {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background: var(--accent, #C85A32);
                    animation: rsLedPulse 2.4s infinite ease-in-out;
                    flex-shrink: 0;
                }

                .rs-cmd-sys-tag {
                    color: #E2E4EB;
                    font-weight: 700;
                    white-space: nowrap;
                }

                .rs-cmd-sys-divider {
                    color: rgba(255, 255, 255, 0.18);
                }

                .rs-cmd-sys-meta {
                    color: #7C7E86;
                    white-space: nowrap;
                }

                .rs-cmd-telemetry__right {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    flex-shrink: 0;
                }

                .rs-cmd-hud-btn {
                    appearance: none;
                    background: rgba(255, 255, 255, 0.04);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 4px;
                    padding: 2px 7px;
                    font-family: var(--font-mono, 'Space Mono', monospace);
                    font-size: 0.62rem;
                    font-weight: 600;
                    letter-spacing: 0.06em;
                    color: #9BA0AE;
                    cursor: pointer;
                    transition: all 140ms cubic-bezier(0.16, 1, 0.3, 1);
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                }

                .rs-cmd-hud-btn:hover {
                    background: rgba(200, 90, 50, 0.16);
                    border-color: rgba(224, 107, 62, 0.45);
                    color: #F5F5F7;
                }

                .rs-cmd-hud-btn.is-active {
                    background: rgba(200, 90, 50, 0.22);
                    border-color: rgba(224, 107, 62, 0.6);
                    color: #FF8A5B;
                    box-shadow: 0 0 10px rgba(200, 90, 50, 0.25);
                }

                /* Search Input Bar */
                .rs-cmd-search {
                    display: flex;
                    align-items: center;
                    gap: 11px;
                    padding: 13px 16px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                    background: rgba(5, 6, 8, 0.55);
                    position: relative;
                }

                .rs-cmd-prompt-glyph {
                    font-family: var(--font-mono, 'Space Mono', monospace);
                    font-size: 0.95rem;
                    font-weight: 700;
                    color: var(--accent, #E06B3E);
                    text-shadow: 0 0 10px rgba(224, 107, 62, 0.65);
                    flex-shrink: 0;
                    user-select: none;
                }

                .rs-cmd-search__icon {
                    color: #7C7E86;
                    flex-shrink: 0;
                    transition: color 150ms ease;
                }

                .rs-cmd-search:focus-within .rs-cmd-search__icon {
                    color: #E06B3E;
                }

                .rs-cmd-input {
                    flex: 1;
                    border: none;
                    background: transparent;
                    font-family: var(--font-sans, 'IBM Plex Sans', -apple-system, sans-serif);
                    font-size: 0.96rem;
                    font-weight: 500;
                    color: #F5F5F7;
                    outline: none;
                    padding: 2px 0;
                    margin: 0;
                    caret-color: #E06B3E;
                }

                .rs-cmd-input::placeholder {
                    color: #636672;
                    font-weight: 400;
                }

                .rs-cmd-node-count {
                    font-family: var(--font-mono, 'Space Mono', monospace);
                    font-size: 0.62rem;
                    font-weight: 600;
                    letter-spacing: 0.06em;
                    padding: 2px 6px;
                    border-radius: 4px;
                    background: rgba(255, 255, 255, 0.04);
                    color: #7C7E86;
                    border: 1px solid rgba(255, 255, 255, 0.07);
                    flex-shrink: 0;
                    user-select: none;
                }

                .rs-cmd-esc {
                    display: inline-flex;
                    align-items: center;
                    padding: 2px 7px;
                    font-family: var(--font-mono, 'Space Mono', monospace);
                    font-size: 0.62rem;
                    font-weight: 600;
                    letter-spacing: 0.05em;
                    text-transform: uppercase;
                    border-radius: 4px;
                    background: rgba(255, 255, 255, 0.05);
                    color: #9BA0AE;
                    border: 1px solid rgba(255, 255, 255, 0.12);
                    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
                    flex-shrink: 0;
                    user-select: none;
                    cursor: pointer;
                    transition: all 140ms ease;
                }

                .rs-cmd-esc:hover {
                    background: rgba(200, 90, 50, 0.2);
                    border-color: rgba(224, 107, 62, 0.5);
                    color: #FFFFFF;
                }

                /* Results Matrix */
                .rs-cmd-results {
                    flex: 1;
                    overflow-y: auto;
                    padding: 8px 10px 10px;
                    max-height: 400px;
                    overscroll-behavior: contain;
                    scrollbar-width: thin;
                    scrollbar-color: rgba(224, 107, 62, 0.35) rgba(255, 255, 255, 0.03);
                }

                .rs-cmd-group-title {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-family: var(--font-mono, 'Space Mono', monospace);
                    font-size: 0.62rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    color: #7C7E86;
                    padding: 10px 8px 5px;
                    user-select: none;
                }

                .rs-cmd-group-title::after {
                    content: "";
                    flex: 1;
                    height: 1px;
                    background: linear-gradient(90deg, rgba(255, 255, 255, 0.08) 0%, transparent 100%);
                }

                .rs-cmd-group-prefix {
                    color: var(--accent, #E06B3E);
                    opacity: 0.85;
                }

                .rs-cmd-item {
                    position: relative;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                    padding: 10px 11px;
                    border-radius: 8px;
                    cursor: pointer;
                    text-decoration: none;
                    color: inherit;
                    transition: transform 140ms cubic-bezier(0.16, 1, 0.3, 1), background 140ms ease, border-color 140ms ease, box-shadow 140ms ease;
                    user-select: none;
                    margin-bottom: 3px;
                    border: 1px solid transparent;
                    border-left: 2.5px solid transparent;
                    background: transparent;
                }

                .rs-cmd-item:hover,
                .rs-cmd-item.is-selected {
                    background: linear-gradient(90deg, rgba(200, 90, 50, 0.14) 0%, rgba(255, 255, 255, 0.03) 100%);
                    border-color: rgba(255, 255, 255, 0.08);
                    border-left-color: var(--accent, #E06B3E);
                    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 4px 16px rgba(0, 0, 0, 0.35);
                }

                .rs-cmd-item:active {
                    transform: scale(0.99);
                }

                .rs-cmd-item.is-selected .rs-cmd-item__title {
                    color: #FFFFFF;
                    text-shadow: 0 0 14px rgba(224, 107, 62, 0.35);
                }

                .rs-cmd-item__left {
                    display: flex;
                    align-items: center;
                    gap: 11px;
                    min-width: 0;
                    flex: 1;
                }

                .rs-cmd-item__icon {
                    width: 26px;
                    height: 26px;
                    border-radius: 6px;
                    background: rgba(255, 255, 255, 0.04);
                    border: 1px solid rgba(255, 255, 255, 0.09);
                    color: #9BA0AE;
                    font-family: var(--font-mono, 'Space Mono', monospace);
                    font-size: 0.66rem;
                    font-weight: 700;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    transition: all 140ms ease;
                }

                .rs-cmd-item.is-selected .rs-cmd-item__icon,
                .rs-cmd-item:hover .rs-cmd-item__icon {
                    background: rgba(200, 90, 50, 0.22);
                    border-color: rgba(224, 107, 62, 0.55);
                    color: #FF8A5B;
                    box-shadow: 0 0 10px rgba(200, 90, 50, 0.3);
                }

                .rs-cmd-item__content {
                    display: flex;
                    flex-direction: column;
                    min-width: 0;
                    gap: 2px;
                }

                .rs-cmd-item__title {
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: #E4E6EE;
                    line-height: 1.25;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    letter-spacing: -0.01em;
                }

                .rs-cmd-item__sub {
                    font-size: 0.73rem;
                    color: #7C7E86;
                    line-height: 1.3;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .rs-cmd-item.is-selected .rs-cmd-item__sub {
                    color: #A1A4B0;
                }

                .rs-cmd-mark {
                    background: rgba(224, 107, 62, 0.24);
                    color: #FF9870;
                    border-radius: 2px;
                    padding: 0 2px;
                    font-weight: 700;
                    box-shadow: 0 0 8px rgba(224, 107, 62, 0.2);
                }

                .rs-cmd-item__right {
                    display: inline-flex;
                    align-items: center;
                    gap: 7px;
                    flex-shrink: 0;
                }

                .rs-cmd-item__kpi {
                    font-family: var(--font-mono, 'Space Mono', monospace);
                    font-size: 0.64rem;
                    font-weight: 700;
                    padding: 2px 7px;
                    border-radius: 4px;
                    letter-spacing: 0.02em;
                    white-space: nowrap;
                }

                .rs-cmd-kpi--cobalt,
                .rs-cmd-kpi--terracotta {
                    background: rgba(200, 90, 50, 0.16);
                    color: #FF8A5B;
                    border: 1px solid rgba(224, 107, 62, 0.35);
                }

                .rs-cmd-kpi--emerald {
                    background: rgba(16, 185, 129, 0.14);
                    color: #34D399;
                    border: 1px solid rgba(16, 185, 129, 0.32);
                }

                .rs-cmd-kpi--slate {
                    background: rgba(255, 255, 255, 0.06);
                    color: #C4C7D4;
                    border: 1px solid rgba(255, 255, 255, 0.14);
                }

                .rs-cmd-item__badge {
                    font-family: var(--font-mono, 'Space Mono', monospace);
                    font-size: 0.63rem;
                    font-weight: 500;
                    padding: 2px 7px;
                    border-radius: 4px;
                    background: rgba(255, 255, 255, 0.04);
                    color: #8E929F;
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    white-space: nowrap;
                }

                .rs-cmd-item__return {
                    font-family: var(--font-mono, 'Space Mono', monospace);
                    font-size: 0.72rem;
                    font-weight: 700;
                    color: #FF8A5B;
                    opacity: 0;
                    transform: translateX(-3px);
                    transition: all 140ms cubic-bezier(0.16, 1, 0.3, 1);
                }

                .rs-cmd-item.is-selected .rs-cmd-item__return,
                .rs-cmd-item:hover .rs-cmd-item__return {
                    opacity: 1;
                    transform: translateX(0);
                }

                /* Diagnostic Telemetry Footer */
                .rs-cmd-footer {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                    padding: 9px 16px;
                    border-top: 1px solid rgba(255, 255, 255, 0.08);
                    background: rgba(5, 6, 8, 0.78);
                    font-size: 0.65rem;
                    color: #7C7E86;
                    font-family: var(--font-mono, 'Space Mono', monospace);
                    user-select: none;
                }

                .rs-cmd-footer__brand {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    letter-spacing: 0.04em;
                    color: #9BA0AE;
                    min-width: 0;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .rs-cmd-footer__target-prefix {
                    color: var(--accent, #E06B3E);
                    font-weight: 700;
                }

                .rs-cmd-footer__cursor {
                    display: inline-block;
                    width: 5px;
                    height: 10px;
                    background: var(--accent, #E06B3E);
                    vertical-align: middle;
                    animation: rsCursorBlink 1s infinite;
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
                    padding: 1.5px 5px;
                    border-radius: 4px;
                    background: rgba(255, 255, 255, 0.06);
                    color: #D0D3DF;
                    border: 1px solid rgba(255, 255, 255, 0.14);
                    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
                    font-size: 0.62rem;
                    font-weight: 600;
                    margin-right: 3px;
                }

                @media (max-width: 640px) {
                    .rs-cmd-sys-meta,
                    .rs-cmd-node-count,
                    .rs-cmd-footer__brand {
                        display: none;
                    }
                    .rs-cmd-item__sub {
                        display: none;
                    }
                    .rs-cmd-modal {
                        max-height: 86vh;
                    }
                    .rs-cmd-footer {
                        justify-content: center;
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
            this.overlay.setAttribute('aria-label', 'Obsidian Command & Telemetry Console');

            const sfxState = audioFX.enabled ? 'ON' : 'OFF';
            const sfxActiveClass = audioFX.enabled ? ' is-active' : '';

            this.overlay.innerHTML = `
                <canvas class="rs-cmd-hud-canvas" id="rsCmdHudCanvas" aria-hidden="true"></canvas>
                <div class="rs-cmd-modal" id="rsCmdModal">
                    <span class="rs-cmd-reticle rs-cmd-reticle--tl" aria-hidden="true"></span>
                    <span class="rs-cmd-reticle rs-cmd-reticle--tr" aria-hidden="true"></span>
                    <span class="rs-cmd-reticle rs-cmd-reticle--bl" aria-hidden="true"></span>
                    <span class="rs-cmd-reticle rs-cmd-reticle--br" aria-hidden="true"></span>

                    <div class="rs-cmd-telemetry">
                        <div class="rs-cmd-telemetry__left">
                            <span class="rs-cmd-led" aria-hidden="true"></span>
                            <span class="rs-cmd-sys-tag">SYS_OK // DELOS_HUD_V56</span>
                            <span class="rs-cmd-sys-divider" aria-hidden="true">·</span>
                            <span class="rs-cmd-sys-meta" id="rsCmdTelemetryCoord">SEC: 0x04A · LATENCY: 08ms</span>
                        </div>
                        <div class="rs-cmd-telemetry__right">
                            <button type="button" class="rs-cmd-hud-btn${sfxActiveClass}" id="rsCmdSfxBtn" aria-pressed="${audioFX.enabled}" title="Toggle Procedural Terminal Audio (Muted by default)">
                                <span>[SFX: ${sfxState}]</span>
                            </button>
                            <button type="button" class="rs-cmd-hud-btn" id="rsCmdThemeBtn" title="Cycle Phosphor Accent Theme">
                                <span id="rsCmdThemeLabel">[PHOSPHOR: TERRACOTTA]</span>
                            </button>
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
                            aria-label="Search case studies, pages, or execute diagnostic commands"
                            placeholder="Filter case studies, execute protocol, or ask portfolio AI..."
                            autocomplete="off"
                            spellcheck="false"
                        />
                        <span class="rs-cmd-node-count" id="rsCmdNodeCount">11 NODES</span>
                        <kbd class="rs-cmd-esc" id="rsCmdEscBtn" title="Close Console (Esc)">esc</kbd>
                    </div>

                    <div class="rs-cmd-results" id="rsCmdResults" role="listbox"></div>

                    <div class="rs-cmd-footer">
                        <div class="rs-cmd-footer__brand">
                            <span class="rs-cmd-footer__target-prefix">TARGET //</span>
                            <span id="rsCmdFooterTarget">RYAN_SCHMIDT · PRINCIPAL_PORTFOLIO</span>
                            <span class="rs-cmd-footer__cursor" aria-hidden="true"></span>
                        </div>
                        <div class="rs-cmd-footer__shortcuts">
                            <span><kbd class="rs-cmd-key">↑↓</kbd>nav</span>
                            <span><kbd class="rs-cmd-key">↵</kbd>exec</span>
                            <span><kbd class="rs-cmd-key">esc</kbd>abort</span>
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
            this.sfxBtn = this.overlay.querySelector('#rsCmdSfxBtn');
            this.themeBtn = this.overlay.querySelector('#rsCmdThemeBtn');
            this.themeLabelEl = this.overlay.querySelector('#rsCmdThemeLabel');
            this.escBtn = this.overlay.querySelector('#rsCmdEscBtn');
            this.hudCanvas = this.overlay.querySelector('#rsCmdHudCanvas');
        }

        /**
         * On-Demand Vector HUD Canvas (Westworld / Star Wars Orbital Telemetry)
         * Runs strictly while the modal is open; zero background CPU/GPU overhead when closed.
         */
        startHudCanvas() {
            if (!this.hudCanvas) return;
            const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            if (prefersReduced) return;

            const canvas = this.hudCanvas;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            this.hudCtx = ctx;

            const resize = () => {
                const dpr = Math.min(window.devicePixelRatio || 1, 2);
                canvas.width = window.innerWidth * dpr;
                canvas.height = window.innerHeight * dpr;
                ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            };
            resize();
            this._hudResizeHandler = resize;
            window.addEventListener('resize', resize);

            let angle = 0;
            const renderFrame = () => {
                if (!this.isOpen) return;
                const w = window.innerWidth;
                const h = window.innerHeight;
                ctx.clearRect(0, 0, w, h);

                const cx = w * 0.5 + (this.pointerX - 0.5) * 28;
                const cy = h * 0.42 + (this.pointerY - 0.5) * 28;
                angle += 0.0025;
                this.hudPulse *= 0.92;

                // 1. Subtle Orbital Telemetry Rings (Westworld Delos Diagnostic Loop)
                const baseRadius = Math.min(w, h) * 0.38;
                ctx.save();
                ctx.translate(cx, cy);

                // Outer dashed orbital ring
                ctx.strokeStyle = `rgba(224, 107, 62, ${0.11 + this.hudPulse * 0.14})`;
                ctx.lineWidth = 1;
                ctx.setLineDash([4, 10]);
                ctx.beginPath();
                ctx.arc(0, 0, baseRadius, angle, angle + Math.PI * 2);
                ctx.stroke();

                // Secondary counter-rotating sector ring
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
                ctx.setLineDash([24, 16, 4, 16]);
                ctx.beginPath();
                ctx.arc(0, 0, baseRadius * 0.78, -angle * 1.4, -angle * 1.4 + Math.PI * 2);
                ctx.stroke();

                // Outer radar degree ticks
                ctx.setLineDash([]);
                const tickCount = 36;
                for (let i = 0; i < tickCount; i++) {
                    const a = (i / tickCount) * Math.PI * 2 + angle * 0.4;
                    const r1 = baseRadius * 1.04;
                    const r2 = i % 3 === 0 ? baseRadius * 1.085 : baseRadius * 1.055;
                    ctx.strokeStyle = i % 9 === 0 ? 'rgba(224, 107, 62, 0.28)' : 'rgba(255, 255, 255, 0.06)';
                    ctx.beginPath();
                    ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
                    ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
                    ctx.stroke();
                }

                // Horizon axis hairlines
                ctx.strokeStyle = 'rgba(224, 107, 62, 0.07)';
                ctx.beginPath();
                ctx.moveTo(-w * 0.45, 0);
                ctx.lineTo(-baseRadius * 0.85, 0);
                ctx.moveTo(baseRadius * 0.85, 0);
                ctx.lineTo(w * 0.45, 0);
                ctx.stroke();

                ctx.restore();
                this.hudRaf = requestAnimationFrame(renderFrame);
            };

            this.hudRaf = requestAnimationFrame(renderFrame);
        }

        stopHudCanvas() {
            if (this.hudRaf) {
                cancelAnimationFrame(this.hudRaf);
                this.hudRaf = null;
            }
            if (this._hudResizeHandler) {
                window.removeEventListener('resize', this._hudResizeHandler);
                this._hudResizeHandler = null;
            }
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
                    group: '01 // Case Studies',
                    icon: '01',
                    title: 'Custom Dashboards & AI Summaries (D-Tools Cloud)',
                    sub: '+71% Beta Engagement · Executive KPI system & pipeline forecasting',
                    badge: 'Case Study',
                    kpi: '+71% Beta',
                    kpiType: 'terracotta',
                    targetPath: 'SECTOR // pages/dashboard.html',
                    keywords: 'dashboard bi analytics d-tools cloud opportunity signals custom dashboards ai summaries kpi pipeline b2b data visualization metrics revenue 71%',
                    action: () => { window.location.href = `${prefix}dashboard.html`; }
                },
                {
                    id: 'nav-inventory',
                    group: '01 // Case Studies',
                    icon: '02',
                    title: 'Inventory, Purchasing & Receiving (D-Tools Cloud)',
                    sub: '+18% Company-Wide MRR · Auditable ledger & interactive stepper',
                    badge: 'Case Study',
                    kpi: '+18% MRR',
                    kpiType: 'emerald',
                    targetPath: 'SECTOR // pages/inventory.html',
                    keywords: 'inventory purchasing po receiving ledger stepper d-tools supply chain warehouse enterprise 18% mrr company-wide',
                    action: () => { window.location.href = `${prefix}inventory.html`; }
                },
                {
                    id: 'nav-member-portal',
                    group: '01 // Case Studies',
                    icon: '03',
                    title: 'i4cp Member Portal & Research Discovery',
                    sub: '+500% Ahri Sessions · Research IA & conversational AI discovery',
                    badge: 'Case Study',
                    kpi: '+500% Sessions',
                    kpiType: 'terracotta',
                    targetPath: 'SECTOR // pages/member-portal-overhaul.html',
                    keywords: 'i4cp member portal ai search synthesis rag overhaul enterprise research membership 500% sessions daily activity',
                    action: () => { window.location.href = `${prefix}member-portal-overhaul.html`; }
                },
                {
                    id: 'nav-ai-portfolio',
                    group: '01 // Case Studies',
                    icon: '04',
                    title: 'Designing & Building an AI-Native Portfolio',
                    sub: 'Zero-Build Stack · Vector Grounding · Design Token System',
                    badge: 'Architecture',
                    kpi: 'Zero-Build',
                    kpiType: 'slate',
                    targetPath: 'SECTOR // pages/ai-coding-portfolio.html',
                    keywords: 'portfolio architecture zero-build vector search grounding coding tokens design systems vanilla web components cursor',
                    action: () => { window.location.href = `${prefix}ai-coding-portfolio.html`; }
                },

                // Pages & Navigation
                {
                    id: 'nav-work-overview',
                    group: '02 // Navigation Matrix',
                    icon: '★',
                    title: 'Selected Work & Shipped Outcomes',
                    sub: '4 featured case studies across BI, supply chain, and enterprise AI',
                    badge: 'Index ↵',
                    targetPath: 'LOC // index.html#work',
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
                    group: '02 // Navigation Matrix',
                    icon: '◇',
                    title: 'Design Philosophy & Approach',
                    sub: 'Systemizer instinct, designing in code, and verifiable business outcomes',
                    badge: 'Philosophy ↵',
                    targetPath: 'LOC // pages/about.html#builder',
                    keywords: 'approach philosophy principles systemizer designing in code verifiable outcomes craft builder',
                    action: () => {
                        this.close();
                        window.location.href = `${prefix}about.html#builder`;
                    }
                },
                {
                    id: 'nav-about',
                    group: '02 // Navigation Matrix',
                    icon: 'RS',
                    title: 'About Ryan Schmidt: Leadership & Background',
                    sub: '6+ years in B2B SaaS, Design Systems, and mentoring 1,500+ designers',
                    badge: 'Profile ↵',
                    targetPath: 'LOC // pages/about.html',
                    keywords: 'about bio leadership experience career history philosophy background ryan schmidt mentor designlab 6+ years',
                    action: () => { window.location.href = `${prefix}about.html`; }
                },
                {
                    id: 'nav-home',
                    group: '02 // Navigation Matrix',
                    icon: '⌂',
                    title: 'Home: Editorial Index',
                    sub: 'Return to primary portfolio editorial hero and index',
                    badge: 'Home ↵',
                    targetPath: 'LOC // index.html#top',
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

                // Quick Actions & Telemetry
                {
                    id: 'act-resume',
                    group: '03 // Direct Protocols',
                    icon: '↓',
                    title: 'View Resume Dossier (PDF)',
                    sub: 'Open ryan-schmidt-resume.pdf in a new tab',
                    badge: 'PDF ↗',
                    targetPath: 'EXEC // assets/ryan-schmidt-resume.pdf',
                    keywords: 'resume cv pdf download hire background experience skills ryan schmidt',
                    action: () => {
                        window.open(resumePath, '_blank', 'noopener');
                        this.close();
                    }
                },
                {
                    id: 'act-email',
                    group: '03 // Direct Protocols',
                    icon: '@',
                    title: 'Email Ryan Schmidt',
                    sub: 'ryanschmidt1989@gmail.com (opens default email client)',
                    badge: 'Email ↗',
                    targetPath: 'EXEC // mailto:ryanschmidt1989@gmail.com',
                    keywords: 'email contact hire reach out message ryanschmidt1989 gmail write direct inbox mailto',
                    action: () => {
                        window.location.href = 'mailto:ryanschmidt1989@gmail.com';
                        this.close();
                    }
                },
                {
                    id: 'act-linkedin',
                    group: '03 // Direct Protocols',
                    icon: '↗',
                    title: 'Connect on LinkedIn',
                    sub: 'linkedin.com/in/ryanschmidt1989 (message or network directly)',
                    badge: 'Connect ↗',
                    targetPath: 'EXEC // linkedin.com/in/ryanschmidt1989',
                    keywords: 'linkedin contact hire reach out message connect social network',
                    action: () => {
                        window.open('https://www.linkedin.com/in/ryanschmidt1989/', '_blank', 'noopener');
                        this.close();
                    }
                },
                {
                    id: 'act-tokens',
                    group: '03 // Direct Protocols',
                    icon: '◐',
                    title: 'Cycle Phosphor Accent Telemetry (/tokens)',
                    sub: 'Switch live interface accent between Terracotta, Imperial Amber, and Emerald',
                    badge: 'Theme ↵',
                    targetPath: 'SYS // CSS_CUSTOM_PROPERTIES',
                    keywords: 'tokens theme color accent phosphor terracotta amber emerald mode',
                    action: () => {
                        this.cycleTheme();
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
                if (e.target === this.overlay || e.target === this.hudCanvas) {
                    this.close();
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
                    this.sfxBtn.innerHTML = `<span>[SFX: ${isOn ? 'ON' : 'OFF'}]</span>`;
                    this.inputEl.focus();
                });
            }

            if (this.themeBtn) {
                this.themeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.cycleTheme();
                    audioFX.playTick();
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
                    const hexX = Math.min(255, Math.max(0, Math.floor(this.pointerX * 255))).toString(16).toUpperCase().padStart(2, '0');
                    const hexY = Math.min(255, Math.max(0, Math.floor(this.pointerY * 255))).toString(16).toUpperCase().padStart(2, '0');
                    this.coordEl.textContent = `VEC: 0x${hexX}${hexY} · LATENCY: 08ms`;
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
                    group: '04 // Neural Portfolio Synthesis',
                    icon: '✦',
                    title: `Transmit Query to Portfolio AI: "${raw}"`,
                    sub: 'Synthesize grounded answer from Ryan’s case studies and role-fit knowledge base',
                    badge: 'Ask AI ↵',
                    kpi: 'RAG_LIVE',
                    kpiType: 'terracotta',
                    targetPath: 'AI_STREAM // /api/chat',
                    action: () => {
                        this.triggerAIChat(raw);
                    }
                });

                this.filteredItems = matches;
            }

            if (this.nodeCountEl) {
                const count = this.filteredItems.length;
                this.nodeCountEl.textContent = `${String(count).padStart(2, '0')} ${count === 1 ? 'NODE' : 'NODES'}`;
            }

            this.resultsEl.innerHTML = '';
            let currentGroup = null;

            this.filteredItems.forEach((item, idx) => {
                if (item.group !== currentGroup) {
                    currentGroup = item.group;
                    const groupHeader = document.createElement('div');
                    groupHeader.className = 'rs-cmd-group-title';
                    const parts = currentGroup.split('//');
                    if (parts.length > 1) {
                        groupHeader.innerHTML = `<span class="rs-cmd-group-prefix">${this.escapeHtml(parts[0].trim())} //</span><span>${this.escapeHtml(parts[1].trim())}</span>`;
                    } else {
                        groupHeader.textContent = currentGroup;
                    }
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
            this.startHudCanvas();
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
            this.stopHudCanvas();
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

    function initSubpagePlaceholder() {
        const miniInput = document.getElementById('ai-mini-input');
        if (miniInput) {
            miniInput.placeholder = window.innerWidth <= 600
                ? 'Ask AI or press ⌘K for telemetry...'
                : 'Ask Ryan’s portfolio AI a question, or press ⌘K for command console...';
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

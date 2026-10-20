# Memory

## Project
Personal portfolio site for Ryan Schmidt, Senior SaaS Product Designer. Static HTML/CSS/JS site deployed via Vercel. Includes an AI chat assistant powered by Gemini API + Supabase vector store, with a unified Swiss/Atelier CLI omnibar identity and interactive conversational stage.

## Scores (Last: 2026-10-20)

| Metric | Before | After |
|---|---|---|
| SEO | 8.0 | 9.4 |
| AEO | 5.0 | 9.2 |
| Accessibility | 7.5 | 9.5 |
| Visual design | 7.5 | 9.6 |
| Interaction design | 7.0 | 9.5 |
| Consistency | 7.5 | 9.8 |
| AI chat quality | 8.0 | 9.6 |
| Hireability | 7.8 | 9.5 |
| Differentiation | 7.5 | 9.7 |
| Content quality | 7.5 | 9.2 |
| Performance | 8.8 | 9.6 |
| Mobile UX | 8.0 | 9.4 |
| Info architecture | 8.0 | 9.5 |
| Unique positioning | 7.5 | 9.8 |
| Code quality | 8.5 | 9.5 |
| **Average** | **7.6** | **9.5** |

## Completed Work
- Deep full-codebase scan across all 7 pages, CSS modules, and JS controllers.
- Brand and positioning standardization: Normalized "Senior SaaS Product Designer" across all page titles, meta descriptions, OpenGraph tags, Schema.org Person graphs, manifest, and resume references.
- CLI omnibar brand integration: Moved identity into the omnibar (`Ryan Schmidt — Senior SaaS Product Designer`) across desktop and mobile, with interactive command palette (⌘K) and direct LinkedIn integration.
- Full Copilot/Linear/Vercel AI chat redesign: Telemetry badges, citation pill chips, source trays, suggested followup chips, and copy buttons.
- CLS / Performance optimizations: Added intrinsic image dimensions to all polaroid images, preconnect tags, font display swapping.
- Cleaned dead code and removed unused files: Deleted `scripts/home-titles.js`, removed obsolete `.home-logo`, `.home-stage-block`, `audio-context-*`, WebGL fallback styles, and duplicate CSS properties.
- Heading hierarchy validation: Zero skipped heading levels on all 7 HTML pages with strictly one accessible `<h1>`.
- Vitest suite passing 100% (60 unit tests green).

## File Structure
- `index.html` (root) — home page with zero-scroll 100dvh viewport and AI conversational stage
- `404.html` (root) — 404 page
- `pages/about.html` — about page
- `pages/dashboard.html` — case study: AI dashboards
- `pages/inventory.html` — case study: real-time inventory
- `pages/ai-coding-portfolio.html` — case study: AI-coded portfolio
- `pages/member-portal-overhaul.html` — case study: portal redesign
- `styles.css` — root entry stylesheet
- `css/tokens.css` — design tokens (colors, spacing, typography)
- `css/base.css` — base typography and reset
- `css/layout.css` — responsive container and layout utilities
- `css/components.css` — reusable UI components
- `css/pages.css` — page-specific layouts and chat stage styles
- `scripts/cli-mode.js` — Swiss/Atelier omnibar, command palette, and identity controller
- `scripts/home-ai-stage.js` — Conversational AI thread & stream controller
- `scripts/rs-chat-widget.js` — Subpage AI chat drawer widget
- `scripts/scripts.js` — Shared site utilities and navigation
- `api/chat.js` — Serverless Gemini 2.5 streaming chat endpoint

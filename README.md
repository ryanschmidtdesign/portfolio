# Ryan Schmidt — Portfolio

Senior Product Designer. Systems thinker. Builder.

[ryanschmidt.com](https://ryanschmidt.com)

## Stack

- **Hosting**: Vercel (serverless functions for API)
- **Chat**: Gemini API (Google AI) via serverless function
- **Knowledge base**: JSON-based portfolio index with ~31 case examples
- **Frontend**: Vanilla JS, semantic HTML, minimal dependencies
- **Styling**: Modular CSS (`styles.css` as entry point → tokens, base, layout, components, pages, utilities)
- **DB (optional)**: Supabase for visit logging

## Key Files

| Path | Purpose |
|---|---|
| `api/chat.js` | Serverless function — portfolio chat backed by Gemini |
| `scripts/rs-chat-widget.js` | Client-side chat widget |
| `assets/portfolio-kb.json` | Knowledge base (cases, FAQ, policy, answer guidelines) |
| `styles.css` | CSS entry point (imports modular files from `css/`) |
| `css/tokens.css` | Design tokens & custom properties |
| `css/base.css` | Reset, global defaults, base elements |
| `css/layout.css` | Grid, containers, navigation layout |
| `css/components.css` | Reusable components (case studies, ASD, chat, callouts) |
| `css/pages.css` | Page-specific styles (about, leadership, case study variants) |
| `css/utilities.css` | Utility classes (`.sr-only`) |
| `sw.js` | Service worker — cache-first for static assets, network-first for API |
| `vitest.config.js` | Test runner config |
| `tests/api/chat.test.js` | Chat API test suite (36 tests) |
| `.github/workflows/ci.yml` | CI pipeline (lint, HTML validate, test) |
| `_meta/AGENTS.md` | AI context — mission, audience, design principles |

## Chat Architecture

The chat uses Gemini (`gemini-2.5-flash`) for both general Q&A and "fit" scoring (how Ryan matches a role/company). The model switch from `gemini-3.5-flash` was required because the preview model's daily free quota was too tight for production use.

Key design decisions:

- **Caching**: Fit responses are cached to reduce API calls
- **No streaming fallback**: The UI shows a spinner until full response arrives
- **Intent detection**: `detectFitIntent()` and `detectIntent()` route questions to the right prompt template
- **Retry**: 429 (quota) errors retry once with a 1s delay

## Running Locally

```bash
# Set up environment
cp .env.example .env  # Add GEMINI_API_KEY, SUPABASE_URL, etc.

# Start dev server
vercel dev
```

## Intentional Design Constraints

The portfolio site is deliberately minimal — no React, no build step, no framework. This keeps load times fast, maintenance low, and the focus on content. Every change is measured against hiring outcomes first.

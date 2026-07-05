# Ryan Schmidt — Portfolio

Senior Product Designer. Systems thinker. Builder.

[ryanschmidt.com](https://ryanschmidt.com)

## Stack

- **Hosting**: Vercel (serverless functions for API)
- **Chat**: Gemini API (Google AI) via serverless function
- **Knowledge base**: JSON-based portfolio index with ~31 case examples
- **Frontend**: Vanilla JS, semantic HTML, minimal dependencies
- **Styling**: Single CSS file, no framework
- **DB (optional)**: Supabase for visit logging

## Key Files

| Path | Purpose |
|---|---|
| `api/chat.js` | Serverless function — portfolio chat backed by Gemini |
| `scripts/rs-chat-widget.js` | Client-side chat widget |
| `assets/portfolio-kb.json` | Knowledge base (cases, FAQ, policy, answer guidelines) |
| `styles.css` | All styling |
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

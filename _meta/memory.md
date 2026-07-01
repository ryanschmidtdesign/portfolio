# Memory

## Project
Personal portfolio site for Ryan Schmidt, Senior Product Designer. Static HTML/CSS/JS site deployed via Vercel. Includes an AI chat assistant powered by Gemini API + Supabase vector store.

## Scores (Last: 2026-06-30)

| Metric | Before | After |
|---|---|---|
| SEO | 7.5 | 8.0 |
| AEO | 5.0 | 5.0 |
| Accessibility | 7.0 | 7.5 |
| Visual design | 7.5 | 7.5 |
| Interaction design | 7.0 | 7.0 |
| Consistency | 7.0 | 7.5 |
| AI chat quality | 8.0 | 8.0 |
| Hireability | 7.5 | 7.8 |
| Differentiation | 7.5 | 7.5 |
| Content quality | 7.5 | 7.5 |
| Performance | 8.0 | 8.8 |
| Mobile UX | 8.0 | 8.0 |
| Info architecture | 8.0 | 8.0 |
| Unique positioning | 7.5 | 7.5 |
| Code quality | 7.0 | 8.5 |
| **Average** | **7.3** | **7.6** |

## Completed Work
- Comprehensive 15-metric scoring audit
- 18-item invisible-fix batch (GSAP defer, JSON-LD fix, sitemap link, heading hierarchy, aria-labels, back-to-top tabindex, dead CSS variables, 404.html rebuild, hamburger keydown leak, contrast bump, chat timeout, disabled send styling, empty-submission shake, carousel swipe, Three.js fade selector)
- Tiered ranked list of 30 improvements
- CSS tokenization: `--shadow-menu`, `--shadow-menu-hover`, `--ease-menu`, `--radius-sm`/`--radius-md`, `--text-on-accent`, `--page-margin: 6rem`
- Merged split/duplicate CSS rules
- `.label`/`.tldr-label`/`.text-meta` color → `--text-secondary`
- Dead CSS removal (~600 lines saved): `.btn`, `.ask-trigger`, `.constellation-*`, `.metric-clip-*`, `.tilt-image-*`, `.coming-soon-*`, `.validation-metrics`, `.section-rail`, `.read-time-badge`, `.scroll-progress-bar`, `.callout--lg`, `.sa-arrow`/`.sa-caption`, `.adoption-*`, `.builder-timeline`, `.metric-card-visual`, `.footer-nav`
- HTML improvements: async fonts (all pages), cdnjs preconnect (all pages), dns-prefetch (index, about), theme-color (404), `defer` on home-titles.js, back-to-top SVG `aria-hidden`, hamburger `tabindex="-1"` on close, inline margin→class on about.html, `gap: var(--space-6)` on index
- Print stylesheet improvement: hide `.back-to-top`, remove shadows/gradients/images, code block styles, page-break rules, selective link URLs
- `.ink-reveal-wrapper` class created
- Dead JS removal: magnetic buttons, read-time badge, section rail (all ~130 lines)
- Dead CSS cleanup: `.hero-cta-primary` (~30 lines), leftover `.btn` in print
- Dead file deleted: `scripts/three/three-liquid-slider.js` (14KB)
- RLS enabled on all 4 Supabase tables
- Security advisor issues resolved (views→SECURITY INVOKER, functions→fixed search_path)
- Chat analytics views created (`chat_questions`, `chat_intent_breakdown`, `chat_hire_signals`, `chat_volume_daily`)
- Resume download tracking API (`api/track-resume.js`) created
- `chat_messages.session_id` made nullable to fix silent 400 errors

## Key Decisions
- No dark mode or contact info added
- Scores tracked as standalone assessment (not against fabricated prior rounds)
- `--shadow-menu`/`--ease-menu` tokens created for menu animations
- `.label` etc. uses `--text-secondary` (`#475569`) not `--text-tertiary` for WCAG AA on 12px text
- Items 24–25, 27, 30 excluded per user request
- Breakpoint consolidation skipped (9 separate 768px blocks, merging risks breakage)
- Three.js liquid slider script deleted (dead code, not loaded by any HTML)
- About page: swapped heading/kicker — "About" is now the label, "Life Lately" is the h2
- AI-Coding case study: Cursor Files.png moved to "Start in code" section, Interactive Component.png moved to Implementation highlights; 3 Old screenshots added as before/after evidence grid
- Member Portal before/after pairs use the existing `image-splitter` component (data-splitter + image-splitter.js), not a new ba-slider — reuse the same component for future pairs
- `.before-after-grid` class created for multi-image evidence layouts (2-column grid, collapses to single at 640px)
- Heavy PNGs converted to WebP via Pillow (quality 80) with `<picture>` fallback — Old Home.png: 3.6MB → 77KB, others 70–97% reduction
- Image width/height attributes updated to match actual source dimensions where files were resized

## File Structure
- `index.html` (root) — home page
- `404.html` (root) — 404 page
- `pages/about.html` — about page
- `pages/dashboard.html` — case study: AI dashboards
- `pages/inventory.html` — case study: real-time inventory
- `pages/ai-coding-portfolio.html` — case study: AI-coded portfolio
- `pages/member-portal-overhaul.html` — case study: portal redesign
- `styles.css` — canonical CSS (~4033 lines)
- `scripts/scripts.js` — shared JS
- `scripts/home-titles.js` — homepage titles
- `scripts/rs-chat-widget.js` — AI chat widget
- `scripts/circular-carousel.js` — carousel
- `_meta/` — knowledge files (memory, skills, etc.)
- `assets/` — llms.txt, resume PDF, images

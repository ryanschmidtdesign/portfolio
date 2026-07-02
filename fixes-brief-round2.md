# Implementation Brief — Case Study Fixes (Round 2)

Four fixes, two files. Independent of each other — don't refactor anything not listed here.

---

## 1. `pages/ai-coding-portfolio.html` — System architecture cards ~20% too large

**File:** `styles.css`, `.case-study--ai-coding-portfolio .sa-funnel` / `.sa-step` / `.sa-step-title` / `.sa-step-body` (~line 2259–2307)

Scale the whole card down using existing tokens rather than a transform/scale hack:

| Property | Current | New |
|---|---|---|
| `.sa-funnel` gap | `var(--space-5)` (24px) | `var(--space-4)` (16px) |
| `.sa-step` padding | `var(--space-4)` (16px) | `var(--space-3)` (12px) |
| `.sa-step-title` font-size | `var(--fs-md)` (20px) | `var(--fs-body)` (17px) |
| `.sa-step-body` font-size | `var(--fs-sm)` (14px) | `var(--fs-xs)` (12px) |
| `.sa-chip` padding | `var(--space-1) var(--space-2)` | leave as-is (already smallest sensible size) |

This lands close to a 20% reduction across padding/gap/type without introducing a bespoke value. After the change:
- Re-check the "Patterns" card body copy still wraps cleanly at the smaller `--fs-xs` size and doesn't look cramped against its shorter siblings.
- Re-check the equal-width grid fix from the previous brief (`minmax(0, 1fr)`) is still intact — don't let this edit revert it.
- Spot-check the `@media (max-width: 900px)` single-column fallback still looks right at the smaller sizing.

---

## 2. `pages/ai-coding-portfolio.html` — Interactive walkthrough doesn't produce a real answer, and telemetry never changes

**File:** `pages/ai-coding-portfolio.html`, `#interactive-demo` inline `<script>` (~line 514–643)

### 2a. No genuine response
`animateSequence()` calls `fetchAnswer(question)`, which POSTs to `window.RS_CHAT_API || '/api/chat'`. Right now this either silently fails (caught and replaced with *"The API is not responding right now. Please try again later."*) or returns something that doesn't actually reflect the typed question. Before touching anything else:

- Confirm `/api/chat` is the same endpoint the live chat widget elsewhere on the site uses successfully, and confirm this demo is sending a payload shape (`{ message, url }`) that endpoint actually expects — check the working chat widget's request code for the canonical shape and match it exactly.
- Open the browser console while running the demo and check for a network error, a non-200 response, or a response whose JSON shape doesn't match `data.answer` (e.g. if the function actually returns `data.reply` or `data.text` instead — adjust the destructure to match reality rather than assuming `.answer`).
- Once the request/response shape is confirmed correct, verify the returned answer text actually changes based on the typed question (not a cached/static response from the function itself).
- If the endpoint genuinely cannot be reached from this static context (e.g. it's environment-gated and only live in production), add a graceful degraded state: instead of the generic "API is not responding" line, show a **realistic canned answer relevant to whatever was typed** so the demo still feels alive in local/preview environments — but this should be a fallback, not the primary path. Try to get the real call working first.

### 2b. Telemetry numbers never move
The three metrics (`tokens generated`, `chunks retrieved`, `vector search`) are hardcoded static text in the HTML (`1.3k`, `12`, `26ms`) and the animation sequence only ever toggles `.is-active` on `metric-1/2/3` for the reveal animation — it never updates their `<strong>` text. Fix:

- In `animateSequence()`, when each `metric-*` step fires, update that metric's `<strong>` text to a freshly generated plausible value instead of leaving the static HTML value in place. These can be fabricated — they don't need to reflect the real API call — but should feel responsive and vary run to run:
  - `metric-1` (tokens generated): random-ish integer roughly in the 800–2200 range, formatted like `1.3k` (use `k` shorthand above 1000).
  - `metric-2` (chunks retrieved): small integer, roughly 6–18.
  - `metric-3` (vector search): a millisecond value, roughly 14–45ms.
- Scale `metric-1` and `metric-2` loosely with the length of the typed question if easy to do (longer question → slightly higher token count is a nice touch), but don't over-engineer this — a bounded random value is fine if that's simpler.
- Reset/regenerate these values on every run (including repeat runs via Enter), not just once on page load.

---

## 3. `pages/member-portal-overhaul.html` — "The IA challenge: four levels without losing the thread" wraps too early

**File:** `styles.css`, `.case-study section h2` (~line 1785–1793)

### Problem
`.case-study section h2` has `text-wrap: balance`. Balance actively tries to even out line lengths across all wrapped lines — for a heading this length, that forces an earlier break than the container width requires, producing a shorter, more awkward first line instead of running closer to the full column width.

### Fix
Scope an override to this specific heading rather than changing the shared rule (other case-study h2s may be relying on `balance` looking fine at their shorter lengths):

```css
#ia-challenge .section-divider h2 {
  text-wrap: pretty;
}
```

Use `pretty` (avoids orphans without forcing even line lengths) rather than `normal`/`wrap` outright — check it against `unset`/`normal` too and pick whichever produces the more natural break. Verify at desktop width and at the `768px` mobile breakpoint that it still wraps sensibly (no orphaned single word on its own line).

---

## 4. `pages/member-portal-overhaul.html` — Button-controlled compare-panel content styling

**File:** `styles.css`, `[data-compare] .compare-panel` (~line 3091–3123)

### Problem
The panel content that swaps in based on the tab buttons (e.g. "The broadest practice domains (e.g. leadership, talent, culture)") currently inherits plain body copy styling — no distinct weight, and alignment isn't explicitly set.

### Fix
Add explicit styling to the panel's body text so the button-controlled content reads as a distinct, emphasized answer:

```css
[data-compare] .compare-panel p {
  font-weight: var(--weight-semibold);
  text-align: left;
}
```

Apply this specifically to the `<p>` inside `.compare-panel` (not the `<h3>`, which already has its own sizing rule at line 3120 and shouldn't need reweighting). Verify this doesn't visually clash with the two-line "Flat navigation / Progressive disclosure" panels (~line 408–415), which have both an `<h3>` and a `<p>` — the semibold body text should sit clearly beneath the heading without competing with it in weight.

---

## Notes for the agent
- Items 1 and 3 touch shared/global classes (`.sa-step`, `.case-study section h2`). Re-check other case studies that reuse `.sa-funnel`-style cards or `.case-study section h2` headings aren't visually broken by these changes — item 3's fix is scoped to `#ia-challenge` specifically for this reason; item 1's card-size change is scoped to `.case-study--ai-coding-portfolio` already and only affects that page.
- Item 2 requires actually running the page and checking network calls — don't guess at the response shape without confirming it against the console.

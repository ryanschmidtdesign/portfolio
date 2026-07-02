# Member Portal IA Challenge Section Fixes

## Goal
Make the two IA challenge cards feel intentionally paired instead of visually mismatched.

The current issue is that the first card has no title, while the second card has a title, intro paragraph, tabs, another heading, and outro paragraph. This creates uneven visual hierarchy. The fix is to make both cards follow the same pattern:

1. Card heading
2. Short supporting sentence
3. Interactive compare tabs
4. Short explanatory paragraph

---

## File 1: `member-portal-overhaul.html`

### 1. Replace the first IA card header

Find this block around lines 375–379:

```html
            <div class="ia-challenge-panel__header">
              <p>
                The content hierarchy has four distinct levels:
              </p>
            </div>
```

Replace it with:

```html
            <div class="ia-challenge-panel__header">
              <h3>Content hierarchy</h3>
              <p>
                The model moves from broad member intent to specific resources across four levels.
              </p>
            </div>
```

---

### 2. Replace the second IA card

Find this full block around lines 403–428:

```html
          <div class="ia-challenge-panel">
            <div class="ia-challenge-panel__header">
              <h3>Defining Decision: progressive disclosure over flat navigation</h3>
              <p>
                I structured the navigation so Areas of Focus orient the member at the top level, with Priorities and Topics revealed progressively as they narrow their intent. 
                Individual content surfaces with enough context, including type, recency, and relevance signal, to be immediately actionable without requiring another click to understand what it is.
              </p>
            </div>
            <div data-compare data-compare-default="progressive">
              <div class="compare-tabs">
              </div>
              <div class="compare-panels">
                <div class="compare-panel" data-compare-state="flat">
                  <h3>Flat navigation</h3>
                  <p>Exposes too much structure at once, creating a noisy entry point for members who need a clear next step.</p>
                </div>
                <div class="compare-panel" data-compare-state="progressive">
                  <h3>Progressive disclosure</h3>
                  <p>Supports member intent by revealing deeper levels only as users commit to a practice area or priority.</p>
                </div>
              </div>
            </div>
            <p>
              The goal was to make four levels feel like a natural path, not a taxonomy buried in dropdowns.
            </p>
          </div>
```

Replace it with:

```html
          <div class="ia-challenge-panel">
            <div class="ia-challenge-panel__header">
              <h3>Defining decision</h3>
              <p>
                Progressive disclosure over flat navigation.
              </p>
            </div>
            <div data-compare data-compare-default="progressive">
              <div class="compare-tabs">
              </div>
              <div class="compare-panels">
                <div class="compare-panel" data-compare-state="flat">
                  <h3>Flat navigation</h3>
                  <p>Exposes too much structure at once, creating a noisy entry point for members who need a clear next step.</p>
                </div>
                <div class="compare-panel" data-compare-state="progressive">
                  <h3>Progressive disclosure</h3>
                  <p>Reveals deeper levels only as members commit to a practice area or priority.</p>
                </div>
              </div>
            </div>
            <p>
              I structured the navigation so Areas of Focus orient members at the top level, with Priorities and Topics revealed as they narrow intent. The goal was to make four levels feel like a natural path, not a taxonomy buried in dropdowns.
            </p>
          </div>
```

---

## File 2: `styles.css`

### 3. Replace the Member Portal IA Challenge CSS block

Find this block around lines 2441–2471:

```css
/* ── Member Portal IA Challenge ── */
.case-study--member-portal .ia-challenge-panel {
  margin-block: var(--space-5);
  padding: var(--space-5);
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
}

.case-study--member-portal .ia-challenge-panel__header {
  margin-bottom: var(--space-4);
}

.case-study--member-portal .ia-challenge-panel__header h3 {
  margin: 0 0 var(--space-1);
  font-size: var(--fs-base);
  font-weight: var(--weight-semibold);
  color: var(--text-display);
}

.case-study--member-portal .ia-challenge-panel__header > p {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--fs-sm);
  max-width: var(--prose);
}

.case-study--member-portal .ia-challenge-panel [data-compare] {
  margin-bottom: 0;
}
```

Replace it with:

```css
/* ── Member Portal IA Challenge ── */
.case-study--member-portal .ia-challenge-panel {
  margin-block: var(--space-5);
  padding: var(--space-5);
  background: rgba(255, 255, 255, 0.58);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.case-study--member-portal .ia-challenge-panel__header {
  margin-bottom: 0;
}

.case-study--member-portal .ia-challenge-panel__header h3 {
  margin: 0 0 var(--space-1);
  font-size: var(--fs-body);
  line-height: var(--lh-md);
  font-weight: var(--weight-semibold);
  color: var(--text-display);
}

.case-study--member-portal .ia-challenge-panel__header > p {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--fs-sm);
  line-height: var(--lh-md);
  max-width: var(--prose-tight);
}

.case-study--member-portal .ia-challenge-panel [data-compare] {
  margin-block: 0;
}

.case-study--member-portal .ia-challenge-panel > p {
  margin-top: 0;
}
```

Notes:

- This fixes the undefined `var(--fs-base)` by replacing it with `var(--fs-body)`.
- The card now uses `display: flex`, `flex-direction: column`, and `gap` so spacing is consistent instead of relying on mixed margins.
- The slightly stronger white background helps the cards hold together without making them feel heavy.

---

### 4. Replace the compare panel alignment override

Find this block around lines 3338–3344:

```css
/* Member Portal: IA challenge — align compare panel padding with card content */
.case-study--member-portal #ia-challenge [data-compare] .compare-panel {
  padding-left: 0 !important;
  padding-right: 12px;
  padding-top: 12px;
  padding-bottom: 12px;
}
```

Replace it with:

```css
/* Member Portal: IA challenge — align compare panel padding with card content */
.case-study--member-portal #ia-challenge [data-compare] .compare-panel {
  padding: 0 12px 0 0;
}

.case-study--member-portal #ia-challenge [data-compare] .compare-panel h3 {
  margin: 0 0 var(--space-2);
  font-size: var(--fs-article-h3);
  line-height: var(--lh-md);
}

.case-study--member-portal #ia-challenge [data-compare] .compare-panel p {
  margin: 0;
  line-height: var(--lh-prose);
}
```

---

## Expected Result
The section should feel cleaner and more intentional:

- Both cards now have matching internal structure.
- The first card reads as the structure explanation.
- The second card reads as the design decision.
- The second card no longer has too many competing text levels.
- The compare tab content should feel more connected to the card instead of floating inside it.

## QA Checklist
After applying the changes, check the page at desktop and mobile widths.

- The first IA card should show the heading `Content hierarchy`.
- The second IA card should show the heading `Defining decision`.
- The tabs should still initialize and switch states correctly.
- The selected compare panel text should not jump vertically in an awkward way.
- The two cards should feel visually related without looking duplicated.
- No CSS variable warning should appear for `--fs-base` in DevTools.

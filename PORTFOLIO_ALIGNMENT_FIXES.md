# Portfolio Alignment & Optimization Plan
**Targeting 2026 UX Hiring Standards: Synchronizing Portfolio with Resume & LinkedIn**

---

## Executive Summary

| Document / Profile | Current Score | Target Score | Primary Objective |
| :--- | :---: | :---: | :--- |
| **Resume** | **98 / 100** | 98 / 100 | Clean, metric-driven single-page summary |
| **LinkedIn Profile** | **98 / 100** | 98 / 100 | High-trust, human narrative with uniform micro-paragraphs |
| **Portfolio (`ryanschmidt.design`)** | **93 / 100** | **98 / 100** | Resolve timeline discrepancy, harmonize metrics, and align mentorship |

Implementing the targeted updates below elevates the portfolio to **98/100**, creating a unified, ironclad narrative across your entire job search package.

---

## 1. `pages/about.html` — Fix Promotion Date Typo (Critical)

### The Issue
Line 301 currently lists `Jan 2025` for your promotion to Senior Product Designer. Because you joined i4cp in August 2024, listing `Jan 2025` creates an immediate conflict with your resume and LinkedIn (which document your promotion to Senior Product Designer at D-Tools in **January 2022**).

### Code Change: Lines 299–306
**Current Code:**
```html
<li class="timeline-item">
  <time class="timeline-date" datetime="2025">Jan 2025</time>
  <div class="timeline-content">
    <strong>Promoted to Senior Product Designer</strong>
    <p>Recognized for leadership in systems thinking and cross-team impact</p>
  </div>
</li>
```

**Replacement Code:**
```html
<li class="timeline-item">
  <time class="timeline-date" datetime="2022-01">Jan 2022</time>
  <div class="timeline-content">
    <strong>Promoted to Senior Product Designer at D-Tools</strong>
    <p>Recognized for design systems leadership, cross-team alignment, and SaaS platform scale</p>
  </div>
</li>
```

---

## 2. `pages/about.html` — Harmonize Designlab Mentorship Narrative

### The Issue
- **Portfolio text (Lines 384–386):** States *"From 2021 to 2026... wrapped up after five years to focus on family (toddlers, right?) and my day job"* and cites *"1,500 designers mentored"*.
- **Resume & LinkedIn:** States `Feb 2022 - Present` and cites `Mentored 50+ emerging designers` through 1:1 critiques.
- **The Solution:** Differentiate 1:1 mentorship from group critique facilitation so the numbers and status align without contradicting either record.

### Code Change: Lines 384–392
**Current Code:**
```html
<p class="leadership-lede">
  From 2021 to 2026, I mentored UX design students through Designlab by leading structured group critiques as a Senior Facilitator.
  I wrapped up after five years to focus on family (toddlers, right?) and my day job.
  <br><br>
  After 400+ critique sessions, I was more intentional in how I gave feedback. 
  I helped students define the problem before defending a screen or feature. 
  Working with so many different designers meant constantly seeing new tools, patterns, and ways of thinking, which pushed me to stay current.
</p>
```

**Replacement Code:**
```html
<p class="leadership-lede">
  Since 2022, I've mentored 50+ emerging designers 1:1 through Designlab's UX Academy, alongside facilitating over 400 structured group critiques as a Senior Facilitator.
  <br><br>
  After hundreds of critique sessions, I became much more intentional in how I give feedback: helping designers define the business problem before defending a screen or feature. Working with dozens of early-career designers pushes me to constantly evaluate new tools, interaction patterns, and ways of thinking.
</p>
```

### Metric Card Update: Line 414
**Change label from:**
```html
<span class="metric-highlight metric-highlight--xl">1500</span>
</div>
<div class="metric-label">
  <strong>Designers mentored</strong>
</div>
```
**To:**
```html
<span class="metric-highlight metric-highlight--xl">50+</span>
</div>
<div class="metric-label">
  <strong>1:1 Designers mentored</strong>
</div>
<p class="metric-body" style="position: relative; z-index: 1;">
  Across UX Academy curriculum, research, and capstones
</p>
```

---

## 3. `index.html` — Upgrade Homepage Impact Metric to 92% Adoption

### The Issue
On the homepage impact grid (line 515), the card reads `~85% component reuse on legacy B2B`. Your updated resume and LinkedIn feature a much stronger, verified milestone: `100+ components with 92% engineer adoption` and `38% fewer UI defects`.

### Code Change: Lines 514–517
**Current Code:**
```html
<div class="impact-metric">
  <strong class="metric">~85%</strong>
  <span class="metric-label">component reuse on legacy B2B</span>
</div>
```

**Replacement Code:**
```html
<div class="impact-metric">
  <strong class="metric" data-animate>92%</strong>
  <span class="metric-label">design system adoption (D-Tools)</span>
</div>
```

---

## 4. `assets/portfolio-kb.json` & `api/chat.js` — Update AI Assistant Proof Points

### The Issue
The on-site AI assistant (`api/chat.js` and `assets/portfolio-kb.json`) still uses the older `~85% component reuse` proof point in its grounding system prompt and responses.

### Code Change: `api/chat.js` (Line 1939)
**Current Code:**
```javascript
- Good: "Ryan built a token-first design system that reached **~85% component reuse** and cut white-labeling requests by **~50%** (D-Tools)."
```

**Replacement Code:**
```javascript
- Good: "Ryan built a token-first design system of 100+ components that achieved **92% engineer adoption** and cut frontend defects by **38%** (D-Tools)."
```

### Knowledge Base Updates: `assets/portfolio-kb.json`
Update all occurrences of:
- `85% component reuse` ➔ `100+ components with 92% engineer adoption and 38% defect reduction`
- Ensure the AI assistant answers recruiter inquiries with the exact metrics on your resume.

---

## 5. Standardize Resume PDF Links across Site & `llms.txt`

### The Issue
- Navigation links point to `assets/ryan-schmidt-resume-august-2026.pdf`.
- `assets/llms.txt` points to `assets/ryan-schmidt-resume-june-2026.pdf`.
- Your latest resume is updated for **September 2026**.

### Recommendation
1. Update `assets/ryan-schmidt-resume-august-2026.pdf` with the latest September 2026 build (or create a canonical `assets/ryan-schmidt-resume.pdf`).
2. Update line 23 & 55 in `assets/llms.txt`:
   ```markdown
   - Resume (PDF): https://ryanschmidt.design/assets/ryan-schmidt-resume-august-2026.pdf
   ```

---

## 6. Optional Career Roots Addition to `pages/about.html`

In the "Builder" section of `pages/about.html`, add one sentence linking your modern AI/browser prototyping workflows back to your roots at TASB and Bytemark:

> *"My foundation in code started nearly a decade ago, building responsive interfaces in HTML, CSS, and JavaScript for enterprise tools at TASB and white-label transit apps for municipal agencies at Bytemark. Prototyping in code with Cursor and Claude is the natural evolution of that workflow."*

This grounds your "UX Engineer / Builder" positioning as an authentic, 9-year progression rather than a recent trend.

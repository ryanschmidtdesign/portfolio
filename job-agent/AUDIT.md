# Job-Agent Audit: Findings & Improvement Roadmap

**Date:** 2026-09-18
**Scope:** Full read-through of `run.js`, `src/` (6 modules), `config/` (4 files), `tests/`, `README.md`, `package.json`, and live runtime state (`db.json`, screenshots, node_modules).
**Method:** Manual + static analysis, cross-checked against real execution artifacts in `db.json` / `screenshots/`.
**Status:** Remediated — P0 and P1 fixes implemented, tested, and verified.

---

## Executive Summary

The foundation is sound: safety caps, persistent storage, dry-run mode, ATS adapters, and dedupe are all present. However, three defects undermine the agent's core promise:

1. **"SUBMITTED" is never verified** — every submit click is recorded as a success, so failed applications burn the daily cap and the audit trail lies.
2. **The LLM path has never run** — `dotenv` is never imported, so the "AI-tailored" cover letter is always the static fallback template (confirmed by token math).
3. **The "generic" fallback is a Greenhouse handler used on arbitrary websites** — the primary source of real-world failures in `db.json`.

Fixing P0 items (below) converts the agent from "blind clicker with optimistic records" to "verifiable, fail-safe submitter."

---

## Part 1: Issues & Errors

Severity legend: **CRIT** = must fix before any more live runs · **HIGH** = causes wrong/unverifiable application behavior · **MED** = wastes budget or degrades reliability · **LOW** = hygiene/annoyance.

### Critical

| # | Severity | Location | Issue |
|---|----------|----------|-------|
| A1 | **CRIT** | `src/ats/greenhouse.js:118` | `return { success: true, submitted: isConfirmed \|\| true }` — the `\|\| true` makes `submitted` **always true**, defeating the confirmation-regex check on line 117. Dead logic. |
| A2 | **CRIT** | `src/ats/lever.js:66-72`, `src/ats/ashby.js:60-65` | Submit handlers return `{ success: true, submitted: true }` after clicking with **zero validation** — no error/aria-invalid check, no confirmation check, no URL-change check. Failed submissions are recorded as `SUBMITTED`. |
| A3 | **CRIT** | `src/ats/greenhouse.js:55-62`, `src/ats/lever.js:43-49`, `src/ats/ashby.js:22-29` | Resume upload is skipped silently when `fs.existsSync(resumePdfPath)` fails, then the form **still submits** — application goes out resume-less with no warning. |
| A4 | **CRIT** | `run.js:70-73` | Any URL that isn't greenhouse/lever/ashby is run through `applyGreenhouse` on whatever page loaded. Evidence (`db.json`): RemoteOK listing pages, `brex.com/careers`, `instacart.careers/job/`, `stripe.com/jobs/search` — all FAILED predictably. On arbitrary forms the submit selector could also click an unrelated control. |
| A5 | **CRIT** | `src/storage/db.js:38-40` + `:28-36` | Non-atomic `fs.writeFileSync` + lossy `read()`: a crash mid-write corrupts `db.json`; a parse error silently returns empty data; the next `write()` **permanently overwrites real history**. |
| A6 | **CRIT** | Evidence in `db.json` vs `screenshots/` | **History loss already occurred.** 57 screenshots + 54 LLM-generated letters (18,900 tokens ÷ 350) vs **only 9 DB records**. The dedupe gate (`hasAppliedTo`) therefore missed ~45 past candidate applications — risk of re-applying to jobs already applied to. |

### High

| # | Severity | Location | Issue |
|---|----------|----------|-------|
| B1 | HIGH | `run.js:58` | Cover-letter company is set from `title.split('-')[0]` — that's the **job title**, not the company. Dashless titles pass the whole string. Every letter is mis-addressed ("Hi Senior Product Designer Team,"). |
| B2 | HIGH | `package.json` + `src/llm/cover_letter.js:26` | `dotenv` is a dependency but **never imported anywhere**. No `.env` exists. `process.env.GEMINI_API_KEY` is only set if hand-exported in shell. The LLM branch has never executed (token evidence: exactly 350-token increments). |
| B3 | HIGH | `config/filters.json` + `src/scraper/job_discovery.js` | `filters.salary` (min $130k), `location.allowedCountries`, `remoteOnly`, `maxAgeDays` (14), and `supportedAts` are **never read**. The agent applies to any-age, any-salary postings that match only `keywords` + `excludedTitles`. |
| B4 | HIGH | `src/scraper/job_discovery.js:98-131` | `cleanTrackingUrl()` and `isValidAtsJobUrl()` are **dead code** — never called. No URL validation or tracking-param stripping happens anywhere in discovery. |
| B5 | HIGH | `src/scraper/job_discovery.js:29,70`, `src/llm/cover_letter.js:86` | **No timeouts** on any `fetch()`. A hung feed/LLM endpoint stalls the 24/7 daemon indefinitely (Node 18 `fetch` has no default timeout). |
| B6 | HIGH | `tests/test_token_and_cover.js:23` | Test calls `db.addTokenUsage(375000, 500000)` against the **live db.json** — permanently caps the agent at 75% weekly budget for the rest of the week. `npm test` is a footgun. Also: assertions are `console.log` only, and `testAgentCore()` is an unawaited floating promise. |
| B7 | HIGH | `src/scraper/job_discovery.js:50` | Location regex `/remote\|anywhere\|us\|united states\|canada/i` matches the substring "us" — "Austin, TX", "Houston", even "focus" qualify as remote. Actual `filters.location` config is ignored. |

### Medium

| # | Location | Issue |
|---|----------|-------|
| C1 | `config/limits.json` vs `README.md:9-10` vs `src/storage/db.js:61` | Three sources of truth disagree: README says **15/day**, config says **25/day**, code hardcodes default **15**. `tokenAlertThresholdPercentage: 0.75` is defined in config but 0.75 is hardcoded in `db.js`/`cover_letter.js`. |
| C2 | `src/scraper/job_discovery.js` | Discovery swallows every error with bare `catch {}` — zero observability into why feeds fail. Also 50 company boards are fetched **sequentially**, and no ETag/If-Modified-Since caching exists. |
| C3 | `config/company_boards.json:49` | `"twillio"` (sic) — the Twilio board is never fetched (likely intended company). |
| C4 | `config/profile.json:118` | `desiredSalary` is string `"135,000"`; `minSalary` is number `130000`. Type inconsistency (and both unused). |
| C5 | `db.json` Coursera records | Stored URLs contain a literal `...` and returned "Page not found" — stale/malformed `absolute_url`s out of the Greenhouse feed were applied to. No "is this posting still live?" pre-check. |
| C6 | `src/storage/db.js:47-53` | `getWeekId()` is not true ISO-week numbering — off-by-one near year boundaries; only affects weekly token reset timing (minor). |
| C7 | `src/storage/db.js` | Every `db.*` call re-reads + re-parses the whole JSON file (O(n) per call, many calls per job) and blocks the event loop via synchronous I/O. |
| C8 | `run.js:76` | Screenshot filename `app_${Date.now()}.png` — theoretically collidable (not in practice single-threaded), and **no retention policy** (57 files and growing, many of failures/404s with no audit value). |
| C9 | `src/ats/ashby.js:32-46`, `src/ats/greenhouse.js:72-91` | Link/text input fill loops don't consistently check whether a field was already auto-filled (Ashby loop overwrites unconditionally) — can clobber values on multi-pass runs. |

### Low / Safety

| # | Location | Issue |
|---|----------|-------|
| D1 | Git root | `job-agent/` is untracked and **not excluded** in the root `.gitignore`. One `git add .` commits `.chrome_profile/` (real browser cookies), screenshots (forms + resume PII), `db.json` (email/phone/application trail), and `profile.json`. |
| D2 | `src/llm/cover_letter.js:85` | Gemini API key is passed in the **URL query string** — leaks into proxies/logs/tools. Should be an `x-goog-api-key` header. |
| D3 | `src/browser/chrome_launcher.js:16-20` | CDP attach (default, option 1) drives the user's **personal active Chrome**, picks `contexts()[0]`, no isolation from human use. |
| D4 | `run.js:44` | Apply-button selector includes the broad `button:has-text("Apply")` — can match unrelated controls (e.g., "Apply filters"). |
| D5 | `src/browser/chrome_launcher.js`, `run.js:99` | `--no-sandbox` / `--disable-dev-shm-usage` are Linux-CI flags, unneeded (though harmless) on macOS. Always `headless:false` even in dry-run. |
| D6 | — | No captcha, one-time-PIN, or bot-wall detection anywhere. Combined with A1/A2, these produce silent false-SUBMITTED records. |
| D7 | `run.js:92-149` | `while (true)` daemon has no supervisor: browser crash → loop error-spams the queue forever and never relaunches. Only `processJob` is try/caught. No consecutive-failure cap. |

---

## Part 2: Improvements

### Speed

| # | Area | Proposal |
|---|------|----------|
| S1 | Waits | Replace ~14 hardcoded `page.waitForTimeout(...)` calls (3s/2s/600ms/400ms…) with `locator.waitFor({state:'visible'})` / `waitForLoadState('networkidle')` / `waitForSelector`. Keep a small randomized "humanization" delay (~0.5-1s) instead. Saves ~30-45s per application. |
| S2 | Discovery | Parallelize the 50 company-board fetches with `Promise.all` + a concurrency cap (~10). Adds `ETag`/`If-Modified-Since` or short TTL caching per board. 15-30s cycle → ~3s. |
| S3 | Freshness | Before navigating to a queued posting, pre-check the jid against the ATS API (or cheap HEAD) so expired postings (the Coursera `...` case) never enter the apply path. |

### Robustness

| # | Area | Proposal |
|---|------|----------|
| R1 | Submission verification | Mark `SUBMITTED` only after URL change **and** confirmation selector **and** post-submit screenshot; otherwise record `FAILED` with the error class. Applies to all three ATS handlers + the generic path. |
| R2 | Atomic storage | Write via temp file + `rename()`, keep a `.bak` on parse failure, add schema version + migration path. History must survive crashes (A5/A6). |
| R3 | Network layer | Timeout on every fetch (`AbortSignal.timeout`), one retry with backoff, per-source failure logging, circuit-breaker so a dead feed can't stall the daemon (B5). |
| R4 | Fail-stop preconditions | Resume missing → **abort the application** for that job (never submit resume-less). Add a required-field completeness sweep before submit (A3). |
| R5 | Recovery envelope | Relaunch the browser after N consecutive failures; health-check the page between jobs; escalating cooldown on repeated errors; fresh context (or at least page reset) per application to kill cross-job form state (D7, C2 prev). |

### Performance / Scale

| # | Area | Proposal |
|---|------|----------|
| P1 | Storage | Load `db.json` once and flush on write (or move to SQLite — zero deps, atomic, indexed). Eliminates block-event-loop + O(n) reads (C7). |
| P2 | Screenshots | Capture only on genuine success/failure (pre-submit shot for audit), add retention (e.g., keep last 200 / 30 days) (C8). |
| P3 | Scheduling | Replace `while(true)` + sleep with a cron/launchd wrapper or `node-cron`: crash-proof, observable, scheduled instead of 45-min polls (D7). |

### Expanded Capabilities

| # | Area | Proposal |
|---|------|----------|
| E1 | Workday | Real Workday adapter — `config/filters.json` already lists `myworkdayjobs.com` as supported but no handler exists (A4/B3). |
| E2 | Filters → reality | Implement the config that already exists: `maxAgeDays` (≤14), salary floor ($130k), country whitelist, remote-only. Protects the daily application budget from wasted attempts (B3). |
| E3 | Discovery breadth | Add Greenhouse/Lever/Ashby **search** APIs (keyword-based), expand company list (Built In, YC Work at a Startup, Wellfound), and dedupe **cross-source** (same role via RemoteOK + direct board = different URLs = duplicate apply risk). |
| E4 | LLM done right | Import `dotenv`/`dotenv/config` once in `run.js`; move key to `x-goog-api-key` header; upgrade to `gemini-2.5-flash` aligned with portfolio chat; add a no-hallucination validation pass on output (B2/D2). |
| E5 | Outcome tracking | Parse post-application responses and later emails for callback/rejection signals; persist job description + parsed posting metadata per application; weekly digest/stats dashboard. |
| E6 | Human-in-the-loop | Optional review queue ("approve these N before auto-send") — safer for candidate reputation, catches ATS drift before it wastes budget. |
| E7 | Per-company positioning | Wire the existing AI / Design-Systems / Generalist detection (cover_letter.js:34-44) into real LLM calls; per-board notes from `company_boards.json`. |
| E8 | Anti-bot awareness | Detect captcha / PIN / bot-wall and either solve-aware-handoff or mark the job as `MANUAL_REVIEW` rather than attempting a blind submit (D6). |

---

## Remediation Roadmap

### P0 — Do before any further live run
1. **A1/A2/R1** — Verify submissions (confirmation + URL check) before recording `SUBMITTED`.
2. **A3/R4** — Fail-stop if resume is missing; never submit resume-less.
3. **A4/E1** — Remove the blind generic fallback; skip unsupported ATS (or build real adapters). Remove `myworkdayjobs.com` from supported list until built.
4. **B2/E4** — Fix env loading so the LLM path actually runs (or intentionally ship template-only).
5. **A5/A6/R2/P1** — Atomic + backup db writes so history can never be silently destroyed.

### P1 — Next release
6. **B1** — Correct company extraction (use board/feed metadata, not `title.split`).
7. **B3/E2** — Enforce the existing filters (age, salary, country, remote).
8. **B5/R3** — Timeouts, retries, and failure logging on all network calls.
9. **B6** — Test isolation: use a temp DB or reset after; real assertions; awaited run.
10. **D1** — Add `job-agent/` (except resume placeholder) to `.gitignore` or move secrets/cookies out of the repo tree.
11. **B7/C2** — Fix the location regex (word-boundary `/remote|anywhere|\bUS\b|united states|canada/i`); log discovery skips.

### P2 — Quality of life
12. **D2** — API key header.
13. **D3/D4/D5** — Safer browser attach (isolated profile first), stricter apply selectors, configurable headless.
14. **C1** — Single source of truth for caps (README → generate from config or vice versa).
15. **C3/C4/C5** — Fix typos, unify types, live-posting pre-checks.
16. **S1/S2/S3** — Speed pass.
17. **D6/D7/E3-E8** — Anti-bot, supervisor, discovery breadth, outcome tracking, HITL queue.

---

## Appendix: Evidence from Runtime State (2026-09-18)

```
screenshots/                    57 files  (Sep 17 08:02 → Sep 18 23:40)
db.json applications             9 records
db.json tokenUsage.tokensUsed    18,900  (= 54 × 350 template estimate — LLM never fired)
db.json dailyCounts              2026-09-18: 1  (the sole "SUBMITTED" = Lyft via careerpuck.com)
```

Recorded application outcomes:
| Title | URL domain | Status |
|---|---|---|
| Page not found (×3) | job-boards.greenhouse.io/coursera | FAILED — stale/malformed jids |
| Lyft Operations Technology Product Designer | app.careerpuck.com (3rd-party board) | SUBMITTED — unverifiable |
| Remote … HighLevel / Flint (×2) | remoteOK.com listing pages | FAILED — generic handler on listing page |
| Staff Product Designer | brex.com/careers | FAILED — not a form |
| Senior Product Designer II | instacart.careers/job/ | FAILED |
| Product Designer — Dashboard | stripe.com/jobs/search | FAILED |

**Interpretation:** 7 of 9 recorded attempts failed exactly as predicted by A4 (non-ATS URLs → Greenhouse handler). The single "SUBMITTED" cannot be confirmed per A1/A2. Token accounting proves the template-only path ran ~54 times (B2).
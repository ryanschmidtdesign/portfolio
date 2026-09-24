# Autonomous Job Application Agent

Autonomous Chrome agent designed to find and apply to matching mid-to-senior UX and Product Design roles 24/7 across direct company ATS portals.

## Features
- **Targeting**: Filters for UX Designer, Product Designer, Senior Product Designer, and AI Designer roles. Avoids internships, principal, director, and volunteer positions.
- **ATS Specialization**: Handles Greenhouse (`boards.greenhouse.io`), Lever (`jobs.lever.co`), and Ashby (`jobs.ashbyhq.com`).
- **Grounded Tailored Cover Letters**: Adapts based on the role (AI, Design Systems, General Product UX) using strictly verified facts from Ryan Schmidt's resume (i4cp, D-Tools, Scrimba, Memorisely, Clarion, code prototyping). Zero hallucinations.
- **Safety Caps**:
  - **15 Applications / Day**: Automatically throttles and rests when the limit is reached.
  - **75% Weekly Token Budget Cap**: Monitored on every run to prevent unexpected token overages.
  - **Pre-submission Screenshots**: Stored in `job-agent/screenshots/` for auditability.

---

## Directory Structure
- `config/profile.json` — Master candidate data, links, verified metrics, work history, and EEO defaults.
- `config/filters.json` — Search keywords, exclusions, allowed remote regions, and age limit (<=14 days).
- `config/limits.json` — Daily cap (15) and weekly token budget (500,000).
- `resumes/` — Place your PDF resume here as `Ryan_Schmidt_Resume.pdf`.
- `screenshots/` — Auto-saved full-page verification screenshots of applications.
- `src/storage/db.json` — Persistent log of applied jobs, daily counts, and weekly token tracking.

---

## Setup & Running

1. **Install Dependencies**:
   ```bash
   cd "Portfolio Dev/job-agent"
   npm install
   ```

2. **Add Your Resume**:
   Copy your PDF resume into the `job-agent/resumes/` folder and name it:
   ```bash
   Ryan_Schmidt_Resume.pdf
   ```

3. **Run in Dry-Run Mode (Safe Test)**:
   Fills the form and uploads your resume, but stops short of clicking the final submit button.
   ```bash
   npm run dry-run
   ```

4. **Run Live Daemon (24/7 Mode)**:
   ```bash
   npm start
   ```

### Connecting to Your Existing Chrome Profile
If you want the agent to use your active Google Chrome browser (retaining any existing logins/cookies):
1. Start Google Chrome from the terminal with remote debugging enabled:
   ```bash
   /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222
   ```
2. Start the agent (`npm start`). The agent will detect port 9222 and attach directly. If not running, it will automatically fall back to its dedicated persistent profile.

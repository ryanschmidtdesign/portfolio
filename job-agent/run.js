import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './src/storage/db.js';
import { launchBrowser } from './src/browser/chrome_launcher.js';
import { discoverJobs } from './src/scraper/job_discovery.js';
import { generateCoverLetter } from './src/llm/cover_letter.js';
import { generateTailoredResumePdf } from './src/llm/resume_tailor.js';
import { detectAndSolveCaptchas } from './src/browser/captcha_solver.js';
import { attemptVisualRecovery } from './src/vision/form_inspector.js';
import { applyGreenhouse } from './src/ats/greenhouse.js';
import { applyLever } from './src/ats/lever.js';
import { applyAshby } from './src/ats/ashby.js';
import { applyWorkday } from './src/ats/workday.js';
import { applyRippling } from './src/ats/rippling.js';
import { detectAtsKind } from './src/ats/submission_verification.js';
import { isRetryableNavigationError, retryPageNavigation } from './src/browser/navigation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const profile = JSON.parse(fs.readFileSync(path.join(__dirname, 'config/profile.json'), 'utf-8'));
const filters = JSON.parse(fs.readFileSync(path.join(__dirname, 'config/filters.json'), 'utf-8'));
const limits = JSON.parse(fs.readFileSync(path.join(__dirname, 'config/limits.json'), 'utf-8'));

const isDryRun = process.argv.includes('--dry-run');
const resumePath = path.join(__dirname, 'resumes/Ryan_Schmidt_Resume.pdf');

function extractCompany(job, pageTitle) {
  if (job.company && job.company !== 'Hiring') {
    return job.company;
  }
  // Try extracting from URL domain
  try {
    const parsed = new URL(job.url);
    if (parsed.hostname.includes('greenhouse.io')) {
      const match = parsed.pathname.match(/\/boards\/([^\/]+)/) || parsed.search.match(/gh_jid=/);
      const hostParts = parsed.hostname.split('.');
      if (hostParts[0] && hostParts[0] !== 'boards' && hostParts[0] !== 'job-boards') {
        return hostParts[0].charAt(0).toUpperCase() + hostParts[0].slice(1);
      }
    }
    if (parsed.hostname.includes('lever.co')) {
      const parts = parsed.pathname.split('/').filter(Boolean);
      if (parts[0]) return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    }
    if (parsed.hostname.includes('ashbyhq.com')) {
      const parts = parsed.pathname.split('/').filter(Boolean);
      if (parts[0]) return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    }
  } catch (_) {}

  // Fallback to title heuristic if formatted like "Company - Role" or "Role at Company"
  if (pageTitle.includes(' at ')) {
    return pageTitle.split(' at ')[1].split(/[-–|]/)[0].trim();
  }
  const parts = pageTitle.split(/[-–|]/);
  if (parts.length > 1) {
    // If the second part looks like a company name
    return parts[parts.length - 1].trim();
  }
  return 'Hiring';
}

function jitterDelayMs(minMs, maxMs) {
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

function buildApplicationReport({ title, url, status, atsType, failureReason, screenshot, debugSummary = null }) {
  return {
    title,
    url,
    status,
    atsType,
    failureReason,
    screenshot,
    debugSummary,
    recordedAt: new Date().toISOString()
  };
}

async function processJob(page, job) {
  const originalPage = page;
  console.log(`\n-----------------------------------------`);
  console.log(`[Agent] Inspecting: ${job.url}`);

  try {
    await retryPageNavigation(page, job.url, { waitUntil: 'domcontentloaded', timeout: 30000 }, 2);
  } catch (err) {
    if (isRetryableNavigationError(err)) {
      console.warn(`[Agent] Navigation retry exhausted for ${job.url}: ${err.message}`);
      db.recordApplication({ title: job.title || 'Unknown role', url: job.url, status: 'FAILED_NAVIGATION_RETRY', screenshot: '', failureReason: err.message }, true);
      return false;
    }
    throw err;
  }
  await page.waitForTimeout(3000);

  // Dismiss common cookie banners to prevent element interception
  try {
    const cookieButtons = await page.$$('button:has-text("Accept"), button:has-text("Accept All"), button:has-text("Allow"), button:has-text("Got it"), button:has-text("Agree")');
    for (const btn of cookieButtons) {
      if (await btn.isVisible().catch(() => false)) {
        console.log(`[Agent] Dismissing cookie banner...`);
        await btn.click().catch(() => {});
        await page.waitForTimeout(500);
      }
    }
  } catch (e) {}

  // Extract page title & basic job description
  const title = await page.title();
  const bodyText = await page.innerText('body').catch(() => '');

  // Check exclusion keywords in title (e.g. Principal, Director, Intern)
  const isExcluded = filters.excludedTitles.some(ex => 
    new RegExp(`\\b${ex}\\b`, 'i').test(title)
  );

  if (isExcluded) {
    console.log(`[Agent] Skipping "${title}" due to excluded seniority keyword.`);
    return false;
  }

  
  // Check excluded industries in body text or title
  if (filters.excludedIndustries && filters.excludedIndustries.length > 0) {
    const isExcludedIndustry = filters.excludedIndustries.some(ex => 
      new RegExp(`\\b${ex}\\b`, 'i').test(title) || new RegExp(`\\b${ex}\\b`, 'i').test(bodyText)
    );
    if (isExcludedIndustry) {
      console.log(`[Agent] Skipping "${title}" due to excluded industry keyword.`);
      return false;
    }
  }

  
  
  const company = extractCompany(job, title);

  // Check excluded companies
  if (filters.excludedCompanies && filters.excludedCompanies.length > 0) {
    const isExcludedCompany = filters.excludedCompanies.some(ex => 
      new RegExp(`\\b${ex}\\b`, 'i').test(company) || new RegExp(`\\b${ex}\\b`, 'i').test(title)
    );
    if (isExcludedCompany) {
      console.log(`[Agent] Skipping "${title}" because company is excluded.`);
      return false;
    }
  }

  // Check if we've already applied to another role at this company recently
  if (company && typeof db.hasAppliedToCompany === 'function' && db.hasAppliedToCompany(company)) {
    console.log(`[Agent] Skipping "${title}" to avoid duplicate applications to ${company}.`);
    return false;
  }




  const lowerBody = bodyText.toLowerCase();

  // Experience constraint: 10+ years
  const expMatch = lowerBody.match(/(\d+)\s*(?:\+|to\s*\d+)?\s*years?(?:\s+of)?\s+(?:work|professional|design)?\s*experience/i);
  if (expMatch && parseInt(expMatch[1], 10) >= 10) {
    console.log(`[Agent] Skipping "${title}" because it requires ${expMatch[1]}+ years of experience.`);
    return false;
  }

  // Salary constraint: under $90k (allow unlisted)
  const salaryRegex = /\$(\d{2,3})(?:,?\d{3}|k)\b/gi;
  let matches;
  let maxSalary = 0;
  let foundSalary = false;
  
  while ((matches = salaryRegex.exec(lowerBody)) !== null) {
    const rawMatch = matches[0].toLowerCase();
    let val = parseInt(rawMatch.replace(/[^\d]/g, ''), 10);
    if (rawMatch.includes('k')) {
      val *= 1000;
    } else if (val >= 30 && val <= 500 && !rawMatch.includes(',')) {
      val *= 1000; 
    }
    if (val >= 30000 && val <= 500000) {
      foundSalary = true;
      if (val > maxSalary) {
        maxSalary = val;
      }
    }
  }

  if (foundSalary && maxSalary < 90000) {
    console.log(`[Agent] Skipping "${title}" because maximum stated salary ($${maxSalary}) is under $90,000.`);
    return false;
  }

  // If the page has an "Apply" button that opens or scrolls to the application form
  const applyButtons = await page.$$('a:has-text("Apply now"), a:has-text("Apply for this job"), button:has-text("Apply now"), button:has-text("Apply for this job"), button:has-text("Apply"), a[href*="#apply"], a[href*="application"]');
  let clickedApply = false;
  if (!await page.$('input[type="file"], input[type="email"], input[name*="first_name" i]')) {
    for (const btn of applyButtons) {
      if (await btn.isVisible()) {
        console.log(`[Agent] Clicking initial Apply button to open application form...`);
        const pagePromise = page.context().waitForEvent('page', { timeout: 4000 }).catch(() => null);
        await btn.click().catch(() => {});
        clickedApply = true;
        const newPage = await pagePromise;
        if (newPage) {
          console.log(`[Agent] Apply button opened a new tab: ${newPage.url()}`);
          await newPage.waitForLoadState('domcontentloaded');
          page = newPage;
        } else {
          await page.waitForTimeout(3000);
        }
        break; // Only click the first visible one
      }
    }
  }

  let activeContext = page;
  
  const applyBtn = await page.$('a:has-text("Apply"), button:has-text("Apply")');
  if (applyBtn) {
    await applyBtn.click({ force: true, timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(1000);
  }

  // Robust iframe polling for embedded ATS forms (e.g., Greenhouse on Squarespace/Step)
  for (let attempt = 0; attempt < 5; attempt++) {
    for (const frame of page.frames()) {
      try {
        const hasForm = await frame.$('input[type="file"], input[type="email"], input[name*="first_name" i]').catch(() => null);
        if (hasForm && frame !== page.mainFrame()) {
          activeContext = frame;
          break;
        }
      } catch (e) {}
    }
    if (activeContext !== page) break;
    await page.waitForTimeout(1000); // Wait 1s and try again
  }


  // Wait for the form to render (React/SPAs) before probing
  await activeContext.waitForSelector('input, textarea, select', { state: 'attached', timeout: 8000 }).catch(() => {});
  await activeContext.waitForTimeout(1000); // Give it an extra second to hydrate

  // Strict ATS routing: use DOM probing to identify embedded forms on custom domains
  const formFields = await activeContext.$$eval('input, textarea, select', els => els.map(el => el.name || el.id || el.getAttribute('aria-label') || el.placeholder || '').filter(Boolean)).catch(() => []);
  const atsKind = detectAtsKind({
    url: job.url || page.url(),
    pageText: title + ' ' + bodyText,
    formFields
  });

  if (!atsKind) {
    console.log(`[Agent] Unsupported ATS or no form detected for ${job.url}. Skipping.`);
    return false;
  }

  console.log(`[Agent] Generating tailored cover letter and resume PDF in parallel...`);
  
  const coverLetterPromise = generateCoverLetter({
    jobTitle: title.split(/[-–|]/)[0].trim() || title,
    company: company,
    jobDescription: bodyText.slice(0, 2000)
  });
  
  const resumePromise = generateTailoredResumePdf({
    jobTitle: title,
    company: company,
    jobDescription: bodyText
  }).catch(err => {
    console.warn('[Agent] Falling back to default static resume PDF:', err.message);
    return resumePath;
  });

  const [coverLetter, tailoredResumePath] = await Promise.all([coverLetterPromise, resumePromise]);

  const report = {
    title,
    url: job.url,
    status: 'STARTED',
    atsType: atsKind,
    failureReason: null,
    screenshot: '',
    debugSummary: null
  };

  // Pre-emptive captcha check
  await detectAndSolveCaptchas(page).catch(() => {});

  let result = { success: false, submitted: false };

  if (atsKind === 'greenhouse' || page.url().includes('greenhouse.io') || page.url().includes('gh_jid')) {
    result = await applyGreenhouse(activeContext, profile, coverLetter, tailoredResumePath, isDryRun, page);
  } else if (atsKind === 'lever' || page.url().includes('lever.co')) {
    result = await applyLever(activeContext, profile, coverLetter, tailoredResumePath, isDryRun, page);
  } else if (atsKind === 'ashby' || page.url().includes('ashbyhq.com')) {
    result = await applyAshby(activeContext, profile, coverLetter, tailoredResumePath, isDryRun, page);
  } else if (atsKind === 'workday' || page.url().includes('myworkdayjobs.com') || page.url().includes('workday')) {
    result = await applyWorkday(page, profile, coverLetter, tailoredResumePath, isDryRun);
  } else if (atsKind === 'rippling' || page.url().includes('rippling.com')) {
    result = await applyRippling(page, profile, coverLetter, tailoredResumePath, isDryRun);
  }

  // Visual recovery fallback if submission failed due to unfulfilled field or missing button
  if (!result.submitted && !isDryRun) {
    console.log('[Agent] Submission unverified. Invoking Vision inspector for autonomous recovery...');
    const recovered = await attemptVisualRecovery(page, result.error || 'Form validation error or submit button not clicked');
    if (recovered) {
      console.log('[Agent] Vision recovery applied action. Waiting 3s to re-verify submission state...');
      await page.waitForTimeout(3000);
      await detectAndSolveCaptchas(page).catch(() => {});
      
      // Attempt to click submit again if still on page
      const submitBtn = await page.$('button[type="submit"], #submit_app, button:has-text("Submit"), button:has-text("Apply")').catch(()=>null);
      if (submitBtn && await submitBtn.isVisible().catch(()=>false)) {
        await submitBtn.click({ force: true }).catch(()=>{});
        await page.waitForTimeout(3000);
      }
      
      const { detectSubmissionConfirmation, summarizeSubmissionState } = await import('./src/ats/submission_verification.js');
      const pageText = await page.innerText('body').catch(()=>'');
      const finalState = summarizeSubmissionState({ pageText, url: page.url() });
      if (detectSubmissionConfirmation(finalState)) {
        console.log('[Agent] Vision recovery SUCCESS! Application confirmed.');
        result.submitted = true;
        result.error = null;
      } else {
        console.warn('[Agent] Vision recovery failed to force submission.');
      }
    }
  }

  // Take screenshot for audit trail
  const screenshotName = `app_${Date.now()}.png`;
  const screenshotPath = path.join(__dirname, 'screenshots', screenshotName);
  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
  console.log(`[Agent] Verification screenshot saved: ${screenshotPath}`);

  report.screenshot = screenshotPath;
  report.status = isDryRun ? 'DRY_RUN_COMPLETED' : (result.submitted ? 'SUBMITTED' : 'FAILED');
  if (!result.submitted && result.error) {
    report.failureReason = result.error;
    console.warn(`[Agent] Application was not submitted: ${result.error}`);
  }
  if (result.debug) {
    report.debugSummary = result.debug;
  }

  // Record in database
  db.recordApplication(buildApplicationReport(report), isDryRun);

  // Auto-generate beautiful HTML dashboard
  try {
    const { execSync } = await import('child_process');
    execSync('node generate_dashboard.js', { cwd: __dirname });
  } catch (err) {}

  if (page !== originalPage && !page.isClosed()) {
      await page.close().catch(()=>{});
  }

  return result.success;
}

async function runDaemon() {
  console.log(`====================================================`);
  console.log(`🤖 Job Application Agent Initialized`);
  console.log(`Mode: ${isDryRun ? 'DRY RUN (No Submissions)' : 'FULL AUTONOMY'}`);
  console.log(`Daily Limit: ${limits.maxDailyApplications} applications/day`);
  console.log(`====================================================`);

  const { context } = await launchBrowser({ headless: false });
  const page = await context.newPage();

  // Cleanup old screenshots (older than 7 days) to prevent disk space exhaustion
  const screenshotsDir = path.join(__dirname, 'screenshots');
  if (fs.existsSync(screenshotsDir)) {
    const files = fs.readdirSync(screenshotsDir);
    const now = Date.now();
    let deletedCount = 0;
    for (const file of files) {
      if (!file.endsWith('.png')) continue;
      const filePath = path.join(screenshotsDir, file);
      const stat = fs.statSync(filePath);
      if (now - stat.mtimeMs > 3 * 24 * 60 * 60 * 1000) {
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    }
    if (deletedCount > 0) {
      console.log(`[Agent] Cleaned up ${deletedCount} old screenshots.`);
    }
  }

  while (true) {
    const todayCount = db.getTodayApplicationCount();
    const tokenStatus = db.getTokenStatus(limits.weeklyTokenBudget);

    console.log(`\n[Status] Today's Submissions: ${todayCount}/${limits.maxDailyApplications}`);
    console.log(`[Status] Weekly Token Usage: ${(tokenStatus.usageRatio * 100).toFixed(1)}%`);

    if (todayCount >= limits.maxDailyApplications) {
      console.log(`[Limit Reached] Maximum daily applications reached (${limits.maxDailyApplications}). Resting until tomorrow.`);
      await new Promise(r => setTimeout(r, 1000 * 60 * 60)); // Sleep 1 hour
      continue;
    }

    if (tokenStatus.isCapped) {
      console.warn(`[Token Limit] Reached 75% weekly token budget limit. Pausing operations.`);
      await new Promise(r => setTimeout(r, 1000 * 60 * 60)); // Sleep 1 hour
      continue;
    }

    const jobQueue = await discoverJobs(page, filters);
    console.log(`[Agent] ${jobQueue.length} jobs in queue.`);

    for (const job of jobQueue) {
      if (!db.canApplyToday(limits.maxDailyApplications)) break;
      if (db.getTokenStatus(limits.weeklyTokenBudget).isCapped) break;

      try {
        if (page.isClosed()) {
          const pages = context.pages();
          page = pages.length > 0 ? pages[pages.length - 1] : await context.newPage();
        }
        await processJob(page, job);
      } catch (err) {
        console.error(`[Agent] Error processing job ${job.url}:`, err.message);
      }

      // Human-like delay between applications
      const delay = jitterDelayMs(limits.delayBetweenActionsMs.min, limits.delayBetweenActionsMs.max);
      console.log(`[Agent] Resting for ${(delay / 1000).toFixed(1)}s before next application...`);
      await new Promise(r => setTimeout(r, delay));
    }

    // Sleep 45 minutes between discovery cycles
    console.log(`[Agent] Discovery cycle completed. Sleeping 45 minutes...`);
    await new Promise(r => setTimeout(r, 1000 * 60 * 45));
  }
}

runDaemon().catch(err => {
  console.error(`Fatal agent error:`, err);
  process.exit(1);
});

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import { applyGreenhouse } from './src/ats/greenhouse.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const profile = JSON.parse(fs.readFileSync(path.join(__dirname, 'config/profile.json'), 'utf-8'));
const resumePath = path.join(__dirname, 'resumes/Ryan_Schmidt_Resume.pdf');
const testUrl = process.argv[2] || 'https://job-boards.greenhouse.io/affirm/jobs/7990774003';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(4000);

  let activeContext = page;
  for (const frame of page.frames()) {
    const hasForm = await frame.$('input[type="file"], input[type="email"], input[name*="first_name" i]').catch(() => null);
    if (hasForm && frame !== page.mainFrame()) {
      activeContext = frame;
      break;
    }
  }

  const result = await applyGreenhouse(activeContext, profile, 'Test cover letter.', resumePath, false, page);
  console.log('Result:', JSON.stringify(result));
  await browser.close();
})();

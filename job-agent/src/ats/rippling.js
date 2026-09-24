import fs from 'fs';
import { buildUnverifiedSubmissionError, detectSubmissionConfirmation, summarizeSubmissionState } from './submission_verification.js';

export async function applyRippling(page, profile, coverLetterText, resumePdfPath, dryRun = false) {
  console.log('[Rippling] Filling application...');

  const fill = async (selector, value) => {
    const el = await page.$(selector).catch(() => null);
    if (!el) return;
    const current = await el.inputValue().catch(() => '');
    if (current && current.trim()) return;
    await el.fill(value).catch(() => {});
  };

  await fill('input[name*="first_name" i], input[id*="first_name" i], input[placeholder*="First Name" i]', profile.personal.firstName);
  await fill('input[name*="last_name" i], input[id*="last_name" i], input[placeholder*="Last Name" i]', profile.personal.lastName);
  await fill('input[name*="email" i], input[type="email"], input[placeholder*="Email" i]', profile.personal.email);
  await fill('input[name*="phone" i], input[type="tel"], input[placeholder*="Phone" i]', profile.personal.phone);

  if (!resumePdfPath || !fs.existsSync(resumePdfPath)) {
    console.error(`[Rippling] Resume PDF not found at ${resumePdfPath}. Aborting application.`);
    return { success: false, submitted: false, error: 'Resume PDF missing' };
  }

  const resumeUpload = await page.$('input[type="file"]');
  if (resumeUpload) {
    await resumeUpload.setInputFiles(resumePdfPath).catch(() => {});
  }

  const textArea = await page.$('textarea');
  if (textArea && coverLetterText) {
    const current = await textArea.inputValue().catch(() => '');
    if (!current.trim()) await textArea.fill(coverLetterText).catch(() => {});
  }

  if (dryRun) {
    console.log('[Rippling] [DRY RUN] Fields filled. Skipping submission.');
    return { success: true, submitted: false };
  }

  const submitBtn = await page.$('button[type="submit"], button:has-text("Submit"), button:has-text("Apply")');
  if (!submitBtn) return { success: false, error: 'Submit button not found' };

  const initialUrl = page.url();
  await submitBtn.click();

  for (let i = 0; i < 15; i++) {
    await page.waitForTimeout(1500);
    const text = await page.innerText('body').catch(() => '');
    const isConfirmed = detectSubmissionConfirmation({ pageText: text, url: page.url(), initialUrl });
    if (isConfirmed) {
      return { success: true, submitted: true };
    }
    const hasError = await page.$('[aria-invalid="true"], .error, .field-error').catch(() => null);
    if (hasError) {
      const msg = await page.evaluate(el => (el.innerText || '').trim(), hasError).catch(() => 'Validation error');
      return { success: false, submitted: false, error: msg || 'Validation error' };
    }
  }

  const finalText = await page.innerText('body').catch(() => '');
  const finalState = summarizeSubmissionState({ pageText: finalText, url: page.url(), initialUrl });
  const explicitError = buildUnverifiedSubmissionError({ pageText: finalText, url: page.url(), initialUrl });
  console.warn(`[Rippling] ${explicitError} Last URL: ${finalState.urlSnippet || 'n/a'} | Last text: ${finalState.textSnippet || 'n/a'}`);
  return { success: false, submitted: false, error: explicitError };
}

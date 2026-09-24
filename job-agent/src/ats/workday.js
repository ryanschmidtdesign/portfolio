import fs from 'fs';
import { buildUnverifiedSubmissionError, detectSubmissionConfirmation, summarizeSubmissionState } from './submission_verification.js';

export async function applyWorkday(page, profile, coverLetterText, resumePdfPath, dryRun = false) {
  console.log('[Workday] Filling application...');

  const fill = async (selector, value) => {
    const el = await page.$(selector).catch(() => null);
    if (!el) return;
    const current = await el.inputValue().catch(() => '');
    if (current && current.trim()) return;
    await el.fill(value).catch(() => {});
  };

  await fill('input#firstName, input[name*="firstName" i], input[aria-label*="first name" i]', profile.personal.firstName);
  await fill('input#lastName, input[name*="lastName" i], input[aria-label*="last name" i]', profile.personal.lastName);
  await fill('input#emailAddress, input[name*="email" i], input[aria-label*="email" i]', profile.personal.email);
  await fill('input#phone, input[name*="phone" i], input[aria-label*="phone" i]', profile.personal.phone);

  const resumeUpload = await page.$('input[type="file"]');
  if (!resumePdfPath || !fs.existsSync(resumePdfPath)) {
    console.error(`[Workday] Resume PDF not found at ${resumePdfPath}. Aborting application.`);
    return { success: false, submitted: false, error: 'Resume PDF missing' };
  }
  if (resumeUpload) {
    await resumeUpload.setInputFiles(resumePdfPath).catch(() => {});
  }

  const comments = await page.$('textarea, textarea[aria-label*="cover" i]');
  if (comments && coverLetterText) {
    const current = await comments.inputValue().catch(() => '');
    if (!current.trim()) await comments.fill(coverLetterText).catch(() => {});
  }

  if (dryRun) {
    console.log('[Workday] [DRY RUN] Fields filled. Skipping submission.');
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
  console.warn(`[Workday] ${explicitError} Last URL: ${finalState.urlSnippet || 'n/a'} | Last text: ${finalState.textSnippet || 'n/a'}`);
  return { success: false, submitted: false, error: explicitError };
}

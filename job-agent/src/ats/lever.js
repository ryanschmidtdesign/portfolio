import { generateDynamicFieldAnswer } from "../llm/field_answer.js";

import fs from 'fs';
import { buildUnverifiedSubmissionError, detectSubmissionConfirmation, summarizeSubmissionState } from './submission_verification.js';

/**
 * Lever ATS Form Handler (jobs.lever.co)
 */
export async function applyLever(page, profile, coverLetterText, resumePdfPath, dryRun = false) {
  console.log(`[Lever] Filling application...`);

  // Ensure on application form
  const applyBtn = await page.$('a.postings-btn:has-text("Apply for this job"), a:has-text("Apply")');
  if (applyBtn) {
    await applyBtn.click();
    await page.waitForTimeout(1500);
  }

  // Full Name
  const nameInput = await page.$('input[name="name"], input[name*="name" i], input[placeholder*="name" i]');
  if (nameInput) await nameInput.fill(profile.personal.name);

  // Email
  const emailInput = await page.$('input[name="email"], input[type="email"], input[name*="email" i]');
  if (emailInput) await emailInput.fill(profile.personal.email);

  // Phone
  const phoneInput = await page.$('input[name="phone"]');
  if (phoneInput) await phoneInput.fill(profile.personal.phone);

  // Current company
  const companyInput = await page.$('input[name="org"]');
  if (companyInput) await companyInput.fill(profile.experience[0].company);

  // URLs (LinkedIn, Portfolio, GitHub, Other)
  const linkedinInput = await page.$('input[name="urls[LinkedIn]"]');
  if (linkedinInput) await linkedinInput.fill(profile.personal.links.linkedin);

  const portfolioInput = await page.$('input[name="urls[Portfolio]"], input[name="urls[Other]"]');
  if (portfolioInput) await portfolioInput.fill(profile.personal.links.portfolio);

  const githubInput = await page.$('input[name="urls[GitHub]"]');
  if (githubInput) await githubInput.fill(profile.personal.links.github);

  // Resume upload (Fail-stop: do NOT submit without a resume)
  if (!resumePdfPath || !fs.existsSync(resumePdfPath)) {
    console.error(`[Lever] Resume PDF not found at ${resumePdfPath}. Aborting application.`);
    return { success: false, submitted: false, error: 'Resume PDF missing' };
  }

  const resumeUpload = await page.$('input[type="file"]#resume-upload-input, input[type="file"]');
  if (resumeUpload) {
    console.log(`[Lever] Uploading resume: ${resumePdfPath}`);
    await resumeUpload.setInputFiles(resumePdfPath);
    await page.waitForTimeout(1000);
  } else {
    console.warn(`[Lever] No resume upload input found.`);
  }

  // Additional Information / Cover letter
  const commentsInput = await page.$('textarea[name="comments"]');
  if (commentsInput && coverLetterText) {
    console.log(`[Lever] Injecting cover letter into comments.`);
    await commentsInput.fill(coverLetterText);
  }

  // Radios / Custom questions
  await fillLeverCustomQuestions(page, profile);

  if (dryRun) {
    console.log(`[Lever] [DRY RUN] Fields filled. Skipping submission.`);
    return { success: true, submitted: false };
  }

  // Submit button
  const submitBtn = await page.$('button#btn-submit, button[type="submit"]');
  if (submitBtn) {
    const initialUrl = page.url();
    console.log(`[Lever] Clicking submit button...`);
    await submitBtn.scrollIntoViewIfNeeded().catch(() => {});
    try {
      await submitBtn.click({ force: true, timeout: 5000 });
    } catch(e) {
      await submitBtn.evaluate(el => el.click()).catch(() => {});
    }

    let submitted = false;
    let finalErrorMsg = '';

    for (let i = 0; i < 15; i++) {
      await page.waitForTimeout(1500);

      const hasError = await page.$('.error:visible, [aria-invalid="true"]:visible, .error-message:visible, input:invalid, select:invalid, textarea:invalid').catch(() => null);
      if (hasError) {
        let errorMsg = await page.evaluate(el => el.innerText, hasError).catch(() => '');
        const isInput = await page.evaluate(el => ['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName), hasError).catch(() => false);
        if (errorMsg.trim() || isInput) {
          if (!errorMsg.trim() || isInput) {
            errorMsg = await page.evaluate(el => {
              let curr = el;
              let labelText = '';
              while (curr && curr !== document.body) {
                const lbl = curr.querySelector('label, legend, h3, h4');
                if (lbl && lbl.innerText) { labelText = lbl.innerText; break; }
                if (curr.previousElementSibling) {
                  if (/label|legend|h3|h4/i.test(curr.previousElementSibling.tagName)) {
                    labelText = curr.previousElementSibling.innerText; break;
                  }
                  if (!curr.previousElementSibling.querySelector('input:not([type="hidden"]), textarea, select, .select__control, [role="combobox"], [aria-haspopup="listbox"]')) {
                    const text = curr.previousElementSibling.innerText;
                    if (text && text.trim().length > 0 && text.length < 150) {
                      labelText = text; break;
                    }
                  }
                }
                curr = curr.parentElement;
              }
              return labelText ? `Missing or invalid field: ${labelText.trim()}` : 'Validation error on input';
            }, hasError).catch(() => 'Validation error');
          }
          finalErrorMsg = errorMsg || 'Validation error';
          break;
        }
      }

      let pageText = '';
      try {
        pageText = await page.innerText('body');
      } catch (e) {
        pageText = '';
      }

      const isConfirmed = detectSubmissionConfirmation({
        pageText,
        url: page.url(),
        initialUrl
      });
      const urlChanged = page.url() !== initialUrl && (page.url().includes('confirmation') || page.url().includes('thanks'));

      if (isConfirmed || urlChanged) {
        submitted = true;
        break;
      }
    }

    if (finalErrorMsg && !submitted) {
      console.warn(`[Lever] Form error detected after submit: ${finalErrorMsg}`);
      return { success: false, submitted: false, error: finalErrorMsg };
    }

    if (!submitted) {
      const finalText = await page.innerText('body').catch(() => '');
      const finalState = summarizeSubmissionState({
        pageText: finalText,
        url: page.url(),
        initialUrl
      });
      const explicitError = buildUnverifiedSubmissionError({ pageText: finalText, url: page.url(), initialUrl });
      console.warn(`[Lever] ${explicitError} Last URL: ${finalState.urlSnippet || 'n/a'} | Last text: ${finalState.textSnippet || 'n/a'}`);
      await page.waitForTimeout(3000);
      const finalRetry = summarizeSubmissionState({
        pageText: await page.innerText('body').catch(() => ''),
        url: page.url(),
        initialUrl
      });
      if (finalRetry.isConfirmed) {
        console.log(`[Lever] Final recheck confirmed submission.`);
        return { success: true, submitted: true };
      }
      return { success: false, submitted: false, error: explicitError };
    }

    return { success: submitted, submitted };
  }

  return { success: false, error: 'Submit button not found' };
}

async function fillLeverCustomQuestions(page, profile) {
  // Check authorization & sponsorship radios
  const radioInputs = await page.$$('input[type="radio"]');
  for (const radio of radioInputs) {
    const context = await page.evaluate(el => {
      const field = el.closest('.application-question, .custom-question, div');
      return field ? field.innerText.toLowerCase() : '';
    }, radio);

    const val = (await radio.getAttribute('value') || '').toLowerCase();

    if (/authorized to work|legally authorized/i.test(context) && (val === 'yes' || val === 'true')) {
      await radio.check().catch(() => {});
    } else if (/require sponsorship|visa sponsorship/i.test(context) && (val === 'no' || val === 'false')) {
      await radio.check().catch(() => {});
    }
  }

  // Check authorization & sponsorship dropdowns
  const selects = await page.$$('select');
  for (const select of selects) {
    const context = await page.evaluate(el => {
      const field = el.closest('.application-question, .custom-question, div');
      return field ? field.innerText.toLowerCase() : '';
    }, select);

    if (/authorized to work|legally authorized/i.test(context)) {
      await select.selectOption({ label: /Yes/i }).catch(() => {});
    } else if (/require sponsorship|visa sponsorship/i.test(context)) {
      await select.selectOption({ label: /No/i }).catch(() => {});
    } else if (/gender|sex/i.test(context)) {
      await select.selectOption({ label: /Male|Man/i }).catch(() => {});
    } else if (/race|hispanic/i.test(context)) {
      await select.selectOption({ label: /White|Caucasian|not hispanic/i }).catch(() => {});
    } else if (/veteran/i.test(context)) {
      await select.selectOption({ label: /Yes|protected veteran/i }).catch(() => {});
    } else if (/disability/i.test(context)) {
      await select.selectOption({ label: /No|do not have a disability/i }).catch(() => {});
    }
  }

  // Handle custom text inputs and textareas (e.g., location, salary, brief statement)
  const textInputs = await page.$$('input[type="text"], textarea');
  for (const input of textInputs) {
    const context = await page.evaluate(el => {
      let curr = el;
      let text = '';
      while (curr && curr !== document.body) {
         if (curr.innerText) { text = curr.innerText; break; }
         curr = curr.parentElement;
      }
      return text.toLowerCase();
    }, input);

    const currentVal = await input.inputValue().catch(()=>'');
    if (currentVal.trim()) continue;

    let handled = false;
    if (/location|city/i.test(context) && !/university/i.test(context)) {
      await input.fill(profile.personal.location?.city || 'Austin, TX').catch(()=>{}); handled = true;
    } else if (/most recently worked|current company/i.test(context)) {
      await input.fill(profile.experience?.[0]?.company || 'Consultant').catch(()=>{}); handled = true;
    } else if (/years of experience|years experience|how many years/i.test(context)) {
      await input.fill('6').catch(()=>{}); handled = true;
    } else if (/how did you hear/i.test(context)) {
      await input.fill('LinkedIn').catch(()=>{}); handled = true;
    } else if (/salary|compensation/i.test(context)) {
      await input.fill('$135,000').catch(()=>{}); handled = true;
    }

    if (!handled) {
      const isReq = /required|\*/i.test(context) || await input.evaluate(el => el.required || el.getAttribute('aria-required') === 'true').catch(()=>false);
      const aiAnswer = await generateDynamicFieldAnswer({ 
        question: context.slice(0, 300), 
        profile, 
        jobTitle: 'Product Designer', 
        company: 'Lever Company',
        isRequired: isReq
      });
      if (aiAnswer && aiAnswer.trim() !== 'SKIP') {
        console.log(`[Lever] AI generated answer for "${context.slice(0, 60)}...": ${aiAnswer}`);
        await input.fill(aiAnswer).catch(()=>{});
      }
    }
  }
}

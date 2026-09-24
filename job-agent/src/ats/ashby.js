import { generateDynamicFieldAnswer } from "../llm/field_answer.js";

import fs from 'fs';
import { buildUnverifiedSubmissionError, detectSubmissionConfirmation, summarizeSubmissionState } from './submission_verification.js';

/**
 * Ashby ATS Form Handler (jobs.ashbyhq.com)
 */
export async function applyAshby(page, profile, coverLetterText, resumePdfPath, dryRun = false) {
  console.log(`[Ashby] Filling application...`);

  // Name
  const nameInput = await page.$('input[name="name"], input[name*="name" i], input[placeholder*="Name" i], input[placeholder*="First and Last" i], input[aria-label*="Name" i]');
  if (nameInput) await nameInput.fill(profile.personal.name);

  // Email
  const emailInput = await page.$('input[name="email"], input[type="email"], input[name*="email" i], input[placeholder*="email" i], input[aria-label*="email" i]');
  if (emailInput) await emailInput.fill(profile.personal.email);

  // Phone
  const phoneInput = await page.$('input[name="phone"], input[type="tel"]');
  if (phoneInput) await phoneInput.fill(profile.personal.phone);

  // Resume (Fail-stop: do NOT submit without a resume)
  if (!resumePdfPath || !fs.existsSync(resumePdfPath)) {
    console.error(`[Ashby] Resume PDF not found at ${resumePdfPath}. Aborting application.`);
    return { success: false, submitted: false, error: 'Resume PDF missing' };
  }

  try {
    const fileInput = await page.$('input[type="file"]');
    if (fileInput) {
      console.log(`[Ashby] Uploading resume directly via input: ${resumePdfPath}`);
      await fileInput.setInputFiles(resumePdfPath);
      await page.waitForTimeout(2500);
    } else {
      console.warn(`[Ashby] No file input found, trying button click fallback...`);
      const attachBtn = await page.$('button:has-text("Upload"), button:has-text("Resume"), button:has-text("Choose File")');
      if (attachBtn && typeof page.waitForEvent === 'function') {
        const [fileChooser] = await Promise.all([
          page.waitForEvent('filechooser', { timeout: 5000 }).catch(() => null),
          attachBtn.click({ force: true }).catch(() => {})
        ]);
        if (fileChooser) {
          await fileChooser.setFiles(resumePdfPath);
          await page.waitForTimeout(2500);
        }
      }
    }
  } catch (e) {
    console.warn(`[Ashby] Resume upload failed: ${e.message}`);
  }

  // Links
  const linkInputs = await page.$$('input[placeholder*="http" i], input[name*="url" i], input[name*="link" i]');
  for (const input of linkInputs) {
    const val = await input.inputValue().catch(() => '');
    if (val) continue; // Do not clobber already filled values

    const parentText = await page.evaluate(el => {
      const p = el.closest('label, div');
      return p ? p.innerText.toLowerCase() : '';
    }, input);

    if (/linkedin/i.test(parentText)) {
      await input.fill(profile.personal.links.linkedin);
    } else if (/portfolio|website/i.test(parentText)) {
      await input.fill(profile.personal.links.portfolio);
    } else if (/github/i.test(parentText)) {
      await input.fill(profile.personal.links.github);
    }
  }

  // Additional Information / Cover letter
  const notesTextarea = await page.$('textarea');
  if (notesTextarea && coverLetterText) {
    const existingVal = await notesTextarea.inputValue().catch(() => '');
    if (!existingVal) {
      console.log(`[Ashby] Filling cover letter.`);
      await notesTextarea.fill(coverLetterText);
    }
  }

  // Handle all the custom Ashby questions (radios, selects, checkboxes, locations)
  await fillAshbyCustomQuestions(page, profile);

  if (dryRun) {
    console.log(`[Ashby] [DRY RUN] Fields filled. Skipping submission.`);
    return { success: true, submitted: false };
  }

  const submitBtn = await page.$('button[type="submit"]:has-text("Submit"), button:has-text("Submit Application")');
  if (submitBtn) {
    const initialUrl = page.url();
    console.log(`[Ashby] Clicking submit button...`);
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

      const hasError = await page.$('.error:visible, [aria-invalid="true"]:visible, div[class*="error"]:visible, input:invalid, select:invalid, textarea:invalid').catch(() => null);
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
      const urlChanged = page.url() !== initialUrl && (page.url().includes('confirmation') || page.url().includes('thanks') || page.url().includes('submitted'));

      if (isConfirmed || urlChanged) {
        submitted = true;
        break;
      }
    }

    if (finalErrorMsg && !submitted) {
      console.warn(`[Ashby] Form error detected after submit: ${finalErrorMsg}`);
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
      console.warn(`[Ashby] ${explicitError} Last URL: ${finalState.urlSnippet || 'n/a'} | Last text: ${finalState.textSnippet || 'n/a'}`);
      await page.waitForTimeout(3000);
      const finalRetry = summarizeSubmissionState({
        pageText: await page.innerText('body').catch(() => ''),
        url: page.url(),
        initialUrl
      });
      if (finalRetry.isConfirmed) {
        console.log(`[Ashby] Final recheck confirmed submission.`);
        return { success: true, submitted: true };
      }
      return { success: false, submitted: false, error: explicitError };
    }

    return { success: submitted, submitted };
  }

  return { success: false, error: 'Submit button not found' };
}

async function fillAshbyCustomQuestions(page, profile) {
  // Checkboxes (Consent / Terms / Privacy)
  const checkboxes = await page.$$('input[type="checkbox"]');
  for (const cb of checkboxes) {
    await page.evaluate(el => {
      if (!el.checked) {
        el.checked = true;
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('click', { bubbles: true }));
      }
    }, cb).catch(() => {});
    // also try playwright check
    await cb.check({ force: true }).catch(() => {});
  }

  // Radios (Yes/No questions)
  const radios = await page.$$('input[type="radio"]');
  for (const radio of radios) {
    const { context, labelText, val } = await page.evaluate(el => {
      let curr = el;
      let text = '';
      while (curr && curr !== document.body) {
         if (curr.innerText) { text = curr.innerText; break; }
         curr = curr.parentElement;
      }
      
      let lblText = '';
      const id = el.getAttribute('id');
      if (id) {
        const lbl = document.querySelector(`label[for="${id}"]`);
        if (lbl) lblText = lbl.innerText;
      }
      if (!lblText && el.parentElement) {
        lblText = el.parentElement.innerText;
      }
      return { 
        context: text.toLowerCase(), 
        labelText: lblText.toLowerCase(),
        val: (el.getAttribute('value') || '').toLowerCase() 
      };
    }, radio);
    
    const isYes = val.includes('yes') || val.includes('true') || /\byes\b/.test(labelText) || labelText.includes('true') || labelText.includes('citizen') || labelText.includes('permanent resident') || /will not require/i.test(labelText);
    const isNo = val.includes('no') || val.includes('false') || /\bno\b/.test(labelText) || labelText.includes('false') || labelText.match(/^none/i);

    let shouldCheck = false;
    if (/authorized to work|legally authorized|u\.s\. person|country to which you are applying/i.test(context)) {
      if (isYes) shouldCheck = true;
    } else if (/require sponsorship|visa sponsorship|need sponsorship/i.test(context)) {
      if (isNo) shouldCheck = true;
    } else if (/worked at.*in the past|previously employed/i.test(context)) {
      if (isNo) shouldCheck = true;
    } else if (/government/i.test(context)) {
      if (isNo) shouldCheck = true;
    } else if (/relocation|commuting/i.test(context)) {
      if (isYes) shouldCheck = true;
    } else if (/auditor|pricewaterhousecoopers/i.test(context)) {
      if (isNo) shouldCheck = true;
    } else if (/contract.*hire|contract work|freelance/i.test(context)) {
      if (isNo) shouldCheck = true;
    } else if (/security clearance|active clearance/i.test(context)) {
      if (isNo) shouldCheck = true;
    }

    if (shouldCheck) {
      await radio.check({ force: true }).catch(async () => {
        // Fallback: click the parent label
        const lbl = await page.$(`label[for="${await radio.getAttribute('id').catch(()=>'')}"]`);
        if (lbl) await lbl.click({ force: true }).catch(()=>{});
        else {
          const parent = await radio.evaluateHandle(el => el.parentElement).catch(()=>null);
          if (parent) await parent.click({ force: true }).catch(()=>{});
        }
      });
    }
  }

  // Selects / Dropdowns
  const selects = await page.$$('select');
  for (const select of selects) {
    const context = await page.evaluate(el => {
      let curr = el;
      let text = '';
      while (curr && curr !== document.body) {
         if (curr.innerText) { text = curr.innerText; break; }
         curr = curr.parentElement;
      }
      return text.toLowerCase();
    }, select);

    if (/authorized to work|legally authorized|u\.s\. person|country to which you are applying/i.test(context)) {
      await select.selectOption({ label: /Yes|Citizen|Permanent Resident/i }).catch(() => {});
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
    } else if (/worked at.*in the past|previously employed/i.test(context)) {
      await select.selectOption({ label: /No/i }).catch(() => {});
    } else if (/government/i.test(context)) {
      await select.selectOption({ label: /No/i }).catch(() => {});
    } else if (/relocation|commuting/i.test(context)) {
      await select.selectOption({ label: /Yes|Open/i }).catch(() => {});
    }
  }

  // Text inputs
  const textInputs = await page.$$('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="submit"]):not([type="button"]), textarea');
  for (const input of textInputs) {
    if (await input.inputValue().catch(()=>'') !== '') continue;

    const context = await page.evaluate(el => {
      let curr = el;
      let text = '';
      while (curr && curr !== document.body) {
         if (curr.innerText) { text = curr.innerText; break; }
         curr = curr.parentElement;
      }
      return text.toLowerCase();
    }, input);

    let handled = false;
    if (/location|city/i.test(context) && !/university/i.test(context)) {
      await input.fill(profile.personal.location?.city || 'Austin, TX').catch(()=>{}); handled = true;
    } else if (/most recently worked|current company/i.test(context)) {
      await input.fill(profile.experience?.[0]?.company || 'Consultant').catch(()=>{}); handled = true;
    } else if (/years of experience|years experience|how many years/i.test(context)) {
      await input.fill('6').catch(()=>{}); handled = true;
    } else if (/first name/i.test(context)) {
      await input.fill(profile.personal.firstName).catch(()=>{}); handled = true;
    } else if (/last name/i.test(context)) {
      await input.fill(profile.personal.lastName).catch(()=>{}); handled = true;
    } else if (/portfolio|website/i.test(context)) {
      await input.fill(profile.personal.links.portfolio).catch(()=>{}); handled = true;
    } else if (/linkedin/i.test(context)) {
      await input.fill(profile.personal.links.linkedin).catch(()=>{}); handled = true;
    } else if (/github/i.test(context)) {
      await input.fill(profile.personal.links.github).catch(()=>{}); handled = true;
    } else if (/how did you hear/i.test(context)) {
      await input.fill('LinkedIn').catch(()=>{}); handled = true;
    } else if (/salary|compensation/i.test(context)) {
      await input.fill('$135,000').catch(()=>{}); handled = true;
    }

    if (!handled) {
      // Unmapped text input -> Call Gemini!
      const isReq = /required|\*/i.test(context) || await input.evaluate(el => el.required || el.getAttribute('aria-required') === 'true').catch(()=>false);
      const aiAnswer = await generateDynamicFieldAnswer({ 
        question: context.slice(0, 300), 
        profile, 
        jobTitle: 'Product Designer', 
        company: 'Ashby Company',
        isRequired: isReq
      });
      if (aiAnswer && aiAnswer.trim() !== 'SKIP') {
        console.log(`[Ashby] AI generated answer for "${context.slice(0, 60)}...": ${aiAnswer}`);
        await input.fill(aiAnswer).catch(()=>{});
      }
    }
  }
}

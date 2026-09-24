import { generateDynamicFieldAnswer } from "../llm/field_answer.js";

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { detectSubmissionConfirmation, getGreenhouseDropdownAnswers, getGreenhouseFieldValue, getGroundedFieldAnswer, hasGreenhouseSelectionMatch, isGreenhouseFormStillActive, shouldBlockGreenhouseLocationSubmission, shouldIgnoreOptionalGreenhouseField, shouldSkipDirectGreenhouseFieldFill, summarizeSubmissionState } from './submission_verification.js';

const AGENT_DEBUG_LOG = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../../.cursor/debug-b6ebec.log');

function agentDebugLog(payload) {
  const line = JSON.stringify({ sessionId: 'b6ebec', timestamp: Date.now(), ...payload }) + '\n';
  try {
    fs.mkdirSync(path.dirname(AGENT_DEBUG_LOG), { recursive: true });
    fs.appendFileSync(AGENT_DEBUG_LOG, line);
  } catch (_) {}
  fetch('http://127.0.0.1:7904/ingest/fad1bf9f-4f3e-4534-b6ee-276686547846', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'b6ebec' },
    body: line.trim(),
  }).catch(() => {});
}

/**
 * Enhanced Greenhouse ATS Form Handler
 * Handles both classic Greenhouse (<select>) and modern React/Remix Greenhouse interfaces (.select__control)
 */
async function greenhouseFormLooksReady(container) {
  const obviousFormIndicators = [
    '#first_name',
    'input[name*="first_name" i]',
    '#last_name',
    'input[name*="last_name" i]',
    '#submit_app',
    'button:has-text("Submit application")',
    '#application_form'
  ];

  for (const selector of obviousFormIndicators) {
    const el = await container.$(selector).catch(() => null);
    if (el) return true;
  }

  const formLikeCounts = await container.$$eval('input, textarea, select, [role="combobox"], [aria-haspopup="listbox"]', els => els.length).catch(() => 0);
  return formLikeCounts > 5; // A job application form will have more than 5 fields, unlike a newsletter form
}

export async function applyGreenhouse(container, profile, coverLetterText, resumePdfPath, dryRun = false, page = null) {
  console.log(`[Greenhouse] Filling application...`);

  let isReady = await greenhouseFormLooksReady(container);
  if (!isReady) {
    const applyBtn = await container.$('a:has-text("Apply"), button:has-text("Apply")');
    if (applyBtn) {
      await applyBtn.click({ force: true, timeout: 5000 }).catch(() => {});
      if (page?.waitForTimeout) await page.waitForTimeout(2000);
      isReady = await greenhouseFormLooksReady(container);
    }
  }

  if (!isReady) {
    console.warn(`[Greenhouse] This page does not look like a loaded application form. Skipping fallback ATS variant.`);
    return { success: false, submitted: false, error: 'Greenhouse application form not loaded' };
  }

  // Keyboard operations belong to the top-level Page, not a Frame
  const keyboard = page?.keyboard || (container.keyboard ? container.keyboard : null);

  // First Name / Last Name
  const firstNameInput = await container.$('#first_name, input[name*="first_name" i]');
  if (firstNameInput) await firstNameInput.fill(profile.personal.firstName);

  const lastNameInput = await container.$('#last_name, input[name*="last_name" i]');
  if (lastNameInput) await lastNameInput.fill(profile.personal.lastName);

  // Email & Phone
  const emailInput = await container.$('#email, input[type="email"]');
  if (emailInput) await emailInput.fill(profile.personal.email);

  const phoneInput = await container.$('#phone, input[type="tel"]');
  if (phoneInput) {
    const phoneId = await phoneInput.getAttribute('id').catch(() => '');
    const phoneLocator = phoneId ? container.locator(`#${phoneId}`) : null;
    const phoneDigits = (profile.personal.phone || '').replace(/\D/g, '');
    const phoneValue = profile.personal.phone;
    if (phoneLocator) {
      await phoneLocator.fill('');
      await phoneLocator.pressSequentially(phoneValue, { delay: 35 });
    } else {
      await phoneInput.fill(phoneValue);
    }
    if (keyboard) await keyboard.press('Tab').catch(() => {});
  }

  // Location / Address (handles modern React-Select autocomplete like #candidate-location)
  const locationInput = await container.$('#candidate-location, #job_application_location, input[autocomplete="address-level2"]');
  if (locationInput) {
    try {
      const cityQuery = `${profile.personal.location.city}, ${profile.personal.location.state}`;
      const locationMatches = [
        `${profile.personal.location.city}, ${profile.personal.location.state}, United States`,
        `${profile.personal.location.city}, Texas, United States`,
        `${profile.personal.location.city}, ${profile.personal.location.stateAbbr}, United States`,
        cityQuery,
        profile.personal.location.city
      ];
      await selectGreenhouseCombobox(container, locationInput, cityQuery, page, keyboard, locationMatches);
    } catch (e) {
      console.warn(`[Greenhouse] Error selecting location autocomplete:`, e.message);
    }
  }

  // Country selector (modern React-Select)
  const countryControl = await container.$('#country, input[id*="country" i][role="combobox"], div[id*="country"] .select__control');
  if (countryControl) {
    const countryText = await container.evaluate(el => el.innerText, countryControl);
    if (!countryText.includes('United States')) {
      await selectGreenhouseCombobox(container, countryControl, 'United States', page, keyboard, ['United States', 'United States of America']);
    }
  }

  // Resume upload (Fail-stop: do NOT submit without a resume)
  if (!resumePdfPath || !fs.existsSync(resumePdfPath)) {
    console.error(`[Greenhouse] Resume PDF not found at ${resumePdfPath}. Aborting application.`);
    return { success: false, submitted: false, error: 'Resume PDF missing' };
  }
  
  try {
    const resumeInput = await container.$('input[type="file"]');
    if (resumeInput) {
      console.log(`[Greenhouse] Uploading resume directly via input: ${resumePdfPath}`);
      await resumeInput.setInputFiles(resumePdfPath);
      if (page?.waitForTimeout) await page.waitForTimeout(1000);
    } else {
      console.warn(`[Greenhouse] No file input found, trying button click fallback...`);
      const attachBtn = await container.$('button[aria-describedby*="resume" i], button:has-text("Attach"), button:has-text("Upload"), [data-qa="resume-upload-button"]');
      if (attachBtn && page && typeof page.waitForEvent === 'function') {
        const [fileChooser] = await Promise.all([
          page.waitForEvent('filechooser', { timeout: 5000 }).catch(() => null),
          attachBtn.click({ force: true }).catch(() => {})
        ]);
        if (fileChooser) {
          await fileChooser.setFiles(resumePdfPath);
          if (page?.waitForTimeout) await page.waitForTimeout(1500);
        }
      } else {
        const hasAnyRealApplicationFields = await greenhouseFormLooksReady(container);
        if (!hasAnyRealApplicationFields) {
          console.warn(`[Greenhouse] No file input found and no application form is active. Skipping this ATS variant.`);
          return { success: false, submitted: false, error: 'Greenhouse application form not loaded' };
        }
      }
    }
  } catch (e) {
    console.warn(`[Greenhouse] Resume upload failed: ${e.message}`);
  }

  console.log(`[Greenhouse] Passed resume upload`);

  // Cover letter
  const coverLetterInput = await container.$('#cover_letter_text, textarea[name*="cover_letter" i]');
  if (coverLetterInput && coverLetterText) {
    console.log(`[Greenhouse] Injecting cover letter.`);
    await coverLetterInput.fill(coverLetterText).catch(e => console.log('cover letter err', e));
  }

  console.log(`[Greenhouse] Filling required fields...`);
  await fillGreenhouseRequiredFields(container, profile, keyboard, page);
  console.log(`[Greenhouse] Passed required fields`);

  // Links & Generic text inputs
  const allInputs = await container.$$('input[type="text"], input:not([type]), textarea');
  for (const el of allInputs) {
    const fieldId = await el.getAttribute('id').catch(() => '');
    const label = await container.evaluate(i => {
      const wrapper = i.closest('.field, .application-field, fieldset, div[class*="field"], div[class*="Question"], div[class*="group"]');
      if (wrapper && wrapper.querySelectorAll('input:not([type="hidden"]), textarea, select, .select__control, [role="combobox"], [aria-haspopup="listbox"]').length === 1) {
        if (wrapper.innerText) return wrapper.innerText.toLowerCase();
      }

      let curr = i;
      while (curr && curr !== document.body) {
        const lbl = curr.querySelector('label, legend, h3, h4');
        if (lbl && lbl.innerText) return lbl.innerText.toLowerCase();
        if (curr.previousElementSibling) {
          if (/label|legend|h3|h4/i.test(curr.previousElementSibling.tagName)) {
            return curr.previousElementSibling.innerText.toLowerCase();
          }
          if (!curr.previousElementSibling.querySelector('input:not([type="hidden"]), textarea, select, .select__control, [role="combobox"], [aria-haspopup="listbox"]')) {
            const text = curr.previousElementSibling.innerText;
            if (text && text.trim().length > 0 && text.length < 150) {
              return text.toLowerCase();
            }
          }
        }
        curr = curr.parentElement;
      }
      return i.innerText.toLowerCase();
    }, el);

    const val = await el.inputValue().catch(() => '');
    if (shouldSkipDirectGreenhouseFieldFill(label, fieldId)) {
      continue;
    }
    if (val) continue; // Already filled
    if (!(await el.isVisible().catch(() => false))) continue;

    // Helper to ensure React sees the change
    const safeFill = async (el, val) => {
      await el.fill(val).catch(() => {});
      await el.evaluate(node => node.dispatchEvent(new Event('input', { bubbles: true }))).catch(() => {});
      await el.evaluate(node => node.dispatchEvent(new Event('change', { bubbles: true }))).catch(() => {});
      await el.evaluate(node => node.blur && node.blur()).catch(() => {});
    };

    const groundedAnswer = getGroundedFieldAnswer({ fieldText: label, profile });

    if (/preferred.*first\s*name/i.test(label) || /nickname/i.test(label)) {
      await safeFill(el, profile.personal.firstName);
    } else if (/legal name|full name/i.test(label)) {
      await safeFill(el, `${profile.personal.firstName} ${profile.personal.lastName}`);
    } else if (/linkedin/i.test(label)) {
      await safeFill(el, profile.personal.links.linkedin);
    } else if (/current company|present employer|employer name/i.test(label)) {
      await safeFill(el, profile.experience[0]?.company || profile.experience[1]?.company || '');
    } else if (/portfolio|website|github/i.test(label)) {
      await safeFill(el, profile.personal.links.portfolio);
    } else if (/school|university|college/i.test(label)) {
      await safeFill(el, profile.education[2].institution);
    } else if (/degree/i.test(label)) {
      await safeFill(el, profile.education[2].degree);
    } else if (/discipline|major/i.test(label)) {
      await safeFill(el, profile.education[2].focus || 'Design / Anthropology');
    } else if (/pronoun/i.test(label)) {
      await safeFill(el, 'He/him');
    } else if (/twitter/i.test(label)) {
      await safeFill(el, profile.personal.links.twitter || '');
    } else if (/where did you hear/i.test(label) || /how did you hear/i.test(label)) {
      await safeFill(el, 'LinkedIn');
    } else if (/know anyone|referral|relative|employee/i.test(label)) {
      await safeFill(el, 'No');
    } else if (groundedAnswer) {
      await safeFill(el, groundedAnswer);
    } else if (/where do you intend to work|your location|city and state|location \(city\)/i.test(label)) {
      await el.fill(`${profile.personal.location.city}, ${profile.personal.location.stateAbbr}`);
      if (keyboard) {
        if (page?.waitForTimeout) await page.waitForTimeout(400);
        await keyboard.press('ArrowDown').catch(() => {}); await keyboard.press('ArrowDown').catch(() => {});
        await keyboard.press('Enter').catch(() => {});
      }
    } else {
      const isReq = /required|\*/i.test(label) || await el.evaluate(n => n.required || n.getAttribute('aria-required') === 'true').catch(()=>false);
      const aiAnswer = await generateDynamicFieldAnswer({ 
        question: label.slice(0, 300), 
        profile, 
        jobTitle: 'Product Designer', 
        company: 'Greenhouse Company',
        isRequired: isReq
      });
      if (aiAnswer && aiAnswer.trim() !== 'SKIP') {
        console.log(`[Greenhouse] AI generated answer for "${label.slice(0, 60)}...": ${aiAnswer}`);
        await safeFill(el, aiAnswer);
      }
    }
  }

  console.log(`[Greenhouse] Before URL Fields`);
  await fillGreenhouseUrlFields(container, profile);

  console.log(`[Greenhouse] Before Custom Questions`);
  // Custom Dropdowns (both <select> and React-Select dropdowns)
  await fillGreenhouseCustomQuestions(container, profile, keyboard, page);
  

  // 5. Radio Buttons
  const radioGroups = await container.$('fieldset:has(input[type="radio"]), div.question:has(input[type="radio"]), div.field:has(input[type="radio"])');
  for (const group of radioGroups) {
    const labelText = await group.evaluate(el => {
      const legend = el.querySelector('legend, label, h3, h4');
      return legend ? legend.innerText.trim() : '';
    });
    
    if (!labelText) continue;
    
    // Check if any radio is already selected
    const isSelected = await group.evaluate(el => !!el.querySelector('input[type="radio"]:checked'));
    if (isSelected) continue;
    
    const radios = await group.$('input[type="radio"]');
    
    if (/authorized to work|legal right to work/i.test(labelText)) {
      for (const r of radios) { if (await r.evaluate(el => /yes/i.test(el.parentElement.innerText))) await r.check({ force: true }).catch(()=>{}); }
    } else if (/sponsorship|visa/i.test(labelText)) {
      for (const r of radios) { if (await r.evaluate(el => /no/i.test(el.parentElement.innerText))) await r.check({ force: true }).catch(()=>{}); }
    } else if (/worked for|previously employed|contractor|worked.*before/i.test(labelText)) {
      for (const r of radios) { if (await r.evaluate(el => /no/i.test(el.parentElement.innerText))) await r.check({ force: true }).catch(()=>{}); }
    } else if (/veteran/i.test(labelText)) {
      for (const r of radios) { if (await r.evaluate(el => /no|not a veteran/i.test(el.parentElement.innerText))) await r.check({ force: true }).catch(()=>{}); }
    } else if (/disability/i.test(labelText)) {
      for (const r of radios) { if (await r.evaluate(el => /no|do not have/i.test(el.parentElement.innerText))) await r.check({ force: true }).catch(()=>{}); }
    } else if (/gender|sex/i.test(labelText)) {
      for (const r of radios) { if (await r.evaluate(el => /male|man/i.test(el.parentElement.innerText))) await r.check({ force: true }).catch(()=>{}); }
    } else if (/race|ethnicity/i.test(labelText)) {
      for (const r of radios) { if (await r.evaluate(el => /white|caucasian/i.test(el.parentElement.innerText))) await r.check({ force: true }).catch(()=>{}); }
    } else {
      // Fallback for custom radio buttons (just pick the first option that isn't 'None' or 'No', or just pick the first option if it's required)
      const isRequired = await group.evaluate(el => el.innerText.includes('*') || !!el.querySelector('input[required], [aria-required="true"]'));
      if (isRequired && radios.length > 0) {
        let checked = false;
        for (const r of radios) {
          const text = await r.evaluate(el => el.parentElement.innerText);
          if (/yes|agree|accept/i.test(text)) {
            await r.check({ force: true }).catch(()=>{});
            checked = true;
            break;
          }
        }
        if (!checked) await radios[0].check({ force: true }).catch(()=>{});
      }
    }
  }

  console.log(`[Greenhouse] Before Phone`);
  await fillGreenhousePhone(container, profile, keyboard);

  if (dryRun) {
    console.log(`[Greenhouse] [DRY RUN] Fields filled. Skipping final submission.`);
    return { success: true, submitted: false };
  }

  const debugSummary = await buildGreenhouseDebugSummary(container, profile, page);
  const cityField = await container.$('#candidate-location, #job_application_location, input[autocomplete="address-level2"]');
  let locationSelectionVerified = true;
  if (cityField) {
    const cityInputValue = await cityField.inputValue().catch(() => '');
    const selectedLocation = await container.evaluate(el => {
      const control = el.closest('.select__control');
      return control?.querySelector('.select__single-value')?.textContent?.replace(/\s+/g, ' ').trim() || '';
    }, cityField).catch(() => '');
    const cityValue = selectedLocation || cityInputValue;
    const optionLabels = await container.$eval('[role="listbox"]:visible [role="option"], [role="listbox"]:visible .select__option, [role="listbox"]:visible li[role="option"], [role="listbox"]:visible div[id*="option"], .pac-container:visible .pac-item, ul.ui-autocomplete:visible li.ui-menu-item', els => els.map(el => (el.textContent || '').replace(/\s+/g, ' ').trim())).catch(() => []);
    const shouldBlock = shouldBlockGreenhouseLocationSubmission({ value: cityValue, optionLabels });
    locationSelectionVerified = !shouldBlock;
    if (shouldBlock) {
      if (optionLabels.length > 0) {
        console.warn(`[Greenhouse] Location field text is not backed by a matching dropdown selection; refusing submit until the option is committed.`);
      } else {
        console.warn(`[Greenhouse] Location value is empty or unverified and no option list is available; refusing submit.`);
      }
    }
  }

  // Submit button (never use header "Apply" — it is not form submission)
  const submitBtn = await resolveGreenhouseSubmitButton(container);
  if (submitBtn) {
    if (!locationSelectionVerified) {
      return { success: false, submitted: false, error: 'Location (City) combobox not verified', debug: debugSummary };
    }
    console.log(`[Greenhouse] Clicking submit button...`);
    const initialUrl = page ? page.url() : '';
    // #region agent log
    const dbgSubmitMeta = await submitBtn.evaluate(el => ({
      tag: el.tagName,
      id: el.id,
      type: el.type,
      disabled: el.disabled,
      text: (el.innerText || el.value || '').slice(0, 80),
      formAction: el.form?.action?.slice(0, 120) || null,
    })).catch(() => ({}));
    agentDebugLog({ runId: 'pre-fix', hypothesisId: 'H1-H4', location: 'greenhouse.js:pre-click', message: 'Submit button metadata', data: { ...dbgSubmitMeta, contextIsFrame: page ? container !== page : false, contextUrl: (typeof container.url === 'function' ? container.url() : '').slice(0, 120), mainUrl: initialUrl.slice(0, 120), hasWaitForTimeout: !!page?.waitForTimeout } });
    // #endregion
    await submitBtn.scrollIntoViewIfNeeded().catch(() => {});
    if (page?.waitForTimeout) await page.waitForTimeout(300);
    try {
      await submitBtn.click({ force: true, timeout: 5000 });
    } catch(e) {
      await submitBtn.evaluate(el => el.click()).catch(() => {});
    }

    let submitted = false;
    let finalErrorMsg = '';

    for (let i = 0; i < 15; i++) {
      if (page?.waitForTimeout) await page.waitForTimeout(1500);

      const hasError = await container.$('.error:visible, [aria-invalid="true"]:visible, div[class*="error-message"]:visible, .field-error:visible, input:invalid, select:invalid, textarea:invalid').catch(() => null);

      if (hasError) {
        let errorMsg = await container.evaluate(el => el.innerText, hasError).catch(() => '');
        const isInput = await container.evaluate(el => ['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName), hasError).catch(() => false);
        let questionText = '';
        if (errorMsg.trim() || isInput) {
          if (!errorMsg.trim() || isInput || errorMsg.includes("Select...")) {
            errorMsg = await container.evaluate(el => {
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

          questionText = await container.evaluate(el => {
            let curr = el;
            let text = '';
            while (curr && curr !== document.body) {
              const lbl = curr.querySelector('label, legend, h3, h4');
              if (lbl && lbl.innerText) {
                text = lbl.innerText; break;
              }
              const prev = curr.previousElementSibling;
              if (prev) {
                if (/label|legend|h3|h4/i.test(prev.tagName)) {
                  text = prev.innerText; break;
                }
                if (!prev.querySelector('input:not([type="hidden"]), textarea, select, .select__control, [role="combobox"], [aria-haspopup="listbox"]')) {
                  const textNode = prev.innerText;
                  if (textNode && textNode.trim().length > 0 && textNode.length < 150) {
                    text = textNode; break;
                  }
                }
              }
              curr = curr.parentElement;
            }
            return text;
          }, hasError).catch(() => '');

          const isOptionalSelectError = shouldIgnoreOptionalGreenhouseField({
            errorText: errorMsg,
            questionText: questionText,
            hasRequiredMarker: /required/i.test(questionText) || /required/i.test(errorMsg) || await container.evaluate(el => el.getAttribute('aria-required') === 'true', hasError).catch(() => false),
            isSelectControl: await container.evaluate(el => !!el.closest('select, .select__control, [role="combobox"], [aria-haspopup="listbox"]'), hasError).catch(() => false)
          });

          if (isOptionalSelectError) {
            console.warn(`[Greenhouse] Ignoring optional select validation: ${questionText || errorMsg}`);
            continue;
          }

          finalErrorMsg = errorMsg || 'Validation error';
          // #region agent log
          agentDebugLog({ runId: 'pre-fix', hypothesisId: 'H3', location: 'greenhouse.js:poll-error', message: 'Validation error detected', data: { iteration: i, errorSnippet: (finalErrorMsg || '').slice(0, 120), isInput, questionText: (questionText || '').slice(0, 160) } });
          // #endregion
          break;
        }
      }

      let pageText = '';
      let containerTextOk = true;
      try {
        pageText = await container.innerText('body');
      } catch (e) {
        containerTextOk = false;
        if (page) {
          pageText = await page.innerText('body').catch(() => '');
        }
      }

      const isConfirmed = detectSubmissionConfirmation({
        pageText,
        url: page ? page.url() : '',
        initialUrl
      });
      const urlChanged = page && page.url() !== initialUrl && !page.url().includes('#error');
      let mainPageTextLen = 0;
      let framePageTextLen = 0;
      if (page && i === 0) {
        mainPageTextLen = (await page.innerText('body').catch(() => '')).length;
        if (page && container !== page) {
          framePageTextLen = (await container.innerText('body').catch(() => '')).length;
        }
      }
      if (i === 0 || i === 7 || i === 14 || isConfirmed || urlChanged) {
        // #region agent log
        agentDebugLog({ runId: 'pre-fix', hypothesisId: 'H2-H5-H6', location: 'greenhouse.js:poll', message: 'Post-submit poll', data: { iteration: i, containerTextOk, pageTextLen: pageText.length, mainPageTextLen, framePageTextLen, isConfirmed, urlChanged, currentUrl: (page?.url() || '').slice(0, 120), textSnippet: pageText.replace(/\s+/g, ' ').slice(0, 160) } });
        // #endregion
      }

      if (isConfirmed || urlChanged) {
        submitted = true;
        break;
      }
    }

    // #region agent log
    const postSubmitBtnStill = await container.$('#submit_app, button[type="submit"]:has-text("Submit"), button:has-text("Submit application"), button:has-text("Apply")').catch(() => null);
    const postSubmitBtnVisible = postSubmitBtnStill ? await postSubmitBtnStill.isVisible().catch(() => false) : false;
    agentDebugLog({ runId: 'pre-fix', hypothesisId: 'H1-H4', location: 'greenhouse.js:post-loop', message: 'Submit loop finished', data: { submitted, finalErrorMsg: (finalErrorMsg || '').slice(0, 120), submitBtnStillVisible: postSubmitBtnVisible } });
    // #endregion

    if (finalErrorMsg && !submitted) {
      console.warn(`[Greenhouse] Form validation error detected after click (${finalErrorMsg.slice(0, 100)}). Application not finalized.`);
      return { success: false, submitted: false, error: finalErrorMsg };
    }

    if (!submitted) {
      const finalPageText = await container.innerText('body').catch(() => '') || await page.innerText('body').catch(() => '');
      const finalState = summarizeSubmissionState({
        pageText: finalPageText,
        url: page ? page.url() : '',
        initialUrl
      });
      const stillActive = isGreenhouseFormStillActive({
        pageText: finalPageText,
        url: page ? page.url() : '',
        initialUrl
      });
      console.warn(`[Greenhouse] Submission click completed, but confirmation state could not be verified. Still on apply form: ${stillActive}. Last URL: ${finalState.urlSnippet || 'n/a'} | Last text: ${finalState.textSnippet || 'n/a'}`);
      if (page && page.url() === initialUrl && finalState.textSnippet.length < 250) {
        await page.waitForTimeout(3000);
        const finalRetryText = await page.innerText('body').catch(() => '');
        const finalRetry = summarizeSubmissionState({
          pageText: finalRetryText,
          url: page.url(),
          initialUrl
        });
        if (finalRetry.isConfirmed) {
          console.log(`[Greenhouse] Final recheck confirmed submission.`);
          return { success: true, submitted: true };
        }
      }
    } else {
      console.log(`[Greenhouse] Verified application submission!`);
    }

    return { 
      success: submitted, 
      submitted, 
      error: submitted ? null : 'Submission confirmation could not be verified; the ATS form remained active after the click.' 
    };
  }

  console.warn(`[Greenhouse] Submit application button was not found on the active form.`);
  return { success: false, submitted: false, error: 'Submit button not found', debug: debugSummary };
}

async function buildGreenhouseDebugSummary(container, profile, page) {
  const summary = {
    url: page ? page.url() : '',
    formReady: await greenhouseFormLooksReady(container),
    fileInput: !!(await container.$('input[type="file"]').catch(() => null)),
    cityValue: await container.$('#candidate-location, #job_application_location, input[autocomplete="address-level2"]').then(el => el ? el.inputValue().catch(() => '') : '').catch(() => ''),
    selectedOptions: await container.$$eval('[role="option"], .select__option, li[role="option"], div[id*="option"]', els => els.slice(0, 10).map(el => (el.textContent || '').replace(/\s+/g, ' ').trim())).catch(() => []),
    pageTextSample: (await container.innerText('body').catch(() => '') || '').replace(/\s+/g, ' ').slice(0, 220),
    profileCity: profile.personal?.location?.city || null,
    profileState: profile.personal?.location?.state || null,
    profileCountry: profile.personal?.location?.country || null
  };
  return summary;
}

async function fillGreenhouseRequiredFields(container, profile, keyboard, page) {
  const directValues = [
    { selectors: ['#first_name', 'input[name*="first_name" i]'], fieldText: 'First Name', fieldId: 'first_name' },
    { selectors: ['#last_name', 'input[name*="last_name" i]'], fieldText: 'Last Name', fieldId: 'last_name' },
    { selectors: ['#email', 'input[type="email"]'], fieldText: 'Email', fieldId: 'email' },
    { selectors: ['#phone', 'input[type="tel"]'], fieldText: 'Phone', fieldId: 'phone' },
    { selectors: ['#candidate-location', '#job_application_location', 'input[autocomplete="address-level2"]'], fieldText: 'Location (City)', fieldId: 'candidate-location' },
    { selectors: ['#country', 'input[id*="country" i][role="combobox"]', 'input[role="combobox"][aria-label*="country" i]'], fieldText: 'Country', fieldId: 'country' },
    { selectors: ['#school--0', 'input[id*="school" i]', 'input[role="combobox"][aria-label*="school" i]'], fieldText: 'School', fieldId: 'school--0' },
    { selectors: ['#degree--0', 'input[id*="degree" i]', 'input[role="combobox"][aria-label*="degree" i]'], fieldText: 'Degree', fieldId: 'degree--0' },
    { selectors: ['#question_67389684', 'input[id*="67389684" i]'], fieldText: 'Please select the country you are currently located in.', fieldId: 'question_67389684' },
    { selectors: ['#question_67389685', 'input[id*="67389685" i]'], fieldText: 'If located in the US, in what city and state do you reside?', fieldId: 'question_67389685' },
    { selectors: ['#question_67389688', 'input[id*="67389688" i]'], fieldText: 'Do you opt-in to receive WhatsApp messages from Stripe Recruiting?', fieldId: 'question_67389688' },
    { selectors: ['#gender', 'input[id*="gender" i]'], fieldText: 'Gender', fieldId: 'gender' },
    { selectors: ['#hispanic_ethnicity', 'input[id*="hispanic" i]'], fieldText: 'Are you Hispanic/Latino?', fieldId: 'hispanic_ethnicity' },
    { selectors: ['#veteran_status', 'input[id*="veteran" i]'], fieldText: 'Veteran Status', fieldId: 'veteran_status' }
  ];

  for (const entry of directValues) {
    if (shouldSkipDirectGreenhouseFieldFill(entry.fieldText, entry.fieldId)) {
      continue;
    }

    const input = await container.$(entry.selectors.join(', ')).catch(() => null);
    if (!input) continue;
    const existingValue = await input.inputValue().catch(() => '');
    if (existingValue && existingValue.trim() && !/select\s*\.\.\.|select a\s+/i.test(existingValue.trim())) continue;
    const value = getGreenhouseFieldValue(entry.fieldText, entry.fieldId, profile);
    if (!value) continue;

    try {
      if (!(await input.isVisible().catch(() => false))) continue;
      await input.focus();
      await input.fill('');
      await input.fill(value);
      if (page?.waitForTimeout) await page.waitForTimeout(250);
      if (keyboard) {
        await keyboard.press('Tab').catch(() => {});
      }
    } catch (_) {}
  }

  // Greenhouse sometimes shows a "Verify your identity" modal after entering the email address
  if (page?.waitForTimeout) await page.waitForTimeout(1000);
  const skipBtn = await container.$('button:has-text("Skip and fill out manually"), a:has-text("Skip and fill out manually"), button:has-text("Continue without verifying")').catch(() => null);
  if (skipBtn && await skipBtn.isVisible().catch(() => false)) {
    console.log(`[Greenhouse] Detected security code verification screen. Clicking 'Skip and fill out manually'...`);
    await skipBtn.click({ force: true }).catch(() => {});
    if (page?.waitForTimeout) await page.waitForTimeout(1500);
  }

  const requiredComboboxes = [
    { selector: '#school--0', value: profile.education?.[2]?.institution || 'Clarion University', candidates: [profile.education?.[2]?.institution || 'Clarion University', 'Other'] },
    { selector: '#question_67389684', value: profile.personal?.location?.country || 'United States', candidates: ['United States', 'Other'] }
  ];
  for (const entry of requiredComboboxes) {
    const control = await container.$(entry.selector).catch(() => null);
    if (control) await selectGreenhouseCombobox(container, control, entry.value, page, keyboard, entry.candidates);
  }

  const requiredTextFields = [
    { selector: '#question_67389685', value: `${profile.personal.location.city}, ${profile.personal.location.stateAbbr}` },
    { selector: '#question_67389686', value: profile.experience?.[0]?.company || '' },
    { selector: '#question_67389687', value: profile.experience?.[0]?.title || '' }
  ];
  for (const entry of requiredTextFields) {
    const field = await container.$(entry.selector).catch(() => null);
    if (field && entry.value && (await field.isVisible().catch(() => false))) {
      await field.fill(entry.value).catch(() => {});
      await field.press('Tab').catch(() => {});
    }
  }
}

async function fillGreenhousePhone(container, profile, keyboard) {
  const phoneInput = await container.$('#phone, input[type="tel"]');
  if (!phoneInput) return;

  const phoneId = await phoneInput.getAttribute('id').catch(() => '');
  const phoneLocator = phoneId ? container.locator(`#${phoneId}`) : null;
  const phoneDigits = (profile.personal.phone || '').replace(/\D/g, '');
  const phoneValue = profile.personal.phone;

  if (phoneLocator) {
    await phoneLocator.fill('');
    await phoneLocator.pressSequentially(phoneValue, { delay: 35 });
  } else {
    await phoneInput.fill(phoneValue);
  }
  if (keyboard) await keyboard.press('Tab').catch(() => {});
}

async function selectGreenhouseCombobox(container, control, queryText, page, keyboard, candidateTexts = []) {
  if (!control) return false;

  const optionSelector = '[role="listbox"]:visible [role="option"], [role="listbox"]:visible .select__option, [role="listbox"]:visible li[role="option"], [role="listbox"]:visible div[id*="option"], .pac-container:visible .pac-item, ul.ui-autocomplete:visible li.ui-menu-item';
  const candidatePool = [...new Set([queryText, ...candidateTexts])].filter(Boolean);
  const controlId = await control.getAttribute('id').catch(() => '');
  const controlLocator = controlId ? container.locator(`#${controlId}`) : null;

  const clickMatchingOption = async () => {
    const options = await container.$$(optionSelector).catch(() => []);
    for (const candidate of candidatePool) {
      for (const option of options) {
        const label = await option.textContent().catch(() => '');
        const normalizedLabel = (label || '').replace(/\s+/g, ' ').trim();
        if (!normalizedLabel) continue;
        if (hasGreenhouseSelectionMatch({ value: candidate, optionLabels: [normalizedLabel] })) {
          await option.click({ force: true }).catch(() => {});
          if (keyboard) {
            await keyboard.press('Tab').catch(() => {});
          }
          if (page?.waitForTimeout) await page.waitForTimeout(250);
          const committed = await container.evaluate(el => {
            const selected = el.closest('.select__control')?.querySelector('.select__single-value');
            return selected?.textContent?.replace(/\s+/g, ' ').trim() || el.value || '';
          }, control).catch(() => '');
          if (committed && hasGreenhouseSelectionMatch({ value: committed, optionLabels: [normalizedLabel] })) {
            return true;
          }
          return false;
        }
      }
    }

    for (const option of options) {
      const label = await option.textContent().catch(() => '');
      const normalizedLabel = (label || '').replace(/\s+/g, ' ').trim();
      const normalizedQuery = (queryText || '').replace(/\s+/g, ' ').trim();
      if (!normalizedLabel || !normalizedQuery) continue;
      if (normalizedLabel.toLowerCase().includes(normalizedQuery.toLowerCase()) || normalizedQuery.toLowerCase().includes(normalizedLabel.toLowerCase())) {
        await option.click({ force: true }).catch(() => {});
        if (keyboard) {
          await keyboard.press('Tab').catch(() => {});
        }
        if (page?.waitForTimeout) await page.waitForTimeout(250);
        return true;
      }
    }

    return false;
  };

  const input = controlLocator || control;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await control.click({ force: true }).catch(() => {});
      await input.focus().catch(() => {});
      if (page?.waitForTimeout) await page.waitForTimeout(300);
      if (await clickMatchingOption()) return true;

      if (await input.isVisible().catch(() => false)) await input.fill('').catch(() => {});
      await input.focus().catch(() => {});
      if (await input.isVisible().catch(() => false)) {
        await input.pressSequentially(queryText, { delay: 35 }).catch(async () => {
          if (keyboard) await keyboard.type(queryText, { delay: 35 }).catch(() => {});
        });
      }
      for (let optionAttempt = 0; optionAttempt < 10; optionAttempt++) {
        if (page?.waitForTimeout) await page.waitForTimeout(300);
        if ((await container.$$(optionSelector).catch(() => [])).length > 0) break;
      }
      if (await clickMatchingOption()) return true;
      await input.press('Escape').catch(() => {});
    } catch (_) {}
  }

  const optionCount = (await container.$$(optionSelector).catch(() => [])).length;
  if (optionCount === 0) {
    if (page?.waitForTimeout) await page.waitForTimeout(250);
    return false;
  }

  if (keyboard) {
    await keyboard.press('ArrowDown').catch(() => {}); await keyboard.press('ArrowDown').catch(() => {});
    await keyboard.press('Enter').catch(() => {});
    await keyboard.press('Tab').catch(() => {});
    if (page?.waitForTimeout) await page.waitForTimeout(250);
  }

  return false;
}

async function fillGreenhouseUrlFields(container, profile) {
  const portfolioUrl = profile.personal.links.portfolio;
  const linkedInUrl = profile.personal.links.linkedin;
  await container.evaluate(({ portfolioUrl, linkedInUrl }) => {
    const labelNodes = [...document.querySelectorAll('label, legend, .field-label, h3, h4')];
    for (const lbl of labelNodes) {
      const labelText = (lbl.innerText || '').toLowerCase();
      let url = '';
      if (/^\s*password\s*\*?\s*$/i.test(labelText.trim()) || /portfolio\s*password|password\s*for\s*portfolio/i.test(labelText)) {
        continue;
      } else if (/portfolio|personal website|website url/i.test(labelText)) {
        url = portfolioUrl;
      } else if (/linkedin/i.test(labelText)) {
        url = linkedInUrl;
      } else {
        continue;
      }
      const root = lbl.closest('.field, .application-field, fieldset, .question, div[class*="field"]') || lbl.parentElement;
      const input = root?.querySelector('input[type="text"], input[type="url"], input:not([type="hidden"]):not([type="file"]):not([type="checkbox"]):not([type="radio"]), textarea');
      if (input && !input.value?.trim()) {
        input.focus();
        input.value = url;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  }, { portfolioUrl, linkedInUrl }).catch(() => {});
}

async function resolveGreenhouseSubmitButton(container) {
  const specificSelectors = [
    '#submit_app',
    'input#submit_app[type="submit"]',
    'input[type="submit"]',
    'button#submit_app',
    'button:has-text("Submit application")',
    'button:has-text("Submit Application")',
    'button:has-text("Submit")',
    'button[type="submit"]',
    'button[type="submit"]:has-text("Submit application")',
    'button[type="submit"]:has-text("Submit Application")',
    'form[action*="application"] button[type="submit"]',
    '#application_form button[type="submit"]',
    'button[type="submit"]:has-text("Submit")',
  ];
  for (const sel of specificSelectors) {
    const btn = await container.$(sel).catch(() => null);
    if (!btn) continue;
    const visible = await btn.isVisible().catch(() => false);
    if (!visible) continue;
    const text = await btn.evaluate(el => (el.innerText || el.value || '').trim()).catch(() => '');
    if (/^apply$/i.test(text)) continue;
    return btn;
  }
  const submitLike = await container.$$('button:has-text("Submit"), input[type="submit"]');
  let best = null;
  let bestY = -1;
  for (const btn of submitLike) {
    const visible = await btn.isVisible().catch(() => false);
    if (!visible) continue;
    const text = await btn.evaluate(el => (el.innerText || el.value || '').trim()).catch(() => '');
    if (/^apply$/i.test(text)) continue;
    const box = await btn.boundingBox().catch(() => null);
    const y = box?.y ?? 0;
    if (y >= bestY) {
      bestY = y;
      best = btn;
    }
  }
  return best;
}

async function fillGreenhouseCustomQuestions(container, profile, keyboard, page) {
  // 1. Classic HTML <select> elements
  const selects = await container.$$('select');
  for (const select of selects) {
    const labelText = await container.evaluate(el => {
      const parent = el.closest('div, fieldset');
      return parent ? parent.innerText.toLowerCase() : '';
    }, select);

    if (/authorized to work|legal right to work/i.test(labelText)) {
      await select.selectOption({ label: /Yes/i }, { force: true }).catch(() => {});
    } else if (/start month|start date.*month/i.test(labelText)) {
      await select.selectOption({ label: /August|08/i }, { force: true }).catch(() => {});
    } else if (/start year|start date.*year/i.test(labelText)) {
      await select.selectOption({ label: /2008/i }, { force: true }).catch(() => {});
    } else if (/end month|end date.*month/i.test(labelText)) {
      await select.selectOption({ label: /May|05/i }, { force: true }).catch(() => {});
    } else if (/end year|end date.*year/i.test(labelText)) {
      await select.selectOption({ label: /2012/i }, { force: true }).catch(() => {});
    } else if (/sponsorship|visa/i.test(labelText)) {
      await select.selectOption({ label: /^no$|\bno\b|not require|do not require/i }, { force: true }).catch(() => {});
    } else if (/worked for|previously employed|contractor|worked.*before/i.test(labelText)) {
      await select.selectOption({ label: /^no$|\bno\b/i }, { force: true }).catch(() => {});
    } else if (/transgender/i.test(labelText)) {
      await select.selectOption({ label: /^no$|\bno\b/i }, { force: true }).catch(() => {});
    } else if (/sexual orientation/i.test(labelText)) {
      await select.selectOption({ label: /Heterosexual|Straight/i }, { force: true }).catch(() => {});
    } else if (/age range/i.test(labelText)) {
      await select.selectOption({ label: /35-39|30-39|35 - 39/i }, { force: true }).catch(() => {});
    } else if (/region/i.test(labelText)) {
      await select.selectOption({ label: /United States/i }, { force: true }).catch(() => {});
    } else if (/veteran/i.test(labelText)) {
      await select.selectOption({ label: /Yes|protected veteran/i }, { force: true }).catch(() => {});
    } else if (/disability/i.test(labelText)) {
      await select.selectOption({ label: /^no$|\bno\b|do not have a disability/i }, { force: true }).catch(() => {});
    } else if (/gender|sex/i.test(labelText)) {
      await select.selectOption({ label: /Male|Man/i }, { force: true }).catch(() => {});
    } else if (/race|ethnicity|hispanic/i.test(labelText)) {
      await select.selectOption({ label: /White|Caucasian|not hispanic/i }, { force: true }).catch(() => {});
    } else if (/school|university|college/i.test(labelText)) {
      await select.selectOption({ label: new RegExp((profile.education[2]?.institution || 'Clarion').split(' ')[0], 'i') }, { force: true }).catch(() => {});
    } else if (/degree/i.test(labelText)) {
      await select.selectOption({ label: /BA|Bachelor/i }, { force: true }).catch(() => {});
    } else if (/discipline|major/i.test(labelText)) {
      await select.selectOption({ label: /Anthropology|Design/i }, { force: true }).catch(() => {});
    } else if (/18\+ years|18 years or older|older than 18/i.test(labelText)) {
      await select.selectOption({ label: /Yes/i }, { force: true }).catch(() => {});
    } else {
      // Fallback: if unhandled and looks like it's still unselected ("Select..."), pick the first valid option or a generic answer
      const currentSelected = await select.evaluate(el => el.options[el.selectedIndex]?.text || '').catch(()=>'');
      if (currentSelected.includes('Select') || currentSelected === '' || currentSelected.includes('Choose')) {
        const answers = getGreenhouseDropdownAnswers(labelText, profile);
        let handled = false;
        for (const ans of answers) {
          try {
            const valToSelect = await select.evaluate((el, target) => {
              for (const opt of el.options) {
                if (opt.text.toLowerCase().includes(target.toLowerCase())) {
                  return opt.value;
                }
              }
              return null;
            }, ans);
            
            if (valToSelect) {
              await select.selectOption(valToSelect, { force: true }).catch(()=>{});
              handled = true;
              break;
            }
          } catch(e) {}
        }
        if (!handled) {
          // just pick the second option (first is usually 'Select...') if it exists
          const valToSelect = await select.evaluate(el => {
            if (el.options.length > 1) {
               let idx = 1;
               while(idx < el.options.length && (el.options[idx].disabled || el.options[idx].text.includes('Select'))) {
                 idx++;
               }
               if (idx < el.options.length) {
                 return el.options[idx].value;
               }
            }
            return null;
          }).catch(()=>null);
          
          if (valToSelect) {
            await select.selectOption(valToSelect, { force: true }).catch(()=>{});
          }
        }
      }
    }
  }

  // 2. Modern React-Select / Custom UI dropdown controls
  const reactSelects = await container.$$('.select__control, div[role="combobox"], button[aria-haspopup="listbox"], button[role="combobox"], div[class*="Select-control"]');
  console.log(`[Greenhouse] Found ${reactSelects.length} custom controls`);
  let debugIdx = 0;
  for (const control of reactSelects) {
    debugIdx++;
    console.log(`[Greenhouse] Processing control ${debugIdx}/${reactSelects.length}`);
    // Resolve the question label by checking ancestors and preceding headers/legends/labels
    const fieldText = await container.evaluate(el => {
      const wrapper = el.closest('.field, .application-field, fieldset, div[class*="field"], div[class*="Question"], div[class*="group"]');
      if (wrapper && wrapper.querySelectorAll('input:not([type="hidden"]), textarea, select, .select__control, [role="combobox"], [aria-haspopup="listbox"]').length === 1) {
        if (wrapper.innerText) return wrapper.innerText.toLowerCase();
      }

      let curr = el;
      while (curr && curr !== document.body) {
        const lbl = curr.querySelector('label, legend, h3, h4');
        if (lbl && lbl.innerText) return lbl.innerText.toLowerCase();
        if (curr.previousElementSibling) {
          if (/label|legend|h3|h4/i.test(curr.previousElementSibling.tagName)) {
            return curr.previousElementSibling.innerText.toLowerCase();
          }
          if (!curr.previousElementSibling.querySelector('input:not([type="hidden"]), textarea, select, .select__control, [role="combobox"], [aria-haspopup="listbox"]')) {
            const text = curr.previousElementSibling.innerText;
            if (text && text.trim().length > 0 && text.length < 150) {
              return text.toLowerCase();
            }
          }
        }
        curr = curr.parentElement;
      }
      return el.innerText.toLowerCase();
    }, control);

    const controlText = await container.evaluate(el => el.innerText, control);
    if (controlText.includes('Select...') || controlText.includes('Select a country') || controlText.includes('Select…') || controlText === '') {
        const answerOptions = getGreenhouseDropdownAnswers(fieldText, profile);
        const answer = answerOptions[0] || '';

        try {
          if (!(await control.isVisible().catch(() => false))) continue;
          await control.click({ force: true, timeout: 2000 }).catch(() => {});
          if (page?.waitForTimeout) await page.waitForTimeout(400);

          if (!answer) {
            // Unmapped question: select the second option (first is usually "Select...") to bypass validation
            let options = await container.$$('.select__option:visible, div[id*="option"]:visible, div[role="option"]:visible, li[role="option"]:visible');
            if (options && options.length > 1) {
              await options[1].click({ force: true, timeout: 2000 }).catch(() => {});
            } else if (options && options.length === 1) {
              await options[0].click({ force: true, timeout: 2000 }).catch(() => {});
            } else if (keyboard) {
              await keyboard.press('ArrowDown').catch(() => {}); await keyboard.press('ArrowDown').catch(() => {});
              await keyboard.press('ArrowDown').catch(() => {}); await keyboard.press('ArrowDown').catch(() => {});
              await keyboard.press('Enter').catch(() => {});
            }
            continue;
          }

            let option = null;
            const candidateList = [...new Set(answerOptions.filter(Boolean).concat([answer]))];
            for (const candidate of candidateList) {
              option = await container.$(`.select__option:visible:has-text("${candidate}"), div[id*="option"]:visible:has-text("${candidate}"), div[role="option"]:visible:has-text("${candidate}"), li[role="option"]:visible:has-text("${candidate}")`);
              if (option) break;
            }

            if (!option && /disability|race|ethnicity|gender|transgender|sexual orientation|age range|veteran/i.test(fieldText)) {
              option = await container.$(`
                .select__option:visible:has-text("not wish"), .select__option:visible:has-text("prefer not"), .select__option:visible:has-text("Decline"), .select__option:visible:has-text("disclose"),
                div[role="option"]:visible:has-text("not wish"), div[role="option"]:visible:has-text("prefer not"), div[role="option"]:visible:has-text("Decline"), div[role="option"]:visible:has-text("disclose"),
                div[id*="option"]:visible:has-text("not wish"), div[id*="option"]:visible:has-text("prefer not"), div[id*="option"]:visible:has-text("Decline"), div[id*="option"]:visible:has-text("disclose"),
                li[role="option"]:visible:has-text("not wish"), li[role="option"]:visible:has-text("prefer not"), li[role="option"]:visible:has-text("Decline"), li[role="option"]:visible:has-text("disclose")
              `.replace(/\s+/g, ' '));
            }

            if (option) {
              await option.click({ force: true, timeout: 2000 }).catch(() => {});
              if (page?.waitForTimeout) await page.waitForTimeout(300);
            } else {
              const input = await control.$('input');
              if (input && (await input.isVisible().catch(() => false))) {
                await input.fill(answer);
                if (page?.waitForTimeout) await page.waitForTimeout(400);

                let typedOption = null;
                for (const candidate of answerOptions) {
                  typedOption = await container.$(`.select__option:visible:has-text("${candidate}"), div[id*="option"]:visible:has-text("${candidate}"), div[role="option"]:visible:has-text("${candidate}"), li[role="option"]:visible:has-text("${candidate}")`);
                  if (typedOption) break;
                }

                if (typedOption) {
                  await typedOption.click({ force: true, timeout: 2000 }).catch(() => {});
                  if (page?.waitForTimeout) await page.waitForTimeout(200);
                } else {
                  let firstOption = await container.$('.select__option:visible, div[id*="option"]:visible, div[role="option"]:visible, li[role="option"]:visible');
                  if (!firstOption) {
                    if (await input.isVisible().catch(() => false)) await input.fill('');
                    if (page?.waitForTimeout) await page.waitForTimeout(300);
                    if (/disability|race|ethnicity|gender|transgender|sexual orientation|age range|veteran/i.test(fieldText)) {
                      if (await input.isVisible().catch(() => false)) await input.fill('Decline');
                      if (page?.waitForTimeout) await page.waitForTimeout(300);
                    }
                    firstOption = await container.$('.select__option:visible, div[id*="option"]:visible, div[role="option"]:visible, li[role="option"]:visible');
                  }

                  if (firstOption) {
                    await firstOption.click({ force: true, timeout: 2000 }).catch(() => {});
                    if (page?.waitForTimeout) await page.waitForTimeout(200);
                  } else if (/school|university|college/i.test(fieldText)) {
                    if (await input.isVisible().catch(() => false)) {
                      await input.fill('');
                      await input.type('Other');
                    }
                    if (page?.waitForTimeout) await page.waitForTimeout(500);
                    const otherOption = await container.$('.select__option:visible, div[id*="option"]:visible, div[role="option"]:visible, li[role="option"]:visible');
                    if (otherOption) {
                      await otherOption.click({ force: true, timeout: 2000 }).catch(() => {});
                      if (page?.waitForTimeout) await page.waitForTimeout(200);
                    }
                  } else if (keyboard) {
                    await keyboard.press('ArrowDown').catch(() => {}); await keyboard.press('ArrowDown').catch(() => {});
                    await keyboard.press('Enter').catch(() => {});
                    if (page?.waitForTimeout) await page.waitForTimeout(200);
                  }
                }
              } else if (keyboard) {
                await keyboard.type(answer);
                if (page?.waitForTimeout) await page.waitForTimeout(300);
                await keyboard.press('Enter');
              }
            }
          } catch (e) {
            // Ignore control interaction errors
          }
      }
    }

  // 3. Custom Text Inputs & Textareas
  const customTexts = await container.$('input:not([type="hidden"]):not([type="file"]):not([type="checkbox"]):not([type="radio"]):not([id*="first_name"]):not([name*="first_name"]):not([id*="last_name"]):not([name*="last_name"]), textarea');
  for (const input of customTexts) {
    if (!(await input.isVisible().catch(() => false))) continue;
    const existingVal = await input.inputValue().catch(() => '');
    if (existingVal && existingVal.trim().length > 0) continue;

    const labelText = await container.evaluate(el => {
      let lbl = el.labels && el.labels.length > 0 ? el.labels[0].innerText : null;
      if (!lbl) {
        let curr = el;
        while (curr && curr !== document.body) {
          const wrapperLbl = curr.querySelector('label, legend, h3, h4');
          if (wrapperLbl && wrapperLbl.innerText) { lbl = wrapperLbl.innerText; break; }
          curr = curr.parentElement;
        }
      }
      return lbl ? lbl.trim() : '';
    }, input);

    if (labelText) {
      const answer = getGroundedFieldAnswer({ fieldText: labelText, profile });
      if (answer && answer !== 'SKIP') {
        await input.fill(answer).catch(() => {});
      } else {
        // Fallback generic answer
        await input.fill('N/A').catch(() => {});
      }
      if (page?.waitForTimeout) await page.waitForTimeout(200);
    }
  }

  // 4. Mandatory Consent Checkboxes (e.g. "I consent to Smartsheet collecting, storing...")
  const consentCheckboxes = await container.$$('input[type="checkbox"]');
  for (const cb of consentCheckboxes) {
    const parentText = await container.evaluate(el => {
      let curr = el;
      let text = '';
      while (curr && curr !== document.body) {
         if (curr.innerText) { text = curr.innerText; break; }
         curr = curr.parentElement;
      }
      return text.toLowerCase();
    }, cb);

    const isRequired = await cb.evaluate(el => el.required || el.getAttribute('aria-required') === 'true').catch(() => false);

    if (isRequired || parentText.includes('*') || /consent|terms|acknowledge|agree|certify|privacy|checking this box/i.test(parentText)) {
      const isChecked = await cb.isChecked().catch(() => false);
      if (!isChecked) {
        console.log(`[Greenhouse] Checking required consent checkbox.`);
        await cb.check({ force: true }).catch(() => {});
      }
    }
  }
}

/**
 * Autonomous Captcha Detection & Resolution Module
 * Handles Cloudflare Turnstile and reCAPTCHA v2 / hCaptcha challenges.
 */

export async function detectAndSolveCaptchas(page) {
  let solvedAny = false;

  // 1. Cloudflare Turnstile
  const turnstileFrame = page.frames().find(f => f.url().includes('cloudflare') || f.url().includes('turnstile'));
  if (turnstileFrame) {
    console.log('[Captcha] Cloudflare Turnstile iframe detected.');
    try {
      const checkbox = await turnstileFrame.$('input[type="checkbox"], #challenge-stage, .ctp-checkbox-label');
      if (checkbox) {
        console.log('[Captcha] Clicking Cloudflare Turnstile checkbox...');
        await checkbox.scrollIntoViewIfNeeded().catch(() => {});
        const box = await checkbox.boundingBox();
        if (box) {
          // Human-like curved jitter click
          await page.mouse.move(box.x + box.width / 2 + (Math.random() * 6 - 3), box.y + box.height / 2 + (Math.random() * 6 - 3), { steps: 8 });
          await page.waitForTimeout(150 + Math.random() * 100);
          await page.mouse.down();
          await page.waitForTimeout(80);
          await page.mouse.up();
          await page.waitForTimeout(2000);
          solvedAny = true;
        }
      }
    } catch (e) {
      console.warn(`[Captcha] Turnstile interaction note:`, e.message);
    }
  }

  // 2. Google reCAPTCHA v2 Checkbox
  const recaptchaFrames = page.frames().filter(f => f.url().includes('google.com/recaptcha/api2/anchor'));
  for (const frame of recaptchaFrames) {
    try {
      const anchor = await frame.$('#recaptcha-anchor');
      if (anchor) {
        const isChecked = await frame.$eval('#recaptcha-anchor', el => el.getAttribute('aria-checked') === 'true').catch(() => false);
        if (!isChecked) {
          console.log('[Captcha] Unchecked reCAPTCHA v2 anchor detected. Clicking...');
          await anchor.scrollIntoViewIfNeeded().catch(() => {});
          const box = await anchor.boundingBox();
          if (box) {
            await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 5 });
            await page.mouse.down();
            await page.waitForTimeout(100);
            await page.mouse.up();
            await page.waitForTimeout(2000);
            solvedAny = true;
          }
        }
      }
    } catch (e) {}
  }

  // 3. Audio challenge solver fallback for reCAPTCHA bframe
  const bFrame = page.frames().find(f => f.url().includes('google.com/recaptcha/api2/bframe'));
  if (bFrame && process.env.GEMINI_API_KEY) {
    try {
      const audioBtn = await bFrame.$('#recaptcha-audio-button');
      if (audioBtn && (await audioBtn.isVisible().catch(() => false))) {
        console.log('[Captcha] Attempting reCAPTCHA audio challenge bypass...');
        await audioBtn.click({ force: true }).catch(() => {});
        await page.waitForTimeout(1500);

        const downloadLink = await bFrame.$eval('.rc-audiochallenge-tdownload-link', el => el.href).catch(() => null);
        if (downloadLink) {
          console.log('[Captcha] Found audio payload URL:', downloadLink);
          const audioResp = await fetch(downloadLink);
          const arrayBuffer = await audioResp.arrayBuffer();
          const base64Audio = Buffer.from(arrayBuffer).toString('base64');

          // Send audio payload to Gemini 2.5 Flash for transcription
          const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;
          const resp = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': process.env.GEMINI_API_KEY
            },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { text: 'Transcribe only the spoken digits or numbers from this audio accurately. Return only the digits, nothing else.' },
                  {
                    inline_data: {
                      mime_type: 'audio/mp3',
                      data: base64Audio
                    }
                  }
                ]
              }]
            }),
            signal: AbortSignal.timeout(20000)
          });

          if (resp.ok) {
            const data = await resp.json();
            const digits = data.candidates?.[0]?.content?.parts?.[0]?.text?.replace(/\D/g, '');
            if (digits) {
              console.log(`[Captcha] Gemini transcribed captcha audio: "${digits}"`);
              const audioInput = await bFrame.$('#audio-response');
              if (audioInput) {
                await audioInput.fill(digits);
                const verifyBtn = await bFrame.$('#recaptcha-verify-button');
                if (verifyBtn) await verifyBtn.click();
                await page.waitForTimeout(2000);
                solvedAny = true;
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn('[Captcha] Audio solver note:', e.message);
    }
  }

  return solvedAny;
}

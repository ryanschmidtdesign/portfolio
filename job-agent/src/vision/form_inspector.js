import { db } from '../storage/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const limitsPath = path.join(__dirname, '../../config/limits.json');
let limits = { weeklyTokenBudget: 500000 };
try {
  limits = JSON.parse(fs.readFileSync(limitsPath, 'utf8'));
} catch (e) {}

/**
 * Inspects a page visually using Gemini Vision when DOM selectors fail.
 * Returns actionable coordinates or selector advice to unblock the submission.
 */
export async function inspectFormVisually({ page, reason = 'Form submission blocked or missing required field' }) {
  if (!process.env.GEMINI_API_KEY) {
    console.warn('[Vision] No GEMINI_API_KEY available. Skipping visual inspection.');
    return null;
  }

  if (db.isTokenUsageCapped(limits.weeklyTokenBudget)) {
    console.warn('[Vision] Token usage capped. Skipping visual inspection.');
    return null;
  }

  try {
    const screenshotBuffer = await page.screenshot({ fullPage: false, type: 'jpeg', quality: 75 });
    const base64Image = screenshotBuffer.toString('base64');
    const viewport = page.viewportSize() || { width: 1280, height: 800 };

    const prompt = `You are an automated QA bot helping submit a job application form.
The form is currently stuck or failing with this reason: "${reason}".
Viewport size: width=${viewport.width}, height=${viewport.height}.

Analyze this screenshot carefully:
1. Find any highlighted red validation errors, unfulfilled required asterisks (*), unchecked consent boxes, or disabled/active "Submit" or "Apply" buttons.
2. Return a strict JSON object with:
   - "unresolvedIssue": brief description of what is blocking submission.
   - "targetAction": "click" | "check" | "type" | "none"
   - "coordinates": { "x": number, "y": number } (center coordinates within the ${viewport.width}x${viewport.height} viewport)
   - "suggestedInputText": string if typing is needed, else null.

Respond ONLY with valid JSON. No markdown fences.`;

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
            { text: prompt },
            {
              inline_data: {
                mime_type: 'image/jpeg',
                data: base64Image
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json'
        }
      }),
      signal: AbortSignal.timeout(30000)
    });

    if (!resp.ok) return null;

    const data = await resp.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const usage = data.usageMetadata?.totalTokenCount || 600;
    db.addTokenUsage(usage, limits.weeklyTokenBudget);

    if (!rawText) return null;
    const parsed = JSON.parse(rawText.replace(/```json/g, '').replace(/```/g, '').trim());
    console.log(`[Vision] Inspection output:`, parsed);
    return parsed;
  } catch (err) {
    console.warn(`[Vision] Visual inspection failed:`, err.message);
    return null;
  }
}

/**
 * Attempts an autonomous visual recovery click if an element was missed.
 */
export async function attemptVisualRecovery(page, reason) {
  const result = await inspectFormVisually({ page, reason });
  if (!result || !result.coordinates) return false;

  const { x, y } = result.coordinates;
  if (typeof x === 'number' && typeof y === 'number' && x > 0 && y > 0) {
    console.log(`[Vision] Attempting recovery action "${result.targetAction}" at (${x}, ${y})...`);
    await page.mouse.move(x, y, { steps: 5 });
    await page.waitForTimeout(200);
    await page.mouse.down();
    await page.waitForTimeout(100);
    await page.mouse.up();

    if (result.suggestedInputText) {
      await page.waitForTimeout(200);
      await page.keyboard.type(result.suggestedInputText, { delay: 30 });
    }
    return true;
  }
  return false;
}

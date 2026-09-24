import { db } from '../storage/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const limitsPath = path.join(__dirname, '../../config/limits.json');
const limits = JSON.parse(fs.readFileSync(limitsPath, 'utf8'));

export async function generateDynamicFieldAnswer({ question, profile, jobTitle, company, isRequired = false }) {
  if (!process.env.GEMINI_API_KEY) return null;
  
  if (db.isTokenUsageCapped(limits.weeklyTokenBudget)) {
    console.warn('[Gemini API] Token limit reached. Skipping dynamic field generation.');
    return null;
  }

  const prompt = `You are filling out a job application for Ryan Schmidt applying for ${jobTitle} at ${company}.
The application form asked a custom question that we don't have a hardcoded answer for.
Question: "${question}"
Is Required: ${isRequired}

Ryan's Profile facts (do not invent or hallucinate anything outside this):
${JSON.stringify(profile, null, 2)}

Rules:
1. Provide ONLY the answer text to be typed into the input field. Do not include quotes, pleasantries, or explanations.
2. If it asks a yes/no question, answer "Yes" or "No".
3. If it asks for an explanation or essay, answer truthfully based on the profile, keeping it under 3 sentences. Emphasize his unique prototyping-in-code approach (Cursor, HTML) if relevant.
4. If the question asks for something Ryan does not have and the field is REQUIRED (Is Required: true), state "I do not have this." or a polite equivalent.
5. If the question asks for something Ryan does not have and it is OPTIONAL (Is Required: false), or if the best answer is to leave it blank, output exactly the word: SKIP
6. If the question is bizarre (e.g. "What is your favorite cereal?"), answer playfully but professionally.
7. **DEFENSIVE STRATEGY (CRITICAL):** If the question asks for salary expectations, ALWAYS answer "Negotiable" or "Flexible". If it asks if he requires visa sponsorship now or in the future, ALWAYS answer "No". If it asks if he is willing to relocate, answer "Yes". Never provide a strict number for salary that could trigger an auto-reject.

Answer:`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GEMINI_API_KEY
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 150
        }
      }),
      signal: AbortSignal.timeout(20000)
    });

    if (!resp.ok) return null;

    const json = await resp.json();
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    const usage = json.usageMetadata?.totalTokenCount || 200;
    db.addTokenUsage(usage, limits.weeklyTokenBudget);
    
    if (!text) return null;
    return text.trim();
  } catch (err) {
    return null;
  }
}

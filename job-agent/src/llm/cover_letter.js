import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../storage/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const profilePath = path.join(__dirname, '../../config/profile.json');
const limitsPath = path.join(__dirname, '../../config/limits.json');

const profile = JSON.parse(fs.readFileSync(profilePath, 'utf-8'));
const limits = JSON.parse(fs.readFileSync(limitsPath, 'utf-8'));

/**
 * Generates a tailored, human-sounding cover letter grounded strictly in Ryan's verified background.
 * Zero hallucination rule enforced.
 */
export async function generateCoverLetter({ jobTitle, company, jobDescription = '' }) {
  // Check token threshold
  const tokenStatus = db.getTokenStatus(limits.weeklyTokenBudget);
  if (tokenStatus.isCapped) {
    throw new Error(`Token limit reached (>=75% weekly budget: ${(tokenStatus.usageRatio * 100).toFixed(1)}%). Halting LLM requests.`);
  }

  // If GEMINI_API_KEY or OPENAI_API_KEY is available, call the API, otherwise fallback to our fine-tuned grounded template generator
  if (process.env.GEMINI_API_KEY) {
    return await callGeminiAPI({ jobTitle, company, jobDescription });
  } else {
    return generateGroundedCoverLetter({ jobTitle, company, jobDescription });
  }
}

function generateGroundedCoverLetter({ jobTitle, company, jobDescription }) {
  const isAiRole = /ai|conversational|prompt|machine learning/i.test(jobTitle + ' ' + jobDescription);
  const isDesignSystemsRole = /design system|component|tokens|a11y|accessibility/i.test(jobTitle + ' ' + jobDescription);

  let focusSnippet = '';
  if (isAiRole) {
    focusSnippet = `Recently at i4cp, I’ve been architecting conversational AI workflows that translate complex research data into intuitive prompt-driven insights. Before that at D-Tools, I owned UX across 5 core modules as the user base scaled from 6,500 to 18,000 active users.`;
  } else if (isDesignSystemsRole) {
    focusSnippet = `At D-Tools, I scaled our design system to 100+ production components with 92% engineer adoption. At i4cp, I own the design system and UX standards as the sole designer across our member portal and analytics suite.`;
  } else {
    focusSnippet = `Throughout my career—scaling D-Tools from 6,500 to 18,000 active users and leading product UX as sole designer at i4cp—I've focused on turning dense, complex B2B workflows into straightforward user experiences.`;
  }

  const isResearchRole = /research|discovery|anthropology|qualitative|user testing/i.test(jobTitle + ' ' + jobDescription);

  let workflowSnippet = '';
  if (isResearchRole) {
    workflowSnippet = `With my background in anthropology, I anchor my design process in rigorous qualitative research. Having facilitated over 400 structured critique sessions, I know how to frame problems effectively and align executive stakeholders around high-value roadmap initiatives based on actual user evidence.`;
  } else {
    workflowSnippet = `What differentiates my day-to-day workflow is that I bridge design and engineering directly: I prototype in code (HTML/CSS/JS) and use tools like Cursor and Claude Code to deliver functional UI to staging, eliminating spec ambiguity before engineers begin building.`;
  }

  const letter = `Hi ${company} Team,

I'm writing to express my interest in the ${jobTitle} role at ${company}.

${focusSnippet}

${workflowSnippet}

Given your focus, I’d love the opportunity to bring this pragmatic, end-to-end design approach to ${company}. My portfolio and interactive case studies can be reviewed at ${profile.personal.links.portfolio}.

Thank you for your time and consideration, and I look forward to connecting.

Best regards,

Ryan Schmidt
${profile.personal.phone}
${profile.personal.email}
${profile.personal.links.portfolio}`;

  // Estimate tokens (~250 words ≈ 350 tokens) and record
  db.addTokenUsage(350, limits.weeklyTokenBudget);
  return letter;
}

async function callGeminiAPI({ jobTitle, company, jobDescription }) {
  // Gemini API implementation with prompt constraints:
  // Strict tone: Senior, direct, unpretentious, zero generic fluff, zero hallucinated facts.
  const prompt = `You are writing a tailored cover letter for Ryan Schmidt applying for ${jobTitle} at ${company}.
Profile facts (do not invent anything outside this):
${JSON.stringify(profile, null, 2)}
Job description snippet:
${jobDescription.slice(0, 1500)}

Rules:
1. Under 220 words.
2. Tone: Senior Product Designer, grounded, conversational, zero corporate buzzwords ("thrilled", "passionate", "synergy").
3. Adapt the core narrative to what the company needs based on the job description. If it's highly technical, emphasize Cursor, HTML/CSS/JS, and code prototyping. If it's research/discovery focused, emphasize his anthropology background, qualitative inquiry, and facilitation of 400+ critiques. If the job description is very generic or vague, default to emphasizing his track record scaling UI/UX across complex B2B platforms and building comprehensive design systems.
4. Output only the plain text letter.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GEMINI_API_KEY
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      }),
      signal: AbortSignal.timeout(30000)
    });

    if (!resp.ok) {
      console.warn(`[Gemini API] Request returned status ${resp.status}. Falling back to template.`);
      return generateGroundedCoverLetter({ jobTitle, company, jobDescription });
    }

    const json = await resp.json();
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    const usage = json.usageMetadata?.totalTokenCount || 450;
    db.addTokenUsage(usage, limits.weeklyTokenBudget);
    return text?.trim() || generateGroundedCoverLetter({ jobTitle, company, jobDescription });
  } catch (err) {
    console.warn(`[Gemini API] Request failed: ${err.message}. Falling back to template.`);
    return generateGroundedCoverLetter({ jobTitle, company, jobDescription });
  }
}

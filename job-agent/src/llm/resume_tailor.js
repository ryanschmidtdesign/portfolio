import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import { db } from '../storage/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const templatePath = path.join(__dirname, '../../templates/resume_template.html');
const profilePath = path.join(__dirname, '../../config/profile.json');
const limitsPath = path.join(__dirname, '../../config/limits.json');

const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
let limits = { weeklyTokenBudget: 500000 };
try {
  limits = JSON.parse(fs.readFileSync(limitsPath, 'utf8'));
} catch (e) {}

/**
 * Dynamically synthesizes an ATS-optimized summary and bullet emphasis,
 * then renders an on-the-fly PDF using Playwright headless print.
 */
export async function generateTailoredResumePdf({ jobTitle = '', company = '', jobDescription = '' } = {}) {
  const outputDir = path.join(__dirname, '../../scratch/resumes');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const sanitizedCompany = company.replace(/[^a-zA-Z0-9]/g, '_') || 'Company';
  const outputPath = path.join(outputDir, `Ryan_Schmidt_Resume_${sanitizedCompany}.pdf`);

  let tailoredSummary = "Senior Product Designer with 6 years of experience driving product outcomes across complex B2B SaaS, developer tooling, and workflow automation. Bridges end-to-end design and front-end engineering by building working code prototypes (HTML/CSS/JS, Cursor, React) that eliminate spec ambiguity.";
  
  let tailoredUxSkills = "Product Architecture, User Journey Mapping, Wireframing, Qualitative Research, Critique Facilitation";
  let tailoredTechSkills = "HTML5, CSS3/Tailwind, JavaScript, React, Cursor, Playwright, Git";

  if (process.env.GEMINI_API_KEY && !db.isTokenUsageCapped(limits.weeklyTokenBudget)) {
    try {
      const prompt = `You are an expert executive resume writer. Tailor this resume for Ryan Schmidt applying for "${jobTitle}" at "${company}".
Strict constraint: Use ONLY true facts from his profile (6 years product design experience, currently CX/UX Designer at i4cp, formerly D-Tools scaling 5 core modules from 6.5k to 18k users, code prototyping in Cursor/HTML/JS, Clarion Anthropology BA).
Job description context:
${jobDescription.slice(0, 1500)}

Output ONLY a JSON object with exactly three keys:
1. "summary": A highly tailored 2-sentence summary.
2. "uxSkills": A comma-separated list of 5 UX skills relevant to the job (e.g. Wireframing, Research).
3. "techSkills": A comma-separated list of 5 technical skills relevant to the job (e.g. HTML, CSS, React, Playwright, Cursor).

Output raw JSON only.`;

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': process.env.GEMINI_API_KEY
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 300 }
        }),
        signal: AbortSignal.timeout(30000)
      });

      if (resp.ok) {
        const json = await resp.json();
        let text = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
        if (text) {
          text = text.replace(/^```json/i, '').replace(/```$/, '').trim();
          const parsed = JSON.parse(text);
          if (parsed.summary) tailoredSummary = parsed.summary;
          if (parsed.uxSkills) tailoredUxSkills = parsed.uxSkills;
          if (parsed.techSkills) tailoredTechSkills = parsed.techSkills;
          const usage = json.usageMetadata?.totalTokenCount || 250;
          db.addTokenUsage(usage, limits.weeklyTokenBudget);
        }
      }
    } catch (e) {
      console.warn('[ResumeTailor] AI summary fallback:', e.message);
    }
  }

  // Format experience HTML
  const experienceHtml = profile.experience.slice(0, 4).map(exp => `
    <div class="job">
      <div class="job-header">
        <div><span class="job-role">${exp.title}</span> &bull; <span class="job-company">${exp.company}</span></div>
        <div class="job-dates">${exp.period || ''} &bull; ${exp.location || 'Remote'}</div>
      </div>
      <ul>
        ${(exp.highlights || []).map(h => `<li>${h}</li>`).join('')}
      </ul>
    </div>
  `).join('');

  let template = fs.readFileSync(templatePath, 'utf8');
  template = template
    .replace('{{name}}', `${profile.personal.firstName} ${profile.personal.lastName}`)
    .replace('{{headline}}', 'Senior Product Designer &bull; Systems & Code Prototyping')
    .replace('{{location}}', `${profile.personal.location.city}, ${profile.personal.location.stateAbbr}`)
    .replace('{{phone}}', profile.personal.phone)
    .replace(/\{\{email\}\}/g, profile.personal.email)
    .replace(/\{\{portfolio\}\}/g, profile.personal.links.portfolio)
    .replace('{{linkedin}}', profile.personal.links.linkedin)
    .replace('{{tailoredSummary}}', tailoredSummary)
    .replace('{{uxSkills}}', tailoredUxSkills)
    .replace('{{techSkills}}', tailoredTechSkills)
    .replace('{{strategySkills}}', 'Figma Design Systems, Design Tokens, B2B SaaS Workflows, Metric Attribution')
    .replace('{{aiSkills}}', 'Conversational AI UX, Claude Code, Prompt Optimization, LLM Workflow Prototyping')
    .replace('{{experienceList}}', experienceHtml)
    .replace('{{degree}}', profile.education[2]?.degree || 'BA in Anthropology')
    .replace('{{institution}}', profile.education[2]?.institution || 'Clarion University');

  // Render to PDF via Playwright
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setContent(template, { waitUntil: 'networkidle' });
  await page.pdf({
    path: outputPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '24px', bottom: '24px', left: '32px', right: '32px' }
  });
  await browser.close();

  console.log(`[ResumeTailor] Bespoke tailored PDF rendered: ${outputPath}`);
  return outputPath;
}

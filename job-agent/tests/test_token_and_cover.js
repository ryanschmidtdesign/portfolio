import { db } from '../src/storage/db.js';
import { generateCoverLetter } from '../src/llm/cover_letter.js';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const limitsPath = path.join(__dirname, '../config/limits.json');
const limits = JSON.parse(fs.readFileSync(limitsPath, 'utf-8'));

async function testAgentCore() {
  console.log('--- Testing Cover Letter & Token Tracking ---');

  const letterAi = await generateCoverLetter({
    jobTitle: 'Senior AI Product Designer',
    company: 'Anthropic',
    jobDescription: 'Seeking someone to architect conversational AI workflows and design systems.'
  });

  console.log('\n--- Generated Grounded Letter (AI Role) ---');
  console.log(letterAi);

  let status = db.getTokenStatus(limits.weeklyTokenBudget);
  console.log('\nToken Status after 1 call:', status);

  console.log('Current daily applications:', db.getTodayApplicationCount());
  console.log('Can apply today?:', db.canApplyToday(15));

  console.log('Testing 75% token ceiling cap simulation...');
  // Save pre-test db state
  const originalState = JSON.parse(JSON.stringify(db.read()));

  try {
    const targetTokens = limits.weeklyTokenBudget * 0.76;
    const tokensToAdd = targetTokens - originalState.tokenUsage.tokensUsed;
    db.addTokenUsage(tokensToAdd, limits.weeklyTokenBudget);
    status = db.getTokenStatus(limits.weeklyTokenBudget);
    console.log('Token Status after adding test tokens:', status);
    if (!status.isCapped) {
      throw new Error('FAIL: Agent should be capped at >= 75% usage.');
    }

    try {
      await generateCoverLetter({
        jobTitle: 'UX Designer',
        company: 'Figma',
        jobDescription: 'Testing ceiling'
      });
      throw new Error('FAIL: Agent should have thrown an error when capped!');
    } catch (err) {
      if (err.message.includes('Token limit reached')) {
        console.log('SUCCESS: Agent correctly blocked execution:', err.message);
      } else {
        throw err;
      }
    }
  } finally {
    // Restore live db state
    db.write(originalState);
    console.log('Test cleanup: Live db.json state restored.');
  }
}

testAgentCore().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});

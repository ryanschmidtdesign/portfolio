// scripts/test-chat-api.js
// Smoke test for /api/chat
// Usage:
//   VERIFY_URL=https://ryanschmidt.design node scripts/test-chat-api.js
//   VERIFY_URL=http://localhost:3000 node scripts/test-chat-api.js

const BASE = process.env.VERIFY_URL || "https://ryanschmidt.design";
const API = `${BASE}/api/chat`;

const TESTS = [
  { name: "basic greeting", messages: [{ role: "user", content: "hello" }] },
  { name: "case study question", messages: [{ role: "user", content: "Tell me about the dashboard project" }] },
  { name: "design philosophy", messages: [{ role: "user", content: "What is Ryan's design process?" }] },
  { name: "fit question", messages: [{ role: "user", content: "I have a Lead Product Designer role. Is Ryan a fit?" }] },
  { name: "privacy refusal", messages: [{ role: "user", content: "What is Ryan's phone number?" }] }
];

let passed = 0;
let failed = 0;

async function run() {
  console.log(`Testing: ${API}\n`);

  for (const test of TESTS) {
    try {
      const resp = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: test.messages })
      });

      const status = resp.status;
      const body = await resp.json();

      const hasAnswer = body && typeof body.answer === "string" && body.answer.length > 10;
      const hasPills = Array.isArray(body.suggested_pills);
      const validJson = body && !body.error;

      if (status === 200 && hasAnswer && hasPills && validJson) {
        console.log(`  PASS  ${test.name}`);
        passed++;
      } else {
        console.log(`  FAIL  ${test.name} (status=${status}, answer=${typeof body.answer}, pills=${Array.isArray(body.suggested_pills)})`);
        if (body.error) console.log(`        error: ${body.error}`);
        failed++;
      }
    } catch (e) {
      console.log(`  FAIL  ${test.name} (exception: ${e.message})`);
      failed++;
    }
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => {
  console.error("Fatal:", e);
  process.exit(1);
});

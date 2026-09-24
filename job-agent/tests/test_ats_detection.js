import assert from 'node:assert/strict';
import { detectAtsKind } from '../src/ats/submission_verification.js';

const cases = [
  {
    name: 'recognizes workday job page',
    input: {
      url: 'https://mycompany.wd5.myworkdayjobs.com/en-US/Company/job/Designer',
      pageText: 'Apply to this job',
      formFields: ['firstName', 'lastName', 'emailAddress']
    },
    expected: 'workday'
  },
  {
    name: 'recognizes rippling application page',
    input: {
      url: 'https://jobs.rippling.com/jobs/123',
      pageText: 'Please upload your resume',
      formFields: ['first_name', 'last_name', 'email']
    },
    expected: 'rippling'
  },
  {
    name: 'leaves generic pages unknown',
    input: {
      url: 'https://example.com/jobs/123',
      pageText: 'hello world',
      formFields: []
    },
    expected: 'unknown'
  }
];

for (const testCase of cases) {
  const actual = detectAtsKind(testCase.input);
  assert.equal(actual, testCase.expected, `${testCase.name}: expected ${testCase.expected} but got ${actual}`);
}

console.log(`ATS detection tests passed: ${cases.length} checks.`);

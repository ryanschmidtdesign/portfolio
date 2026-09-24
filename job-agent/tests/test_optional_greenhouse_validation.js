import assert from 'node:assert/strict';
import { shouldIgnoreOptionalGreenhouseField } from '../src/ats/submission_verification.js';

const cases = [
  {
    name: 'ignores optional empty select validation',
    input: {
      errorText: 'Missing or invalid field: Select...',
      questionText: 'How did you hear about us?',
      hasRequiredMarker: false,
      isSelectControl: true
    },
    expected: true
  },
  {
    name: 'keeps required select validation',
    input: {
      errorText: 'Missing or invalid field: Select...',
      questionText: 'This field is required',
      hasRequiredMarker: true,
      isSelectControl: true
    },
    expected: false
  },
  {
    name: 'keeps required starred location field validation',
    input: {
      errorText: 'Missing or invalid field: Location (City)',
      questionText: 'Location (City)*',
      hasRequiredMarker: false,
      isSelectControl: true
    },
    expected: false
  },
  {
    name: 'keeps email validation error',
    input: {
      errorText: 'Please enter a valid email address',
      questionText: 'Email',
      hasRequiredMarker: true,
      isSelectControl: false
    },
    expected: false
  }
];

for (const testCase of cases) {
  const actual = shouldIgnoreOptionalGreenhouseField(testCase.input);
  assert.equal(actual, testCase.expected, `${testCase.name}: expected ${testCase.expected} but got ${actual}`);
}

console.log(`Optional greenhouse validation tests passed: ${cases.length} checks.`);

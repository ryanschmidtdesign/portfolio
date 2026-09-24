import assert from 'node:assert/strict';
import { detectSubmissionConfirmation, hasGreenhouseSelectionMatch, buildUnverifiedSubmissionError, shouldBlockGreenhouseLocationSubmission } from '../src/ats/submission_verification.js';

const cases = [
  {
    name: 'matches confirmation text',
    input: {
      pageText: 'Thank you for applying! Your application has been submitted.',
      url: 'https://company.greenhouse.io/jobs/123?submitted=1',
      initialUrl: 'https://company.greenhouse.io/jobs/123'
    },
    expected: true
  },
  {
    name: 'matches thank-you URL change',
    input: {
      pageText: 'Loading...',
      url: 'https://company.com/jobs/123/thanks',
      initialUrl: 'https://company.com/jobs/123'
    },
    expected: true
  },
  {
    name: 'does not misclassify a normal page',
    input: {
      pageText: 'Apply now to join our team',
      url: 'https://company.com/jobs/123',
      initialUrl: 'https://company.com/jobs/123'
    },
    expected: false
  }
];

for (const testCase of cases) {
  const actual = detectSubmissionConfirmation(testCase.input);
  assert.equal(actual, testCase.expected, `${testCase.name}: expected ${testCase.expected} but got ${actual}`);
}

const selectionCases = [
  {
    name: 'matches exact candidate option text for city selection',
    input: {
      value: 'Austin',
      optionLabels: ['Austin, Texas, United States', 'Austintown, Ohio, United States']
    },
    expected: true
  },
  {
    name: 'rejects non-matching city query when the option list has no match',
    input: {
      value: 'Austin',
      optionLabels: ['Phoenix, Arizona, United States', 'Denver, Colorado, United States']
    },
    expected: false
  }
];

for (const testCase of selectionCases) {
  const actual = hasGreenhouseSelectionMatch(testCase.input);
  assert.equal(actual, testCase.expected, `${testCase.name}: expected ${testCase.expected} but got ${actual}`);
}

const locationGuardCase = {
  value: 'Austin, Texas',
  optionLabels: ['Select a location', 'Remote', 'United States'],
  expected: false
};

const shouldBlockLocation = shouldBlockGreenhouseLocationSubmission(locationGuardCase);
assert.equal(shouldBlockLocation, locationGuardCase.expected, `Expected generic placeholder location choices to be ignored but got ${shouldBlockLocation}`);

const failureCase = {
  pageText: 'Apply for this job * indicates a required field First Name*',
  url: 'https://company.com/jobs/123',
  initialUrl: 'https://company.com/jobs/123',
  expected: 'Submission confirmation could not be verified; the ATS form remained active after the click.'
};

const unverifiedFailure = buildUnverifiedSubmissionError(failureCase);
assert.equal(unverifiedFailure, failureCase.expected, `Expected explicit active-form failure message but got: ${unverifiedFailure}`);

console.log(`Submission verification tests passed: ${cases.length + selectionCases.length + 2} checks.`);

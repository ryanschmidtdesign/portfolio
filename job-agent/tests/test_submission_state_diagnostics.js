import assert from 'node:assert/strict';
import { isGreenhouseFormStillActive, detectSubmissionConfirmation, classifySubmissionFailure, detectApplicationFlow } from '../src/ats/submission_verification.js';

const stillActiveCases = [
  {
    name: 'same-page apply form is still active',
    input: {
      pageText: 'Apply for this job * indicates a required field First Name* Last Name* Email*',
      url: 'https://careers.company.com/jobs/123?gh_jid=123',
      initialUrl: 'https://careers.company.com/jobs/123?gh_jid=123'
    },
    expected: true
  },
  {
    name: 'success page is not still active',
    input: {
      pageText: 'Thank you for applying! Your application has been submitted.',
      url: 'https://careers.company.com/jobs/123/thanks?gh_jid=123',
      initialUrl: 'https://careers.company.com/jobs/123?gh_jid=123'
    },
    expected: false
  }
];

for (const testCase of stillActiveCases) {
  const actual = isGreenhouseFormStillActive(testCase.input);
  assert.equal(actual, testCase.expected, `${testCase.name}: expected ${testCase.expected} but got ${actual}`);
}

const confirmationCases = [
  {
    name: 'recognizes thank-you text',
    input: {
      pageText: 'Thank you for applying. We have received your application.',
      url: 'https://careers.company.com/jobs/123/thanks',
      initialUrl: 'https://careers.company.com/jobs/123'
    },
    expected: true
  },
  {
    name: 'does not treat active apply form as success',
    input: {
      pageText: 'Apply for this job * indicates a required field First Name*',
      url: 'https://careers.company.com/jobs/123',
      initialUrl: 'https://careers.company.com/jobs/123'
    },
    expected: false
  }
];

for (const testCase of confirmationCases) {
  const actual = detectSubmissionConfirmation(testCase.input);
  assert.equal(actual, testCase.expected, `${testCase.name}: expected ${testCase.expected} but got ${actual}`);
}

const classificationCases = [
  {
    name: 'recognizes missing city field validation',
    input: { errorText: 'Missing or invalid field: Location (City)*', pageText: 'Apply for this job' },
    expected: 'required-field-missing'
  },
  {
    name: 'recognizes upload issue',
    input: { errorText: 'Please upload a resume', pageText: 'Upload your resume' },
    expected: 'resume-upload'
  }
];

for (const testCase of classificationCases) {
  const actual = classifySubmissionFailure(testCase.input);
  assert.equal(actual, testCase.expected, `${testCase.name}: expected ${testCase.expected} but got ${actual}`);
}

const flowCases = [
  {
    name: 'detects a multi-step review flow',
    input: { pageText: 'Review your application Continue', url: 'https://company.com/apply/review', formFields: ['name', 'email'] },
    expected: 'multi-step'
  },
  {
    name: 'detects a single-step form',
    input: { pageText: 'Apply for this job First Name* Email* Submit application', url: 'https://company.com/apply', formFields: ['first_name', 'email'] },
    expected: 'single-step'
  }
];

for (const testCase of flowCases) {
  const actual = detectApplicationFlow(testCase.input);
  assert.equal(actual, testCase.expected, `${testCase.name}: expected ${testCase.expected} but got ${actual}`);
}

console.log('Submission state diagnostics passed: 8 checks.');

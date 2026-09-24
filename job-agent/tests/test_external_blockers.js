import assert from 'node:assert/strict';
import { classifySubmissionFailure, detectExternalApplicationBlocker } from '../src/ats/submission_verification.js';

const blocker = detectExternalApplicationBlocker({
  pageText: 'Could not connect to the reCAPTCHA service. Please check your internet connection and reload to get a reCAPTCHA challenge.'
});

assert.equal(blocker.isBlocked, true, 'CAPTCHA outage should be detected as an external blocker');
assert.equal(classifySubmissionFailure({
  errorText: 'Could not connect to the reCAPTCHA service. Please check your internet connection and reload to get a reCAPTCHA challenge.'
}), 'captcha-blocked', 'CAPTCHA outage should be classified distinctly');

console.log('External blocker tests passed: 2 checks.');

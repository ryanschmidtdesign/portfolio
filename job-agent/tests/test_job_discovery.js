import assert from 'node:assert/strict';
import { canonicalizeJobUrl, prefersRemoteMatch, dedupeJobs, extractJobIdentity } from '../src/scraper/job_discovery.js';

const urlCases = [
  {
    name: 'strips tracking params',
    input: 'https://jobs.lever.co/company/abc?utm_source=foo&utm_medium=bar',
    expected: 'https://jobs.lever.co/company/abc'
  },
  {
    name: 'normalizes greenhouse absolute urls',
    input: 'https://boards.greenhouse.io/company/jobs/123?gh_jid=456&ref=recruiter',
    expected: 'https://boards.greenhouse.io/company/jobs/123?gh_jid=456'
  }
];

for (const testCase of urlCases) {
  const actual = canonicalizeJobUrl(testCase.input);
  assert.equal(actual, testCase.expected, `${testCase.name}: expected ${testCase.expected} but got ${actual}`);
}

const remoteCases = [
  { input: 'Austin, TX', expected: false },
  { input: 'Remote - US', expected: true },
  { input: 'Anywhere (remote)', expected: true },
  { input: 'United States', expected: true }
];

for (const testCase of remoteCases) {
  const actual = prefersRemoteMatch(testCase.input);
  assert.equal(actual, testCase.expected, `${testCase.input}: expected ${testCase.expected} but got ${actual}`);
}

const deduped = dedupeJobs([
  { url: 'https://jobs.lever.co/company/abc?utm_source=foo', title: 'Senior Product Designer' },
  { url: 'https://jobs.lever.co/company/abc', title: 'Senior Product Designer' },
  { url: 'https://jobs.lever.co/company/xyz', title: 'Data Analyst' }
]);
assert.equal(deduped.length, 2, 'duplicates should be collapsed while unique jobs remain');

const identityCases = [
  {
    url: 'https://boards.greenhouse.io/company/jobs/123?gh_jid=456&ref=foo',
    expected: '456'
  },
  {
    url: 'https://jobs.lever.co/company/abc/123',
    expected: '123'
  }
];

for (const testCase of identityCases) {
  const actual = extractJobIdentity(testCase.url);
  assert.equal(actual, testCase.expected, `expected extracted identity ${testCase.expected} but got ${actual}`);
}

const dedupeByIdentity = dedupeJobs([
  { url: 'https://boards.greenhouse.io/company/jobs/123?gh_jid=456', title: 'Senior Product Designer' },
  { url: 'https://boards.greenhouse.io/company/jobs/123?gh_jid=456&utm_source=ad', title: 'Senior Product Designer' },
  { url: 'https://boards.greenhouse.io/company/jobs/124?gh_jid=789', title: 'Senior Product Designer' }
]);
assert.equal(dedupeByIdentity.length, 2, 'identity-based dedupe should collapse near-duplicate greenhouse jobs');
console.log('Job discovery polish tests passed: 5 checks.');

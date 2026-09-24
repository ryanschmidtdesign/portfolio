import assert from 'node:assert/strict';
import { discoverJobs } from '../src/scraper/job_discovery.js';

const originalFetch = globalThis.fetch;

globalThis.fetch = async (url) => {
  const target = String(url);

  if (target.includes('api.lever.co')) {
    const err = new Error('getaddrinfo ENOTFOUND api.lever.co');
    err.cause = { code: 'ENOTFOUND' };
    throw err;
  }

  if (target.includes('boards-api.greenhouse.io')) {
    return new Response(JSON.stringify({ jobs: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  if (target.includes('remoteok.com')) {
    return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

try {
  const jobs = await discoverJobs({}, {
    keywords: ['Product Designer'],
    excludedTitles: ['Principal', 'Director'],
    maxAgeDays: 30,
    location: 'Remote'
  });

  assert.ok(Array.isArray(jobs), 'discoverJobs should always return an array even if one ATS is down');
  console.log('Discovery provider fallback tests passed: 1 check.');
} finally {
  globalThis.fetch = originalFetch;
}

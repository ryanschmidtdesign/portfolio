import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../storage/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const companiesPath = path.join(__dirname, '../../config/company_boards.json');

/**
 * Searches and discovers job postings matching target keywords, dates, and locations.
 * Uses direct ATS feeds (Greenhouse & Lever APIs) and RemoteOK feeds for 100% reliable discovery.
 */
export async function discoverJobs(page, filters) {
  const discovered = [];
  console.log(`[Discovery] Fetching live roles for keywords: ${filters.keywords.join(', ')}...`);

  let companies = [];
  try {
    if (fs.existsSync(companiesPath)) {
      companies = JSON.parse(fs.readFileSync(companiesPath, 'utf-8'));
    }
  } catch (e) {}

  console.log(`[Discovery] Checking ATS endpoints across ${companies.length} companies...`);
  const now = Date.now();
  const maxAgeMs = (filters.maxAgeDays || 14) * 24 * 60 * 60 * 1000;

  async function fetchWithTimeout(url, timeoutMs = 8000) {
    try {
      return await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    } catch (err) {
      const message = err && err.message ? err.message : String(err);
      console.warn(`[Discovery] Request failed for ${url}: ${message}`);
      return null;
    }
  }

  async function fetchAndProcess({ fetchFn, mapper, sourceName }) {
    const results = [];
    try {
      for (const item of await fetchFn()) {
        try {
          const mapped = mapper(item);
          if (mapped) results.push(mapped);
        } catch (_) {}
      }
    } catch (err) {
      console.warn(`[Discovery] ${sourceName} failed to process results: ${err.message || err}`);
    }
    return { sourceName, results };
  }

  const greenhouseRequests = companies.map(company => async () => {
    const res = await fetchWithTimeout(`https://boards-api.greenhouse.io/v1/boards/${company}/jobs`);
    if (!res || !res.ok) return [];
    const data = await res.json().catch(() => ({}));
    return (data.jobs || []).map(job => {
      const title = job.title || '';
      const loc = job.location?.name || '';
      const updatedAt = job.updated_at ? new Date(job.updated_at).getTime() : null;
      const matchesKeyword = filters.keywords.some(kw => new RegExp(`\\b${kw}\\b`, 'i').test(title));
      const isExcluded = filters.excludedTitles.some(ex => new RegExp(`\\b${ex}\\b`, 'i').test(title));
      const isRemote = prefersRemoteMatch(loc) || /\b(remote)\b/i.test(title);
      if (!matchesKeyword || isExcluded || !isRemote) return null;
      if (updatedAt && !isNaN(updatedAt) && (now - updatedAt) > maxAgeMs) return null;
      const cleanUrl = cleanTrackingUrl(job.absolute_url);
      if (!cleanUrl || cleanUrl.includes('...') || !isValidAtsJobUrl(cleanUrl)) return null;
      return { url: cleanUrl, keyword: title, company: company.charAt(0).toUpperCase() + company.slice(1), discoveredAt: new Date().toISOString() };
    }).filter(Boolean);
  });

  const leverRequests = companies.map(company => async () => {
    const res = await fetchWithTimeout(`https://api.lever.co/v0/postings/${company}?mode=json`);
    if (!res || !res.ok) return [];
    const jobs = await res.json().catch(() => []);
    return jobs.map(job => {
      const title = job.text || '';
      const loc = job.categories?.location || '';
      const rawUrl = job.hostedUrl || job.applyUrl || '';
      const updatedAt = job.createdAt ? new Date(job.createdAt).getTime() : null;
      const matchesKeyword = filters.keywords.some(kw => new RegExp(`\\b${kw}\\b`, 'i').test(title));
      const isExcluded = filters.excludedTitles.some(ex => new RegExp(`\\b${ex}\\b`, 'i').test(title));
      const isRemote = prefersRemoteMatch(loc) || /\b(remote)\b/i.test(title);
      if (!matchesKeyword || isExcluded || !isRemote || !rawUrl) return null;
      if (updatedAt && !isNaN(updatedAt) && (now - updatedAt) > maxAgeMs) return null;
      const cleanUrl = cleanTrackingUrl(rawUrl);
      return { url: cleanUrl, keyword: title, company: company.charAt(0).toUpperCase() + company.slice(1), discoveredAt: new Date().toISOString() };
    }).filter(Boolean);
  });

  const ashbyRequests = companies.map(company => async () => {
    try {
      const res = await fetchWithTimeout(`https://api.ashbyhq.com/posting-api/job-board/${company}`);
      if (!res || !res.ok) {
        const htmlRes = await fetchWithTimeout(`https://jobs.ashbyhq.com/${company}`);
        if (!htmlRes || !htmlRes.ok) return [];
        const text = await htmlRes.text().catch(() => '');
        const match = text.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/);
        if (!match || !match[1]) return [];

        try {
          const nextData = JSON.parse(match[1]);
          return (nextData.props?.pageProps?.jobBoard?.jobPostings || []).map(job => {
            const title = job.title || '';
            const loc = job.location || job.locationName || '';
            const rawUrl = job.jobUrl || (job.id ? `https://jobs.ashbyhq.com/${company}/${job.id}` : '');
            const updatedAt = (job.updatedAt || job.createdAt) ? new Date(job.updatedAt || job.createdAt).getTime() : null;
            const matchesKeyword = filters.keywords.some(kw => new RegExp(`\\b${kw}\\b`, 'i').test(title));
            const isExcluded = filters.excludedTitles.some(ex => new RegExp(`\\b${ex}\\b`, 'i').test(title));
            const isRemote = prefersRemoteMatch(loc) || /\b(remote)\b/i.test(title);
            if (!matchesKeyword || isExcluded || !isRemote || !rawUrl) return null;
            if (updatedAt && !isNaN(updatedAt) && (now - updatedAt) > maxAgeMs) return null;
            return { url: cleanTrackingUrl(rawUrl), keyword: title, company: company.charAt(0).toUpperCase() + company.slice(1), discoveredAt: new Date().toISOString() };
          }).filter(Boolean);
        } catch (_) {
          return [];
        }
      }

      const data = await res.json().catch(() => ({}));
      return (data.jobs || []).map(job => {
        const title = job.title || '';
        const loc = job.location || job.locationName || '';
        const rawUrl = job.jobUrl || (job.id ? `https://jobs.ashbyhq.com/${company}/${job.id}` : '');
        const updatedAt = (job.updatedAt || job.createdAt) ? new Date(job.updatedAt || job.createdAt).getTime() : null;
        const matchesKeyword = filters.keywords.some(kw => new RegExp(`\\b${kw}\\b`, 'i').test(title));
        const isExcluded = filters.excludedTitles.some(ex => new RegExp(`\\b${ex}\\b`, 'i').test(title));
        const isRemote = prefersRemoteMatch(loc) || /\b(remote)\b/i.test(title);
        if (!matchesKeyword || isExcluded || !isRemote || !rawUrl) return null;
        if (updatedAt && !isNaN(updatedAt) && (now - updatedAt) > maxAgeMs) return null;
        return { url: cleanTrackingUrl(rawUrl), keyword: title, company: company.charAt(0).toUpperCase() + company.slice(1), discoveredAt: new Date().toISOString() };
      }).filter(Boolean);
    } catch (e) {
      return [];
    }
  });

  const parallelLimit = 5;
  const runInBatches = async (tasks) => {
    const results = [];
    for (let i = 0; i < tasks.length; i += parallelLimit) {
      const batch = tasks.slice(i, i + parallelLimit);
      const batchResults = await Promise.all(batch.map(task => task()));
      results.push(...batchResults.flat());
    }
    return results;
  };

  const [greenhouseJobs, leverJobs, ashbyJobs] = await Promise.all([
    runInBatches(greenhouseRequests),
    runInBatches(leverRequests),
    runInBatches(ashbyRequests)
  ]);

  const discoveredFromAts = [...greenhouseJobs, ...leverJobs, ...ashbyJobs];

  const remoteJobs = [];
  try {
    const res = await fetchWithTimeout('https://remoteok.com/api?tag=design', 10000);
    if (res && res.ok) {
      const jobs = await res.json().catch(() => []);
      for (const job of jobs) {
        if (!job.position || !job.url) continue;
        const title = job.position;
        const matchesKeyword = filters.keywords.some(kw => new RegExp(`\\b${kw}\\b`, 'i').test(title));
        const isExcluded = filters.excludedTitles.some(ex => new RegExp(`\\b${ex}\\b`, 'i').test(title));
        if (matchesKeyword && !isExcluded) {
          const rawUrl = job.apply_url || job.url;
          const cleanUrl = cleanTrackingUrl(rawUrl);
          if (cleanUrl) remoteJobs.push({ url: cleanUrl, keyword: title, company: job.company || 'Hiring', discoveredAt: new Date().toISOString() });
        }
      }
    }
  } catch (err) {
    console.warn(`[Discovery] RemoteOK feed request failed: ${err.message}`);
  }

  // Remotive API (excellent for non-tech and varied ATS like Workday)
  try {
    const res = await fetchWithTimeout('https://remotive.com/api/remote-jobs?category=design', 10000);
    if (res && res.ok) {
      const data = await res.json().catch(() => ({ jobs: [] }));
      for (const job of data.jobs || []) {
        if (!job.title || !job.url) continue;
        const title = job.title;
        const matchesKeyword = filters.keywords.some(kw => new RegExp(`\\b${kw}\\b`, 'i').test(title));
        const isExcluded = filters.excludedTitles.some(ex => new RegExp(`\\b${ex}\\b`, 'i').test(title));
        if (matchesKeyword && !isExcluded) {
          const rawUrl = job.url;
          const cleanUrl = cleanTrackingUrl(rawUrl);
          if (cleanUrl) remoteJobs.push({ url: cleanUrl, keyword: title, company: job.company_name || 'Hiring', discoveredAt: job.publication_date || new Date().toISOString() });
        }
      }
    }
  } catch (err) {
    console.warn(`[Discovery] Remotive feed request failed: ${err.message}`);
  }

  // Arbeitnow API
  try {
    const res = await fetchWithTimeout('https://www.arbeitnow.com/api/job-board-api', 10000);
    if (res && res.ok) {
      const data = await res.json().catch(() => ({ data: [] }));
      for (const job of data.data || []) {
        if (!job.title || !job.url) continue;
        const title = job.title;
        const matchesKeyword = filters.keywords.some(kw => new RegExp(`\\b${kw}\\b`, 'i').test(title));
        const isExcluded = filters.excludedTitles.some(ex => new RegExp(`\\b${ex}\\b`, 'i').test(title));
        if (matchesKeyword && !isExcluded && job.tags && job.tags.some(t => t.toLowerCase().includes('design'))) {
          const rawUrl = job.url;
          const cleanUrl = cleanTrackingUrl(rawUrl);
          if (cleanUrl) remoteJobs.push({ url: cleanUrl, keyword: title, company: job.company_name || 'Hiring', discoveredAt: new Date(job.created_at * 1000).toISOString() });
        }
      }
    }
  } catch (err) {
    console.warn(`[Discovery] Arbeitnow feed request failed: ${err.message}`);
  }

  // WeWorkRemotely & Jobspresso startup design feeds
  try {
    const { discoverStartupAndAggregatorJobs } = await import('./wellfound_scraper.js');
    const startupJobs = await discoverStartupAndAggregatorJobs();
    for (const job of startupJobs) {
      const cleanUrl = cleanTrackingUrl(job.url);
      if (cleanUrl) {
        remoteJobs.push({
          url: cleanUrl,
          keyword: job.title,
          company: job.company,
          discoveredAt: new Date().toISOString()
        });
      }
    }
  } catch (err) {
    console.warn(`[Discovery] Startup feed integration note: ${err.message}`);
  }

  const merged = dedupeJobs([...discoveredFromAts, ...remoteJobs]);
  const filtered = merged.filter(job => !db.hasAppliedTo(job.url));
  filtered.sort((a, b) => {
    const aTime = new Date(a.discoveredAt || 0).getTime();
    const bTime = new Date(b.discoveredAt || 0).getTime();
    return bTime - aTime;
  });

  console.log(`[Discovery] Total eligible new roles found: ${filtered.length}`);
  return filtered;
}

export function canonicalizeJobUrl(rawUrl) {
  if (!rawUrl) return '';
  let url = rawUrl.trim();
  if (!/^https?:\/\//i.test(url)) return url;

  try {
    const parsed = new URL(url);
    parsed.searchParams.delete('utm_source');
    parsed.searchParams.delete('utm_medium');
    parsed.searchParams.delete('utm_campaign');
    parsed.searchParams.delete('utm_term');
    parsed.searchParams.delete('utm_content');
    parsed.searchParams.delete('utm_id');
    parsed.searchParams.delete('ref');
    parsed.searchParams.delete('source');
    parsed.searchParams.delete('fbclid');
    parsed.searchParams.delete('gclid');
    parsed.searchParams.delete('mc_cid');
    parsed.searchParams.delete('mc_eid');
    parsed.hash = '';
    return parsed.toString().replace(/\?$/, '');
  } catch {
    return url;
  }
}

export function prefersRemoteMatch(locationText = '') {
  const text = (locationText || '').toLowerCase();
  if (!text) return false;
  return /\b(remote|anywhere|us|usa|united states|canada|austin|tx|texas)\b/.test(text) || /remote/i.test(text);
}

export function extractJobIdentity(rawUrl = '') {
  if (!rawUrl) return '';
  const normalized = canonicalizeJobUrl(rawUrl);
  if (!normalized) return '';

  try {
    const url = new URL(normalized);
    if (url.searchParams.get('gh_jid')) {
      return url.searchParams.get('gh_jid');
    }
    const greenhouseMatch = normalized.match(/gh_jid=([^&]+)/i);
    if (greenhouseMatch) return greenhouseMatch[1];
    if (url.hostname.includes('lever.co')) {
      const parts = url.pathname.split('/').filter(Boolean);
      return parts[parts.length - 1] || '';
    }
    if (url.hostname.includes('ashbyhq.com')) {
      const parts = url.pathname.split('/').filter(Boolean);
      return parts[parts.length - 1] || '';
    }
    if (url.hostname.includes('greenhouse.io') || url.hostname.includes('job-boards.greenhouse.io')) {
      const matches = normalized.match(/\/jobs\/(\d+)/i);
      if (matches) return matches[1];
    }
    return url.pathname.split('/').filter(Boolean).slice(-1)[0] || '';
  } catch {
    return normalized.split('/').filter(Boolean).slice(-1)[0] || '';
  }
}

export function dedupeJobs(jobList = []) {
  const seen = new Map();
  for (const job of jobList) {
    const candidate = job && typeof job === 'object' ? (job.url || job.href || '') : '';
    const normalized = canonicalizeJobUrl(candidate);
    if (!normalized) continue;
    const identity = extractJobIdentity(normalized);
    const key = identity ? `${normalized.split(/\?|#/)[0]}::${identity}` : `${normalized}::${(job.title || job.keyword || '').trim().toLowerCase()}`;
    if (!seen.has(key)) {
      seen.set(key, job);
    }
  }
  return [...seen.values()];
}

function cleanTrackingUrl(link) {
  if (!link) return '';
  let clean = link;
  if (clean.includes('uddg=')) {
    clean = decodeURIComponent(clean.split('uddg=')[1].split('&')[0]);
  }
  if (clean.includes('/url?q=')) {
    clean = decodeURIComponent(clean.split('/url?q=')[1].split('&')[0]);
  }
  if (clean.includes('&r=')) {
    clean = decodeURIComponent(clean.split('&r=')[1].split('&')[0]);
  }
  return canonicalizeJobUrl(clean);
}

function isValidAtsJobUrl(url) {
  if (!url || typeof url !== 'string') return false;
  if (url.includes('google.com') || url.includes('duckduckgo.com')) return false;
  if (url.includes('boards.greenhouse.io/') || url.includes('job-boards.greenhouse.io/')) return url.includes('/jobs/');
  if (url.includes('gh_jid=')) return true;
  if (url.includes('jobs.lever.co/')) {
    const parts = url.split('jobs.lever.co/')[1].split('/');
    return parts.length >= 2;
  }
  if (url.includes('jobs.ashbyhq.com/')) {
    const parts = url.split('jobs.ashbyhq.com/')[1].split('/');
    return parts.length >= 2;
  }
  return false;
}

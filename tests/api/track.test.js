import { describe, it, expect } from 'vitest';

import {
  isBotUserAgent,
  detectDeviceType,
  computeVisitorHash,
  sanitizeSlug,
  normalizeEventPayload,
  parseBlobKey
} from '../../api/track.js';

describe('api/track helpers', () => {
  it('detects common bots and crawlers via isBotUserAgent', () => {
    expect(isBotUserAgent('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')).toBe(true);
    expect(isBotUserAgent('Chrome-Lighthouse')).toBe(true);
    expect(isBotUserAgent('HeadlessChrome/120.0')).toBe(true);
    expect(isBotUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36')).toBe(false);
    expect(isBotUserAgent('')).toBe(false);
  });

  it('classifies device types from user agent', () => {
    expect(detectDeviceType('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148')).toBe('mobile');
    expect(detectDeviceType('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15')).toBe('tablet');
    expect(detectDeviceType('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')).toBe('desktop');
  });

  it('produces deterministic 12-char SHA-256 visitor hashes without storing raw IPs', () => {
    const h1 = computeVisitorHash('203.0.113.1', 'Mozilla/5.0');
    const h2 = computeVisitorHash('203.0.113.1', 'Mozilla/5.0');
    const h3 = computeVisitorHash('203.0.113.2', 'Mozilla/5.0');
    expect(h1).toMatch(/^[a-f0-9]{12}$/);
    expect(h1).toBe(h2);
    expect(h1).not.toBe(h3);
  });

  it('normalizes slugs safely', () => {
    expect(sanitizeSlug('act-resume')).toBe('act_resume');
    expect(sanitizeSlug('  Resume_Click! ')).toBe('resume_click');
    expect(sanitizeSlug('', 'ui')).toBe('ui');
  });

  it('normalizes valid event payloads and builds fast-index blob pathnames', () => {
    const fixedNow = new Date('2026-11-24T15:30:00.000Z');
    const res = normalizeEventPayload(
      {
        event: 'resume_click',
        source: 'header-nav',
        label: 'assets/ryan-schmidt-resume.pdf',
        page: 'https://ryanschmidt.design/pages/about',
        referrer: 'https://www.linkedin.com/',
        sessionId: 'sess-123'
      },
      {
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
      },
      '198.51.100.42',
      fixedNow
    );

    expect(res.ok).toBe(true);
    expect(res.pathname).toMatch(/^events\/2026-11-24\/\d+__resume_click__header_nav__[a-f0-9]{12}\.json$/);
    expect(res.record.event).toBe('resume_click');
    expect(res.record.source).toBe('header_nav');
    expect(res.record.page).toBe('/pages/about');
    expect(res.record.device).toBe('desktop');
    expect(res.record.ts).toBe('2026-11-24T15:30:00.000Z');
  });

  it('filters bots and invalid events in normalizeEventPayload', () => {
    expect(normalizeEventPayload({ event: '' }, {})).toEqual({ ok: false, reason: 'invalid_event' });
    expect(normalizeEventPayload('not-json', {})).toEqual({ ok: false, reason: 'invalid_body' });
    expect(
      normalizeEventPayload(
        { event: 'resume_click' },
        { 'user-agent': 'vercel-screenshot/1.0' }
      )
    ).toEqual({ ok: false, reason: 'bot_filtered' });
  });

  it('parses blob pathnames with or without random suffixes', () => {
    expect(parseBlobKey('events/2026-11-24/1795534200000__resume_click__header_nav__a1b2c3d4e5f6.json')).toEqual({
      date: '2026-11-24',
      tsMs: 1795534200000,
      event: 'resume_click',
      source: 'header_nav',
      visitorHash: 'a1b2c3d4e5f6'
    });
    expect(parseBlobKey('events/2026-11-24/1795534200000__cmdk_select__act_resume__a1b2c3d4e5f6-XyZ99.json')).toEqual({
      date: '2026-11-24',
      tsMs: 1795534200000,
      event: 'cmdk_select',
      source: 'act_resume',
      visitorHash: 'a1b2c3d4e5f6'
    });
    expect(parseBlobKey('unrelated/path.json')).toBeNull();
  });
});

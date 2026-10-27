import { describe, it, expect } from 'vitest';

import {
  sanitize,
  polishAnswerText,
  isPrivateHostname,
  extractCompanyHint,
  detectIntent,
  isBadHint,
  extractRoleHint,
  fitQuestionHasContext,
  cleanHint,
  sanitizeSources,
  buildMetricAllowlist,
  validateAnswerMetrics,
  KB_FALLBACK
} from '../../api/chat.js';




describe('sanitize', () => {
  it('strips HTML tags', () => {
    expect(sanitize('<p>Hello</p>')).toBe('Hello');
    expect(sanitize('<script>alert("xss")</script>')).toBe('alert("xss")');
    expect(sanitize('<a href="evil">link</a>')).toBe('link');
  });

  it('returns empty string for empty input', () => {
    expect(sanitize('')).toBe('');
    expect(sanitize()).toBe('');
  });

  it('handles mixed content', () => {
    expect(sanitize('Hello <b>world</b>!')).toBe('Hello world!');
  });
});

describe('polishAnswerText', () => {
  it('removes "as an AI" prefix', () => {
    expect(polishAnswerText('As an AI, I think Ryan is a fit.')).toBe('I think Ryan is a fit.');
  });

  it('replaces leverage with use', () => {
    expect(polishAnswerText('He can leverage his skills.')).toBe('He can use his skills.');
  });

  it('replaces utilize with use', () => {
    expect(polishAnswerText('He can utilize the system.')).toBe('He can use the system.');
  });

  it('replaces "passionate about" with "focused on"', () => {
    expect(polishAnswerText('He is passionate about design.')).toBe('He is focused on design.');
  });

  it('replaces em dashes', () => {
    expect(polishAnswerText('He led the project—it was a success.')).toBe('He led the project, it was a success.');
  });

  it('trims whitespace', () => {
    expect(polishAnswerText('  hello  ')).toBe('hello');
  });
});

describe('isPrivateHostname', () => {
  it('identifies localhost as private', () => {
    expect(isPrivateHostname('localhost')).toBe(true);
  });

  it('identifies .local domains as private', () => {
    expect(isPrivateHostname('myhost.local')).toBe(true);
  });

  it('identifies 10.x.x.x as private', () => {
    expect(isPrivateHostname('10.0.0.1')).toBe(true);
  });

  it('identifies 127.x.x.x as private', () => {
    expect(isPrivateHostname('127.0.0.1')).toBe(true);
  });

  it('identifies 192.168.x.x as private', () => {
    expect(isPrivateHostname('192.168.1.1')).toBe(true);
  });

  it('identifies 172.16-31.x.x as private', () => {
    expect(isPrivateHostname('172.16.0.1')).toBe(true);
    expect(isPrivateHostname('172.31.255.255')).toBe(true);
  });

  it('identifies public IPs as not private', () => {
    expect(isPrivateHostname('8.8.8.8')).toBe(false);
    expect(isPrivateHostname('172.15.0.1')).toBe(false);
    expect(isPrivateHostname('172.32.0.1')).toBe(false);
  });

  it('returns true for empty hostname', () => {
    expect(isPrivateHostname('')).toBe(true);
    expect(isPrivateHostname()).toBe(true);
  });
});

describe('extractCompanyHint', () => {
  it('extracts company after "fit at"', () => {
    expect(extractCompanyHint('How is Ryan a fit at Google?')).toBe('Google');
  });

  it('extracts company after "fit for"', () => {
    expect(extractCompanyHint('Is he a good fit for Acme Corp?')).toBe('Acme Corp');
  });

  it('extracts company after "work at"', () => {
    expect(extractCompanyHint('Did Ryan work at Tesla?')).toBe('Tesla');
  });

  it('extracts company after "apply at"', () => {
    expect(extractCompanyHint('Should Ryan apply at Stripe?')).toBe('Stripe');
  });

  it('returns empty for text without company hint', () => {
    expect(extractCompanyHint('What is Ryans design process?')).toBe('');
  });

  it('returns empty for empty input', () => {
    expect(extractCompanyHint('')).toBe('');
    expect(extractCompanyHint()).toBe('');
  });
});

describe('detectIntent', () => {
  it('detects contact intent', () => {
    expect(detectIntent('How can I contact Ryan?')).toBe('contact');
  });

  it('detects meta_qa intent', () => {
    expect(detectIntent('Are you an AI?')).toBe('meta_qa');
  });

  it('detects role_fit intent', () => {
    expect(detectIntent('Is Ryan a good fit for a Senior Product Designer role?')).toBe('role_fit');
  });

  it('detects technical_depth intent', () => {
    expect(detectIntent('Tell me about the data visualization in Ryans work.')).toBe('technical_depth');
  });

  it('detects bio intent', () => {
    expect(detectIntent('Who is Ryan?')).toBe('bio');
  });

  it('detects hobbies intent', () => {
    expect(detectIntent('What are Ryans hobbies?')).toBe('hobbies');
  });

  it('detects leadership intent', () => {
    expect(detectIntent('How does Ryan show leadership on cross-functional teams?')).toBe('leadership');
  });

  it('detects looking_for intent', () => {
    expect(detectIntent('What kind of role is Ryan looking for?')).toBe('looking_for');
  });

  it('detects ux_engineer_fit intent', () => {
    expect(detectIntent('Is Ryan a UX Engineer?')).toBe('ux_engineer_fit');
  });

  it('detects proof_points intent', () => {
    expect(detectIntent('What impact has Ryan had?')).toBe('proof_points');
  });

  it('detects case_compare intent', () => {
    expect(detectIntent('Which case study should I read first?')).toBe('case_compare');
  });

  it('returns general for unrelated input', () => {
    expect(detectIntent('What is the weather like?')).toBe('general');
  });

  it('returns general for empty input', () => {
    expect(detectIntent('')).toBe('general');
    expect(detectIntent()).toBe('general');
  });
});

describe('isBadHint', () => {
  it('flags generic role references as bad hints', () => {
    expect(isBadHint('this role')).toBe(true);
    expect(isBadHint('my role')).toBe(true);
    expect(isBadHint('a fit')).toBe(true);
    expect(isBadHint('the position')).toBe(true);
  });

  it('accepts specific role titles', () => {
    expect(isBadHint('Senior Product Designer')).toBe(false);
    expect(isBadHint('Staff UX Engineer')).toBe(false);
    expect(isBadHint('Google')).toBe(false);
  });

  it('flags too-short hints', () => {
    expect(isBadHint('a')).toBe(true);
    expect(isBadHint('')).toBe(true);
  });
});

describe('extractRoleHint', () => {
  it('extracts role after "fit for" + "at"', () => {
    expect(extractRoleHint('Is Ryan a fit for a Senior Product Designer at Google?')).toBe('Senior Product Designer');
  });

  it('extracts role after "role as"', () => {
    expect(extractRoleHint('How does Ryan fit the role as Staff UX Engineer?')).toBe('Staff UX Engineer');
  });

  it('returns empty for no role', () => {
    expect(extractRoleHint('Is Ryan a fit for this role?')).toBe('');
  });
});

describe('fitQuestionHasContext', () => {
  it('true when a specific role is named', () => {
    expect(fitQuestionHasContext('Is Ryan a fit for a Senior Product Designer at Google?')).toBe(true);
  });

  it('true when a company is named', () => {
    expect(fitQuestionHasContext('How is Ryan a fit at Google?')).toBe(true);
  });

  it('false when only a generic role reference exists', () => {
    expect(fitQuestionHasContext('Is Ryan a fit for this role?')).toBe(false);
    expect(fitQuestionHasContext('Is Ryan a fit for my role?')).toBe(false);
  });

  it('false for empty input', () => {
    expect(fitQuestionHasContext('')).toBe(false);
    expect(fitQuestionHasContext()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// KB integrity: validates that assets/portfolio-kb.json is internally
// consistent so the capability model, router, and role/company mappings
// cannot drift out of sync with the case registry.
// ---------------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const KB_PATH = fileURLToPath(new URL('../../assets/portfolio-kb.json', import.meta.url));
const kb = JSON.parse(readFileSync(KB_PATH, 'utf8'));

describe('KB integrity: capability model', () => {
  it('defines a capabilities vocabulary with name and description', () => {
    expect(kb.capabilities).toBeDefined();
    for (const [id, cap] of Object.entries(kb.capabilities)) {
      expect(typeof cap.name).toBe('string');
      expect(cap.name.length).toBeGreaterThan(0);
      expect(typeof cap.description).toBe('string');
      expect(cap.description.length).toBeGreaterThan(0);
      expect(id).toBe(id.replace(/[^a-z0-9_]/g, ''), `capability id "${id}" must be snake_case`);
    }
  });

  it('every capability case reference resolves to a real case id', () => {
    const caseIds = new Set(kb.cases.map((c) => c.id));
    for (const [id, cap] of Object.entries(kb.capabilities)) {
      for (const caseId of cap.cases) {
        expect(caseIds.has(caseId), `capability "${id}" references unknown case "${caseId}"`).toBe(true);
      }
    }
  });

  it('every case capability reference resolves to a defined capability', () => {
    const capIds = new Set(Object.keys(kb.capabilities));
    for (const c of kb.cases) {
      expect(Array.isArray(c.capabilities), `case "${c.id}" is missing capabilities`).toBe(true);
      for (const cap of c.capabilities) {
        expect(capIds.has(cap), `case "${c.id}" references unknown capability "${cap}"`).toBe(true);
      }
    }
  });

  it('every case has a short_title for display', () => {
    for (const c of kb.cases) {
      expect(typeof c.short_title).toBe('string');
      expect(c.short_title.length).toBeGreaterThan(0);
    }
  });
});

describe('KB integrity: case registry', () => {
  it('case ids are unique', () => {
    const ids = kb.cases.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('case slugs are unique', () => {
    const slugs = kb.cases.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe('KB integrity: role and company mappings', () => {
  it('every evidence_by_role best_case resolves to a real case id', () => {
    const caseIds = new Set(kb.cases.map((c) => c.id));
    for (const [role, data] of Object.entries(kb.evidence_by_role)) {
      for (const caseId of data.best_cases) {
        expect(caseIds.has(caseId), `evidence_by_role.${role} references unknown case "${caseId}"`).toBe(true);
      }
    }
  });

  it('every company_fit_patterns best_case resolves to a real case id', () => {
    const caseIds = new Set(kb.cases.map((c) => c.id));
    for (const [pattern, data] of Object.entries(kb.company_fit_patterns)) {
      for (const caseId of data.best_cases) {
        expect(caseIds.has(caseId), `company_fit_patterns.${pattern} references unknown case "${caseId}"`).toBe(true);
      }
    }
  });
});

describe('KB integrity: router', () => {
  it('every keyword_to_case target resolves to a real case id', () => {
    const caseIds = new Set(kb.cases.map((c) => c.id));
    for (const [keyword, targets] of Object.entries(kb.router.keyword_to_case)) {
      for (const caseId of targets) {
        expect(caseIds.has(caseId), `router keyword "${keyword}" references unknown case "${caseId}"`).toBe(true);
      }
    }
  });

  it('every page_to_case target resolves to a real case id or null', () => {
    const caseIds = new Set(kb.cases.map((c) => c.id));
    for (const [page, caseId] of Object.entries(kb.router.page_to_case)) {
      if (caseId !== null) {
        expect(caseIds.has(caseId), `router page "${page}" references unknown case "${caseId}"`).toBe(true);
      }
    }
  });

  it('every fallback_case_order entry resolves to a real case id', () => {
    const caseIds = new Set(kb.cases.map((c) => c.id));
    for (const caseId of kb.router.fallback_case_order) {
      expect(caseIds.has(caseId), `fallback_case_order references unknown case "${caseId}"`).toBe(true);
    }
  });
});

describe('api/chat serverless helpers', () => {
  it('loads KB_FALLBACK cleanly in ESM', () => {
    expect(KB_FALLBACK).not.toBeNull();
    expect(KB_FALLBACK.cases.length).toBeGreaterThan(0);
  });

  it('isPrivateHostname blocks metadata service and loopbacks', () => {
    expect(isPrivateHostname('169.254.169.254')).toBe(true);
    expect(isPrivateHostname('::1')).toBe(true);
    expect(isPrivateHostname('0.0.0.0')).toBe(true);
    expect(isPrivateHostname('100.64.0.1')).toBe(true);
    expect(isPrivateHostname('google.com')).toBe(false);
    expect(isPrivateHostname('ryanschmidt.design')).toBe(false);
  });

  it('sanitizeSources normalizes string URLs and objects', () => {
    const sources = [
      'https://ryanschmidt.design/pages/dashboard.html',
      '/pages/inventory.html',
      { title: 'Member Portal', url: 'https://ryanschmidt.design/pages/member-portal-overhaul.html' },
      null,
      'invalid-url'
    ];
    const sanitized = sanitizeSources(sources);
    expect(sanitized.length).toBe(3);
    expect(sanitized[0].url).toBe('https://ryanschmidt.design/pages/dashboard.html');
    expect(sanitized[1].url).toBe('https://ryanschmidt.design/pages/inventory.html');
    expect(sanitized[2].title).toBe('Member Portal');
  });

  it('validateAnswerMetrics preserves documented metrics and rejects hallucinated numbers', () => {
    const allowlist = buildMetricAllowlist(kb);
    expect(allowlist.size).toBeGreaterThan(10);

    // Documented metrics pass through
    expect(validateAnswerMetrics('He achieved **+18%** recurring revenue.', allowlist)).toBe('He achieved **+18%** recurring revenue.');
    expect(validateAnswerMetrics('He drove **+500%** Ahri sessions.', allowlist)).toBe('He drove **+500%** Ahri sessions.');
    expect(validateAnswerMetrics('He led **10 interviews** with power users.', allowlist)).toBe('He led **10 interviews** with power users.');

    // Hallucinations containing single digits are blocked from substring bypass
    expect(validateAnswerMetrics('Conversions jumped **995%**.', allowlist)).toBe('Conversions jumped a documented portfolio outcome.');
    expect(validateAnswerMetrics('Revenue surged **$2,000,000**.', allowlist)).toBe('Revenue surged a documented portfolio outcome.');
    expect(validateAnswerMetrics('User engagement rose **250%**.', allowlist)).toBe('User engagement rose a documented portfolio outcome.');
  });
});


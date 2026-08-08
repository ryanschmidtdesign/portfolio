import { describe, it, expect } from 'vitest';

// Pure functions extracted from api/chat.js for unit testing.
// api/chat.js uses export default with mixed require() imports,
// so internal functions are not directly importable.

function sanitize(text = "") {
  return String(text).replace(/<[^>]*>/g, "").slice(0, 4200);
}

function polishAnswerText(text = "") {
  let s = String(text || "");
  s = s.replace(/—/g, ", ");
  s = s.replace(/–/g, "-");
  const bannedReplacements = [
    [/as an ai[,]?\s*/gi, ""],
    [/i'?d be happy to\s*/gi, ""],
    [/\bleverage\b/gi, "use"],
    [/\butilize\b/gi, "use"],
    [/\bpassionate about\b/gi, "focused on"],
    [/\bdelve into\b/gi, "look at"],
    [/\bsynergy\b/gi, "fit"],
    [/\brobust\b/gi, "strong"],
    [/\bseamless\b/gi, "smooth"],
  ];
  for (const [re, replacement] of bannedReplacements) {
    s = s.replace(re, replacement);
  }
  s = s.replace(/\s{2,}/g, " ");
  s = s.replace(/\s+,/g, ",");
  s = s.replace(/,\s*,/g, ",");
  return s.trim();
}

function isPrivateHostname(hostname = "") {
  const h = String(hostname || "").toLowerCase();
  if (!h) return true;
  if (h === "localhost" || h.endsWith(".local")) return true;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) {
    const [a, b] = h.split(".").map(n => parseInt(n, 10));
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    return false;
  }
  return false;
}

function cleanHint(s = "") {
  return String(s)
    .replace(/[\u2014\u2013]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/^[\s"'""''()]+|[\s"'""''()]+$/g, "")
    .replace(/[?.!,;:]+$/g, "")
    .trim();
}

function extractCompanyHint(text = "") {
  const s = String(text || "").trim();
  if (!s) return "";
  const patterns = [
    /\bfit\s+(?:at|for|in)\s+([^?.!,\n]{2,80})/i,
    /\b(?:work|join|apply|interview)\s+(?:at|for)\s+([^?.!,\n]{2,80})/i,
    /\b(?:at|for)\s+([A-Z][A-Za-z0-9&.\-_ ]{2,80})/,
  ];
  for (const re of patterns) {
    const m = s.match(re);
    if (m && m[1]) {
      let candidate = m[1].split(/\s+(?:as|on|about|because|given|with|and|or|but|how|why|when|where|while|that)\s+/i)[0];
      candidate = candidate.split(/\s[\u2013\u2014]\s/)[0];
      candidate = candidate.replace(/\s+(and|or|how|why|when|where).*$/i, '').trim();
      return cleanHint(candidate);
    }
  }
  const paren = s.match(/^([A-Z][A-Za-z0-9&.\-_ ]{2,60})\s*\(/);
  if (paren && paren[1]) return cleanHint(paren[1]);
  const atAny = s.match(/\bat\s+([A-Z][A-Za-z0-9&.\-_ ]{2,80})/);
  if (atAny && atAny[1]) return cleanHint(atAny[1]);
  return "";
}

function normalizeText(s = "") {
  return String(s || "").replace(/\s+/g, " ").trim();
}

function isBadHint(h = "") {
  const t = h.toLowerCase();
  return (
    t.length < 2 ||
    t.length > 80 ||
    [
      "this", "that", "here", "my company", "the company", "your company", "portfolio",
      "my role", "this role", "that role", "the role", "a role", "your role", "any role",
      "an open role", "this position", "the position", "a position", "that position", "my position",
      "this job", "the job", "a job", "that job", "my job", "this fit", "the fit", "a fit"
    ].includes(t)
  );
}

function extractRoleHint(text = "") {
  const s = String(text || "").trim();
  if (!s) return "";
  const m =
    s.match(/\bfit\s+(?:as|for)\s+(?:a|an|the)?\s*([^?.!,\n]{2,80})\s+\bat\b/i) ||
    s.match(/\b(?:role|position)\s+(?:as|for)\s+(?:a|an|the)?\s*([^?.!,\n]{2,80})/i);
  if (!m || !m[1]) return "";
  let candidate = m[1].split(/\s+(?:at|for|in)\s+/i)[0];
  return cleanHint(candidate);
}

function fitQuestionHasContext(text = "") {
  const companyHint = cleanHint(extractCompanyHint(text));
  const roleHint = cleanHint(extractRoleHint(text));
  return Boolean((companyHint && !isBadHint(companyHint)) || (roleHint && !isBadHint(roleHint)));
}

function detectFitIntent(text = "") {
  const t = String(text).toLowerCase();
  const strong =
    /\b(why|how)\b.*\b(fit|suited|qualified|right for)\b/.test(t) ||
    /\b(good fit|great fit|strong fit|best fit)\b/.test(t) ||
    /\b(why)\b.*\b(ryan)\b.*\b(at|for)\b/.test(t) ||
    /\b(should)\b.*\b(ryan)\b.*\b(join|work|apply)\b/.test(t) ||
    /\b(would)\b.*\b(ryan)\b.*\b(be)\b.*\b(a)\b.*\b(fit)\b/.test(t);
  const medium =
    /\bfit\b.*\b(at|for)\b/.test(t) ||
    /\b(relevant)\b.*\b(to|for|at)\b/.test(t) ||
    /\b(align|alignment)\b.*\b(with)\b/.test(t) ||
    /\b(compare)\b.*\b(for|to)\b/.test(t);
  return strong || medium;
}

function detectIntent(text = "") {
  const t = normalizeText(text).toLowerCase();
  if (!t) return "general";
  const contact = /\b(contact|email|hire|interview|schedule|reach out|availability|talk to|connect|call)\b/.test(t);
  const roleFit = detectFitIntent(t);
  const caseCompare = /\b(compare|best case|which case|match(es|ing)?|versus|vs|choose|recommend)\b/.test(t);
  const proofPoints = /\b(outcome|impact|results|proof|metrics|evidence|adoption|engagement|success|score)\b/.test(t);
  const process = /\b(process|workflow|methodology|approach|how (?:he|ryan|i) works|decision|strategy|design approach)\b/.test(t);
  const technical = /\b(code|prototype|front[- ]?end|frontend|react|typescript|javascript|tailwind|radix|shadcn|three\.js|threejs|three js|interaction|animation|system|engineering|technical|ai|llm|data visualization|design system|tokens|component implementation)\b/.test(t);
  const leadership = /\b(ownership|owner|leadership|mentor|mentoring|stakeholder|pm|product manager|cross[- ]?functional|teamwork|collaborat)\b/.test(t);
  const metaQa = /\b(are you (an? )?ai|did ryan (build|make|write) you|how accurate are you|why does this (exist|chat exist)|can you (actually )?answer)\b/.test(t);
  const lookingFor = /\b(open to (new |a )?role|looking for (a )?(new |another )?role|is (he|ryan) available|what (is |')?(he|ryan) looking|target role|what kind of role|hiring (situation|status))\b/.test(t);
  const uxEngineerFit = /\b(ux engineer|design engineer|front[- ]?end|frontend|can he code|does he (code|prototype|build)|prototype in code|coded prototype|build with engineers|engineering team|technical designer|figma to code|react|typescript|tailwind|component implementation)\b/.test(t);
  if (metaQa) return "meta_qa";
  if (lookingFor) return "looking_for";
  if (uxEngineerFit) return "ux_engineer_fit";
  if (contact) return "contact";
  if (roleFit) return "role_fit";
  if (caseCompare) return "case_compare";
  if (proofPoints) return "proof_points";
  if (process) return "process";
  if (technical) return "technical_depth";
  if (leadership) return "leadership";
  if (/\b(resume|cv)\b/.test(t) || /\b(download|view)\b.*\bresume\b/.test(t)) return "resume";
  if (/\b(hobbies|outside work|off hours|free time|interests|fun facts)\b/.test(t)) return "hobbies";
  if (/\b(who is ryan|about ryan|bio|biography|summary)\b/.test(t)) return "bio";
  if (/\b(which|what)\b.*\bcase\b/.test(t) || /\b(best)\b.*\bcase\b/.test(t) || /\bcompare|comparison|versus|vs\b/.test(t)) {
    return "case_select";
  }
  if (/\b(dashboard|inventory|design system|tokens|navigation|taxonomy|onboarding|discovery|filters)\b/.test(t)) {
    return "case_detail";
  }
  return "general";
}

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

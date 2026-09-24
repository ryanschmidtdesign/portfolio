import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
let faqCache = null;

export function getGroundedFieldAnswer({ fieldText = '', profile = {} } = {}) {
  const normalized = (fieldText || '').replace(/\s+/g, ' ').trim().toLowerCase();
  const personal = profile.personal || {};

  if (!normalized) return null;

  if (!faqCache) {
    try {
      faqCache = JSON.parse(fs.readFileSync(path.join(__dirname, '../../config/faq.json'), 'utf8'));
    } catch(e) {
      faqCache = {};
    }
  }

  // Check user-defined FAQ overrides first
  for (const [q, a] of Object.entries(faqCache)) {
    if (normalized.includes(q.toLowerCase())) {
      return a;
    }
  }

  const prohibitedEssayPrompts = [
    'what interests you',
    'tell us about your experience',
    'describe your experience',
    'motivation',
    'cover letter',
    'what would you like to share',
    'why this role',
    'tell us about a time',
    'describe a project',
    'accomplishments',
    'previous experience with'
  ];

  if (prohibitedEssayPrompts.some(pattern => normalized.includes(pattern))) {
    return null;
  }

  // Generic essay fallback for required tools
  if (normalized.includes('why do you want to join') || normalized.includes('why are you interested in')) {
    return "I am passionate about building great products and I am excited about the opportunity to contribute my skills in product design to your team.";
  }

  if (/first name/.test(normalized)) return personal.firstName || null;
  if (/last name/.test(normalized)) return personal.lastName || null;
  if (/email/.test(normalized)) return personal.email || null;
  if (/phone/.test(normalized)) return personal.phone || null;
  if (/city|location \(city\)|where do you reside|state do you reside|reside\?/i.test(normalized)) {
    return `${personal.location?.city || 'Austin'}, ${personal.location?.stateAbbr || 'TX'}`;
  }
  if (/country.*currently located|country\s*\*/i.test(fieldText) || /country/i.test(normalized)) {
    return personal.location?.country || 'United States';
  }
  if (/address line 1/i.test(normalized)) return 'Austin, TX'; // generic address
  if (/linkedin/i.test(normalized)) return personal.links?.linkedin || null;
  if (/portfolio|website|github/i.test(normalized)) return personal.links?.portfolio || personal.links?.github || null;
  if (/school|university|college/i.test(normalized)) return profile.education?.[2]?.institution || null;
  if (/degree/i.test(normalized)) return profile.education?.[2]?.degree || null;
  if (/major|discipline|focus/i.test(normalized)) return profile.education?.[2]?.focus || null;
  if (/pronoun/i.test(normalized)) return 'He/Him';
  if (/how did you hear|where did you hear|referral|know anyone|referred/i.test(normalized)) return 'LinkedIn';
  if (/would you be willing|relocate|remote/i.test(normalized)) return personal.location?.country === 'United States' ? 'Yes' : 'No';
  if (/electronic signature|signature|legal name|full name/i.test(normalized)) return `${personal.firstName || 'Ryan'} ${personal.lastName || 'Schmidt'}`;
  if (/initial/i.test(normalized)) return 'RS';
  if (/start date|notice period|earliest available/i.test(normalized)) return '2 weeks from offer';
  if (/years of experience|how many years/i.test(normalized)) return '6';
  if (/current.*company|recent.*company|company name/i.test(normalized)) return profile.experience?.[0]?.company || 'Institute for Corporate Productivity (i4cp)';
  if (/title/i.test(normalized)) return profile.experience?.[0]?.title || 'CX/UX Designer';
  if (/legally authorized/i.test(normalized)) return 'Yes';
  if (/sponsorship/i.test(normalized)) return 'No';
  if (/contract.*hire|contract work|freelance/i.test(normalized)) return 'No';
  if (/security clearance|active clearance/i.test(normalized)) return 'No';
  if (/consent to.*collecting.*demographic data/i.test(normalized)) return 'Yes';
  if (/from where do you intend to work/i.test(normalized)) return 'Austin, TX (Remote)';
  if (/how are you using ai today/i.test(normalized)) return 'I prototype in code and use tools like Cursor and Claude Code to deliver functional UI to staging.';
  if (/salary/i.test(normalized)) return '$135,000';
  if (/province|state/i.test(normalized)) return 'Texas';
  
  return null;
}

export const inferGroundedProfileAnswer = getGroundedFieldAnswer;

export function buildFailureReason({ errorText = '', pageText = '', atsType = '' } = {}) {
  const normalizedError = (errorText || '').replace(/\s+/g, ' ').trim();
  const normalizedPage = (pageText || '').replace(/\s+/g, ' ').trim();

  const byType = {
    greenhouse: 'required-field-missing',
    lever: 'validation-error',
    ashby: 'validation-error',
    workday: 'validation-error',
    rippling: 'validation-error'
  };

  const classified = classifySubmissionFailure({ errorText: normalizedError, pageText: normalizedPage });
  return byType[atsType] || classified || 'unknown';
}

export function collectBrowserStateSnapshot({ page = null, container = null, limit = 180 } = {}) {
  const snapshot = {
    url: page ? page.url() : '',
    isFrame: !!container && container !== page,
    pageTextSample: '',
    formSelectorHints: [],
    visibleButtons: [],
    fieldCount: 0,
    hasFileInput: false
  };

  if (page) {
    snapshot.pageTextSample = (page.innerText ? (page.innerText('body').catch(() => '') || '') : '').replace(/\s+/g, ' ').slice(0, limit);
  }

  if (container && typeof container.$$eval === 'function') {
    snapshot.fieldCount = (container.$$eval('input, textarea, select, [role="combobox"], [aria-haspopup="listbox"]', els => els.length).catch(() => 0));
    snapshot.hasFileInput = !!(container.$('input[type="file"]').catch(() => null));
    snapshot.formSelectorHints = (container.$$eval('input, textarea, select', els => els.slice(0, 10).map(el => {
      const name = el.name || el.id || el.getAttribute('aria-label') || el.placeholder || '';
      return name;
    }).filter(Boolean)).catch(() => []));
    snapshot.visibleButtons = (container.$$eval('button, a', els => els.slice(0, 10).map(el => (el.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean)).catch(() => []));
  }

  return snapshot;
}

export function shouldBlockGreenhouseLocationSubmission({ value = '', optionLabels = [] } = {}) {
  const normalizedValue = (value || '').replace(/\s+/g, ' ').trim();
  if (!normalizedValue) return true;

  const cleanedLabels = (optionLabels || [])
    .map(label => (label || '').replace(/\s+/g, ' ').trim())
    .filter(label => !!label)
    .filter(label => !/^(select\s+a\s+location|select\s+.*location|choose\s+.*location|choose\s+.*city|select\s+.*city|remote|united states|usa|u\.s\.a\.?|country)$/i.test(label));

  const locationLikeLabels = cleanedLabels.filter(label => /,/.test(label) || /\b(alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|georgia|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new hampshire|new jersey|new mexico|new york|north carolina|north dakota|ohio|oklahoma|oregon|pennsylvania|rhode island|south carolina|south dakota|tennessee|texas|utah|vermont|virginia|washington|west virginia|wisconsin|wyoming)\b/i.test(label) || /\b(austin|boston|chicago|denver|miami|seattle|new york|san francisco|los angeles|portland|philadelphia|atlanta|dallas|houston|phoenix)\b/i.test(label));

  if (locationLikeLabels.length === 0) return false;
  return !hasGreenhouseSelectionMatch({ value: normalizedValue, optionLabels: locationLikeLabels });
}

export function hasGreenhouseSelectionMatch({ value = '', optionLabels = [] } = {}) {
  const stateAliases = {
    tx: 'texas',
    ca: 'california',
    ny: 'new york',
    fl: 'florida',
    il: 'illinois',
    pa: 'pennsylvania',
    wa: 'washington',
    ma: 'massachusetts',
    ga: 'georgia',
    nc: 'north carolina',
    az: 'arizona',
    mi: 'michigan',
    oh: 'ohio',
    nj: 'new jersey',
    va: 'virginia',
    co: 'colorado',
    tn: 'tennessee',
    in: 'indiana',
    mo: 'missouri',
    mn: 'minnesota',
    md: 'maryland',
    or: 'oregon',
    wi: 'wisconsin',
    al: 'alabama',
    la: 'louisiana',
    ky: 'kentucky',
    sc: 'south carolina',
    ok: 'oklahoma',
    ms: 'mississippi',
    ct: 'connecticut',
    ia: 'iowa',
    ks: 'kansas',
    ut: 'utah',
    ne: 'nebraska',
    nv: 'nevada',
    nm: 'new mexico',
    id: 'idaho',
    mt: 'montana',
    wy: 'wyoming',
    hi: 'hawaii',
    ak: 'alaska',
    ri: 'rhode island',
    de: 'delaware',
    nd: 'north dakota',
    sd: 'south dakota',
    vt: 'vermont',
    nh: 'new hampshire',
    me: 'maine',
    wv: 'west virginia',
    dc: 'district of columbia'
  };

  const normalizeToken = (token = '') => (token || '').toLowerCase().replace(/[^a-z]/g, '').replace(/([a-z])\1+/g, '$1');

  const allStateValues = new Set([...Object.keys(stateAliases), ...Object.values(stateAliases)]);

  const canonicalizeLocation = (raw = '') => {
    const text = (raw || '')
      .replace(/\s*,\s*(united states|usa|u\.s\.a\.?|us)$/i, '')
      .replace(/\b(united states|usa|u\.s\.a\.?|us)\b/gi, '')
      .replace(/[.,;_\-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!text) return { city: '', state: '' };

    const tokens = text.split(/\s+/).map(normalizeToken).filter(Boolean);
    if (!tokens.length) return { city: '', state: '' };

    const mapped = tokens.map(token => {
      if (stateAliases[token]) return stateAliases[token];
      return token;
    });

    const stateIndex = mapped.findIndex(token => allStateValues.has(token));
    const stateToken = stateIndex >= 0 ? mapped[stateIndex] : '';
    const cityTokens = stateIndex >= 0 ? mapped.slice(0, stateIndex) : mapped;

    const city = cityTokens.filter(Boolean).join(' ');
    return { city, state: stateToken };
  };

  const approximateCityMatch = (left = '', right = '') => {
    if (!left || !right) return false;
    if (left === right) return true;
    if (left.includes(right) || right.includes(left)) return true;
    const leftTokens = left.split(/\s+/).filter(Boolean);
    const rightTokens = right.split(/\s+/).filter(Boolean);
    if (!leftTokens.length || !rightTokens.length) return false;
    const overlap = leftTokens.filter(token => rightTokens.includes(token));
    return overlap.length >= Math.max(1, Math.min(leftTokens.length, rightTokens.length) - 1);
  };

  const normalizedValue = (value || '').replace(/\s+/g, ' ').trim();
  const labels = (optionLabels || []).map(label => (label || '').replace(/\s+/g, ' ').trim());

  if (!normalizedValue) return false;

  const valueLocation = canonicalizeLocation(normalizedValue);
  if (labels.length === 0) {
    return !!valueLocation.city || !!valueLocation.state;
  }

  return labels.some(label => {
    const candidateLocation = canonicalizeLocation(label);
    if (!candidateLocation.city && !candidateLocation.state) return false;

    const stateMatch = !candidateLocation.state || !valueLocation.state || candidateLocation.state === valueLocation.state || candidateLocation.state.includes(valueLocation.state) || valueLocation.state.includes(candidateLocation.state);
    const cityMatch = !candidateLocation.city || !valueLocation.city || approximateCityMatch(candidateLocation.city, valueLocation.city);
    return cityMatch && stateMatch;
  });
}

export function detectExternalApplicationBlocker({ errorText = '', pageText = '' } = {}) {
  const combined = `${errorText || ''} ${pageText || ''}`.replace(/\s+/g, ' ').trim();
  const lower = combined.toLowerCase();

  const recaptcha = /recaptcha|captcha/i.test(lower);
  const networkIssue = /could not connect to the recaptcha service|internet connection|network changed|connection reset|internet disconnected|temporarily unavailable/i.test(lower);
  const browserBlock = recaptcha || networkIssue;

  if (!browserBlock) {
    return { isBlocked: false, reason: null, category: 'none' };
  }

  if (recaptcha) {
    return {
      isBlocked: true,
      reason: 'reCAPTCHA or browser security challenge unavailable',
      category: 'captcha'
    };
  }

  return {
    isBlocked: true,
    reason: 'browser/network blocker prevented ATS submission',
    category: 'network'
  };
}

export function classifySubmissionFailure({ errorText = '', pageText = '' } = {}) {
  const normalizedError = (errorText || '').replace(/\s+/g, ' ').trim().toLowerCase();
  const normalizedPage = (pageText || '').replace(/\s+/g, ' ').trim().toLowerCase();

  const externalBlock = detectExternalApplicationBlocker({ errorText: normalizedError, pageText: normalizedPage });
  if (externalBlock.isBlocked) {
    return 'captcha-blocked';
  }

  if (/missing or invalid field:.*location \(city\)|missing or invalid field:.*city|location \(city\)\*/i.test(normalizedError) || /location \(city\)\*/i.test(normalizedPage)) {
    return 'required-field-missing';
  }
  if (/resume|cv|upload|attach/i.test(normalizedError) || /upload your resume|attach your resume/i.test(normalizedPage)) {
    return 'resume-upload';
  }
  if (/phone|email|first name|last name/i.test(normalizedError)) {
    return 'required-field-missing';
  }
  if (/dropdown|select|combobox|option/i.test(normalizedError)) {
    return 'invalid-selection';
  }
  return 'unknown';
}

export function detectApplicationFlow({ pageText = '', url = '', formFields = [] } = {}) {
  const normalizedText = (pageText || '').replace(/\s+/g, ' ').trim().toLowerCase();
  const normalizedUrl = (url || '').toLowerCase();
  const fieldNames = (formFields || []).join(' ').toLowerCase();

  const isReviewPage = /review your application|review application|confirm your details|final review/i.test(normalizedText) || /\/review\b|\/step\s*2\b|\/application\/review/i.test(normalizedUrl);
  const isSingleStep = /apply for this job|submit application|first name\*|email\*/i.test(normalizedText) || /first_name|last_name|email/.test(fieldNames);

  if (isReviewPage) return 'multi-step';
  if (isSingleStep) return 'single-step';
  return 'unknown';
}

export function detectSubmissionConfirmation({ pageText = '', url = '', initialUrl = '' } = {}) {
  const normalizedText = (pageText || '').replace(/\s+/g, ' ').trim().toLowerCase();
  const normalizedUrl = (url || '').toLowerCase();
  const normalizedInitialUrl = (initialUrl || '').toLowerCase();

  const confirmationTextPatterns = [
    'thank you for applying',
    'thanks for applying',
    'application submitted',
    'your application has been submitted',
    'application received',
    'we have received your application',
    'your application was received',
    'application sent',
    'your submission has been received',
    'application complete',
    'you have successfully applied',
    'your application is complete',
    'your application is in review',
    'we received your application',
    'your application has been received'
  ];

  const textConfirmed = confirmationTextPatterns.some(pattern => normalizedText.includes(pattern));

  const otpPatterns = [
    'verification code was sent to',
    'enter the 8-character code',
    'enter the verification code'
  ];
  if (otpPatterns.some(pattern => normalizedText.includes(pattern))) {
    return false; // Treat OTP block as unconfirmed
  }

  const urlChanged = normalizedUrl && normalizedInitialUrl && normalizedUrl !== normalizedInitialUrl;
  const successUrlPatterns = [
    'confirmation',
    'thank-you',
    'thanks',
    'submitted',
    'success',
    'application-received',
    'application-submitted',
    'received',
    'complete',
    'applied'
  ];

  const urlConfirmed = urlChanged && successUrlPatterns.some(pattern => normalizedUrl.includes(pattern));

  return textConfirmed || urlConfirmed;
}

export function getGreenhouseFieldValue(fieldText = '', fieldId = '', profile = {}) {
  const normalizedFieldText = (fieldText || '').toLowerCase();
  const normalizedFieldId = (fieldId || '').toLowerCase();

  if (normalizedFieldId.includes('first_name') || /first name/.test(normalizedFieldText)) {
    return profile.personal?.firstName || 'Ryan';
  }
  if (normalizedFieldId.includes('last_name') || /last name/.test(normalizedFieldText)) {
    return profile.personal?.lastName || 'Schmidt';
  }
  if (normalizedFieldId.includes('email') || /email/.test(normalizedFieldText)) {
    return profile.personal?.email || 'ryanschmidt1989@gmail.com';
  }
  if (normalizedFieldId.includes('phone') || /phone/.test(normalizedFieldText)) {
    return profile.personal?.phone || '(724) 815-5312';
  }
  if (normalizedFieldId.includes('country') || /country.*currently located|country\s*\*/i.test(fieldText) || /country/i.test(normalizedFieldText)) {
    return profile.personal?.location?.country || 'United States';
  }
  if (normalizedFieldId.includes('candidate-location') || /location \(city\)|city and state|reside\?/i.test(fieldText)) {
    return `${profile.personal?.location?.city || 'Austin'}, ${profile.personal?.location?.stateAbbr || 'TX'}`;
  }
  if (normalizedFieldId.includes('school') || /school|university|college/i.test(normalizedFieldText)) {
    return profile.education?.[2]?.institution || 'Clarion University';
  }
  if (normalizedFieldId.includes('degree') || /degree/i.test(normalizedFieldText)) {
    return profile.education?.[2]?.degree || 'BA, Anthropology';
  }
  if (/linkedin|github|personal website|portfolio/i.test(normalizedFieldText)) {
    return profile.personal?.links?.linkedin || profile.personal?.links?.portfolio || 'https://ryanschmidt.design';
  }
  if (/current or previous employer|current employer|employer\?/i.test(fieldText)) {
    return profile.experience?.[0]?.company || 'i4cp';
  }
  if (/current or previous job title|job title\?/i.test(fieldText)) {
    return profile.experience?.[0]?.title || 'CX/UX Designer';
  }
  if (/opt-in to receive whatsapp|whatsapp/i.test(fieldText)) {
    return 'No';
  }
  return '';
}

export function getGreenhouseDropdownAnswers(fieldText = '', profile = {}) {
  const normalizedText = (fieldText || '').toLowerCase();

  const defaultFallbacks = [
    'No',
    'Decline',
    'Prefer not to answer',
    'No, I do not have a disability',
    'Not a protected veteran',
    'Male',
    'Female',
    'White',
    'United States',
    'LinkedIn'
  ];

  if (/authorized to work|legal right to work|legally authorized/i.test(fieldText)) return ['Yes', 'No'];
  if (/sponsorship|visa/i.test(fieldText)) return ['No', 'Yes'];
  if (/how did you hear|where did you hear|source/i.test(fieldText)) return ['LinkedIn', 'Recruiter', 'Referral', 'Other'];
  if (/pronoun/i.test(fieldText)) return ['He/Him', 'He / Him', 'Prefer not to answer'];
  if (/transgender/i.test(fieldText)) return ['No', 'do not identify', 'Not transgender', 'Prefer not to answer'];
  if (/sexual orientation|orientation/i.test(fieldText)) return ['Heterosexual', 'Straight', 'Straight or heterosexual'];
  if (/gender|sex/i.test(fieldText)) return ['Male', 'Man', 'Prefer not to answer'];
  if (/race|ethnicity|hispanic|background/i.test(fieldText)) return ['White', 'Caucasian', 'Not Hispanic or Latino', 'Prefer not to answer'];
  if (/veteran/i.test(fieldText)) return ['Yes, I identify as one or more of the classifications of a protected veteran', 'I identify as one or more of the classifications of a protected veteran', 'Protected veteran', 'Yes', 'Veteran'];
  if (/disability|chronic condition|difficulty/i.test(fieldText)) return ['No, I do not have a disability', 'No', 'None'];
  if (/age range|age/i.test(fieldText)) return ['36', '35-39', '30-39', '35-44', '30-40', '35 - 39'];
  if (/country of citizenship|citizenship/i.test(fieldText)) return ['United States', 'Other'];
  if (/school|university|college/i.test(fieldText)) return [profile.education?.[2]?.institution || 'Clarion University', 'Other'];
  if (/degree/i.test(fieldText)) return ['Bachelor\'s', 'Master\'s', 'Associate\'s', 'Other'];
  if (/discipline|major/i.test(fieldText)) return ['Anthropology', 'Design', 'Communications', 'Other'];
  if (/18\s*\+|older than 18|years or older/i.test(fieldText)) return ['Yes', 'No'];
  if (/work authorization|authorized to work/i.test(fieldText)) return ['Yes', 'No'];
  if (/volunteer|interested in|why do you want/i.test(fieldText)) return ['Company mission', 'Growth opportunity', 'Team', 'Other'];

  return defaultFallbacks;
}

export function shouldSkipDirectGreenhouseFieldFill(fieldText = '', fieldId = '') {
  const normalizedFieldText = (fieldText || '').toLowerCase();
  const normalizedFieldId = (fieldId || '').toLowerCase();

  if (/candidate-location|job_application_location/.test(normalizedFieldId) || /location \(city\)|city and state|where do you reside/.test(normalizedFieldText)) {
    return true;
  }
  if (/country/.test(normalizedFieldId) || /country.*currently located|country\s*\*/i.test(fieldText)) {
    return true;
  }
  if (/school|degree|gender|hispanic|veteran_status|veteran|whatsapp|pronouns|pronoun/.test(normalizedFieldId) || /school|degree|gender|hispanic|veteran|pronouns/.test(normalizedFieldText)) {
    return true;
  }
  return false;
}

export function shouldIgnoreOptionalGreenhouseField({ errorText = '', questionText = '', hasRequiredMarker = false, isSelectControl = false } = {}) {
  const normalizedError = (errorText || '').replace(/\s+/g, ' ').trim();
  const normalizedQuestion = (questionText || '').replace(/\s+/g, ' ').trim().toLowerCase();

  if (!normalizedError || hasRequiredMarker) return false;

  if (/missing or invalid field:.*location \(city\)|location \(city\)\*|city\s*\*/i.test(normalizedError) || /location \(city\)\*|city\s*\*/i.test(normalizedQuestion)) {
    return false;
  }

  const genericSelectError = /missing or invalid field: select\s*\.\.\.|missing or invalid field: select|select\s*\.\.\./i.test(normalizedError);
  if (!genericSelectError && !isSelectControl) return false;

  if (/optional|not required|if applicable|optional question/i.test(normalizedQuestion)) return true;
  if (!normalizedQuestion) return true;
  if (/how did you hear about us|where did you hear|pronouns|gender|race|ethnicity|veteran|disability|country of citizenship|school|degree|discipline|major|what interests you|how did you learn|preferred work arrangement/i.test(normalizedQuestion)) return true;
  if (/select\s*\.\.\.|select a\s+/i.test(normalizedQuestion)) return true;

  return false;
}

export function detectAtsKind({ url = '', pageText = '', formFields = [] } = {}) {
  const normalizedUrl = (url || '').toLowerCase();
  const normalizedText = (pageText || '').toLowerCase();
  const fieldNames = (formFields || []).join(' ').toLowerCase();

  // 1. Strict URL matching (Highest Priority)
  if (/greenhouse\.io|gh_jid|job-boards\.greenhouse\.io/.test(normalizedUrl)) return 'greenhouse';
  if (/ashbyhq\.com|ashby/.test(normalizedUrl)) return 'ashby';
  if (/lever\.co|lever/.test(normalizedUrl)) return 'lever';
  if (/myworkdayjobs\.com|workday/.test(normalizedUrl)) return 'workday';
  if (/rippling\.com|rippling/.test(normalizedUrl)) return 'rippling';

  // 2. Specialized Field/Text matching for embedded iframes
  if (/mapped_url|job_application_answers/.test(fieldNames)) return 'greenhouse';
  if (/urls\[linkedin\]|urls\[github\]/.test(fieldNames)) return 'lever';
  if (/name\]|email\]|phone\]/.test(fieldNames) && /ashby/.test(normalizedText)) return 'ashby';
  if (/firstName|lastName|emailAddress/.test(fieldNames) && !/first_name/.test(fieldNames)) return 'workday';
  if (/job_application|first_name/.test(fieldNames) && /last_name/.test(fieldNames) && !/rippling/.test(normalizedText)) return 'greenhouse';
  
  return 'unknown';
}

export function isGreenhouseFormStillActive({ pageText = '', url = '', initialUrl = '' } = {}) {
  const normalizedText = (pageText || '').replace(/\s+/g, ' ').trim().toLowerCase();
  const normalizedUrl = (url || '').toLowerCase();
  const normalizedInitialUrl = (initialUrl || '').toLowerCase();

  const activeFormIndicators = [
    'apply for this job',
    'apply to this job',
    'required field',
    'first name*',
    'last name*',
    'resume/cv*',
    'autofill my application',
    'location (city)*'
  ];

  const stillOnApplyPage = !normalizedUrl || normalizedUrl === normalizedInitialUrl || normalizedUrl.includes('/jobs/') && normalizedUrl.includes('gh_jid');
  const hasActiveFormText = activeFormIndicators.some(indicator => normalizedText.includes(indicator));
  const hasApplyPrompt = /apply for this job|apply now|submit application/i.test(normalizedText);

  return stillOnApplyPage && (hasActiveFormText || hasApplyPrompt);
}

export function summarizeAtsLearning({ atsType = '', failureReason = '', pageText = '' } = {}) {
  const normalizedFailure = (failureReason || '').toLowerCase();
  const normalizedPage = (pageText || '').toLowerCase();

  const learnedPattern = {
    atsType,
    likelyCause: 'unknown',
    retryStrategy: 'standard' 
  };

  if (atsType === 'greenhouse' && /location \(city\)|missing or invalid field/i.test(normalizedFailure)) {
    learnedPattern.likelyCause = 'combobox-selection-required';
    learnedPattern.retryStrategy = 'select-option-before-submit';
  } else if (/resume|upload/i.test(normalizedFailure) || /upload.*resume|attach.*resume/.test(normalizedPage)) {
    learnedPattern.likelyCause = 'upload-variant';
    learnedPattern.retryStrategy = 'check-hidden-inputs';
  } else if (/review your application|continue/i.test(normalizedPage)) {
    learnedPattern.likelyCause = 'multi-step-flow';
    learnedPattern.retryStrategy = 'navigate-review-step';
  }

  return learnedPattern;
}

export function buildUnverifiedSubmissionError({ pageText = '', url = '', initialUrl = '' } = {}) {
  const state = summarizeSubmissionState({ pageText, url, initialUrl });
  if (state.isConfirmed) {
    return 'Submission was confirmed.';
  }
  const normalizedText = (pageText || '').toLowerCase();
  if (/verification code was sent to|enter the 8-character code|enter the verification code/i.test(normalizedText)) {
    return 'Application blocked by email OTP verification.';
  }
  if (state.isFormStillActive) {
    return 'Submission confirmation could not be verified; the ATS form remained active after the click.';
  }
  return 'Submission confirmation could not be verified; the page did not show a successful completion state.';
}

export function summarizeSubmissionState({ pageText = '', url = '', initialUrl = '' } = {}) {
  const normalizedText = (pageText || '').replace(/\s+/g, ' ').trim();
  const normalizedUrl = url || '';
  const isConfirmed = detectSubmissionConfirmation({ pageText: normalizedText, url: normalizedUrl, initialUrl });

  return {
    isConfirmed,
    isFormStillActive: isGreenhouseFormStillActive({ pageText: normalizedText, url: normalizedUrl, initialUrl }),
    urlChanged: !!normalizedUrl && !!initialUrl && normalizedUrl !== initialUrl,
    textSnippet: normalizedText.slice(0, 220),
    urlSnippet: normalizedUrl.slice(0, 220),
    initialUrlSnippet: (initialUrl || '').slice(0, 220)
  };
}

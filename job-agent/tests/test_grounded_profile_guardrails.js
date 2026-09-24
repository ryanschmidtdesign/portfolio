import assert from 'node:assert/strict';
import { getGroundedFieldAnswer } from '../src/ats/submission_verification.js';

const profile = {
  personal: {
    firstName: 'Ryan',
    lastName: 'Schmidt',
    email: 'ryanschmidt1989@gmail.com',
    phone: '(724) 815-5312',
    location: { city: 'Austin', stateAbbr: 'TX', country: 'United States' },
    links: { linkedin: 'https://www.linkedin.com/in/ryanschmidt1989', portfolio: 'https://ryanschmidt.design' }
  },
  education: [{}, {}, { institution: 'Clarion University', degree: 'BA, Anthropology' }]
};

assert.equal(getGroundedFieldAnswer({ fieldText: 'First Name*', profile }), 'Ryan');
assert.equal(getGroundedFieldAnswer({ fieldText: 'How did you hear about this role?', profile }), 'LinkedIn');
assert.equal(getGroundedFieldAnswer({ fieldText: 'Why do you want to join?', profile }), null, 'must not invent a narrative answer');
assert.equal(getGroundedFieldAnswer({ fieldText: 'Tell us about your experience with AI systems.', profile }), null, 'must not fabricate experience details');

console.log('Grounded profile guardrails passed: 4 checks.');

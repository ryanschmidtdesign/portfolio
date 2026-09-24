import assert from 'node:assert/strict';
import { getGreenhouseDropdownAnswers, getGreenhouseFieldValue, hasGreenhouseSelectionMatch, shouldBlockGreenhouseLocationSubmission, shouldSkipDirectGreenhouseFieldFill } from '../src/ats/submission_verification.js';

const cases = [
  {
    name: 'disability question prefers declarative negative option',
    input: {
      fieldText: 'Do you have a disability or chronic condition',
      profile: {}
    },
    expected: [
      'No, I do not have a disability',
      'No',
      'Decline',
      'Prefer not to answer'
    ]
  },
  {
    name: 'veteran question uses veteran-specific negative option',
    input: {
      fieldText: 'Are you a protected veteran',
      profile: {}
    },
    expected: [
      'Not a protected veteran',
      'No',
      'Decline',
      'Prefer not to answer'
    ]
  },
  {
    name: 'required country and city values are mapped to profile defaults',
    input: {
      fieldText: 'Please select the country you are currently located in.',
      fieldId: 'question_67389684',
      profile: {
        personal: {
          location: {
            country: 'United States',
            city: 'Austin',
            stateAbbr: 'TX'
          }
        },
        education: [{}, {}, { institution: 'Clarion University', degree: 'BA, Anthropology' }]
      }
    },
    expectedCountry: 'United States',
    expectedCity: 'Austin, TX'
  }
];

for (const testCase of cases) {
  const actual = getGreenhouseDropdownAnswers(testCase.input.fieldText, testCase.input.profile);
  if (testCase.expectedCountry) {
    assert.equal(getGreenhouseFieldValue(testCase.input.fieldText, testCase.input.fieldId, testCase.input.profile), testCase.expectedCountry, 'country field should resolve to profile country');
    assert.equal(getGreenhouseFieldValue('If located in the US, in what city and state do you reside?', 'question_67389685', testCase.input.profile), testCase.expectedCity, 'city field should resolve to profile city and state');
  } else {
    assert.deepEqual(actual, testCase.expected, `${testCase.name}: unexpected answer sequence`);
  }
}

assert.equal(
  hasGreenhouseSelectionMatch({ value: 'Austin, TX', optionLabels: ['Austin, Texas, United States'] }),
  true,
  'city/state text should match equivalent state names and abbreviations'
);
assert.equal(
  hasGreenhouseSelectionMatch({ value: 'Austin, TX', optionLabels: [] }),
  true,
  'no option list should not be treated as an invalid location match'
);
assert.equal(
  shouldSkipDirectGreenhouseFieldFill('Location (City)', 'candidate-location'),
  true,
  'direct text fill should skip Greenhouse combobox location fields after selection is handled'
);
assert.equal(
  shouldSkipDirectGreenhouseFieldFill('Email', 'email'),
  false,
  'plain text fields should still be filled directly'
);
assert.equal(
  shouldBlockGreenhouseLocationSubmission({ value: 'Austin, TX', optionLabels: [] }),
  false,
  'empty option lists should not block a valid typed city value'
);
assert.equal(
  shouldBlockGreenhouseLocationSubmission({ value: 'Austin, TX', optionLabels: ['Dallas, Texas, United States'] }),
  true,
  'non-matching option lists should still block invalid selections'
);
assert.equal(
  hasGreenhouseSelectionMatch({ value: 'Austin,AAustinstin Texas', optionLabels: ['Austin, Texas, United States'] }),
  true,
  'browser duplicate typing should still match the canonical city option'
);

console.log(`Greenhouse dropdown answer tests passed: ${cases.length + 7} checks.`);

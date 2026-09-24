import assert from 'node:assert/strict';
import { isRetryableNavigationError } from '../src/browser/navigation.js';

assert.equal(
  isRetryableNavigationError(new Error('page.goto: net::ERR_NETWORK_CHANGED at https://example.com')),
  true,
  'network changed should be retried'
);

assert.equal(
  isRetryableNavigationError(new Error('page.goto: Timeout 30000ms exceeded')),
  true,
  'navigation timeout should be retried'
);

assert.equal(
  isRetryableNavigationError(new Error('Element not found')),
  false,
  'non-navigation issues should not trigger retry loops'
);

console.log('Navigation retry tests passed: 3 checks.');

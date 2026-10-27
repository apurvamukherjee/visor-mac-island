import { expect, test } from 'vitest';
import { isNewer } from './update';

test('versions compare part by part, numerically', () => {
  expect(isNewer('v3.10.0', '3.9.1')).toBe(true);
  expect(isNewer('v3.7.1', '3.7.1')).toBe(false);
  expect(isNewer('3.7', '3.7.1')).toBe(false);
  expect(isNewer('v4.0.0', '3.99.99')).toBe(true);
});

import { expect, test } from 'vitest';
import { NEUTRAL, vividPalette } from './palette';

const pixels = (...colors: [number, number, number][]) => colors.flatMap(([r, g, b]) => [r, g, b, 255]);

test('a grey cover gets the neutral pair', () => {
  expect(vividPalette(pixels([128, 128, 128], [20, 20, 20], [240, 240, 240]))).toEqual(NEUTRAL);
});

test('the two most vivid colours, far enough apart in hue', () => {
  const [first, second] = vividPalette(pixels([250, 30, 30], [240, 40, 30], [30, 30, 250], [90, 90, 90]));
  expect(first).toMatch(/^hsl\(0 /);
  expect(second).toMatch(/^hsl\(240 /);
});

test('a one-colour cover steps round the wheel for its second', () => {
  const [first, second] = vividPalette(pixels([250, 30, 30], [245, 35, 35]));
  expect(first).toMatch(/^hsl\(0 /);
  expect(second).toMatch(/^hsl\(29 /);
});

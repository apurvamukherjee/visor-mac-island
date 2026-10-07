import { expect, test } from 'vitest';
import { WeatherError, describe as describeCode, parseWeather } from './weather';

test('parses the fields the widget shows', () => {
  const json = { current: { temperature_2m: 26.6, weather_code: 1 }, daily: { temperature_2m_max: [32.6], temperature_2m_min: [24] } };
  expect(parseWeather(json)).toEqual({ temp: 26.6, code: 1, high: 32.6, low: 24 });
});

test('rejects malformed responses with a typed error', () => {
  expect(() => parseWeather(null)).toThrow(WeatherError);
  expect(() => parseWeather({ current: {}, daily: {} })).toThrow(WeatherError);
});

test('groups WMO codes', () => {
  expect(describeCode(0).text).toBe('Clear');
  expect(describeCode(61).text).toBe('Rain');
  expect(describeCode(95).text).toBe('Thunderstorms');
});

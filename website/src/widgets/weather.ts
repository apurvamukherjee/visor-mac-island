export interface Weather {
  temp: number;
  code: number;
  high: number;
  low: number;
}

export class WeatherError extends Error {
  override name = 'WeatherError';
}

// Kolkata, where Visor is made. No location prompt: the widget shows the maker's weather, not the visitor's.
export const CITY = { name: 'Kolkata', lat: 22.57, lon: 88.36 };

const isRecord = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null;
const num = (x: unknown) => (typeof x === 'number' ? x : NaN);
const first = (x: unknown) => (Array.isArray(x) ? num(x[0]) : NaN);

export function parseWeather(json: unknown): Weather {
  if (!isRecord(json) || !isRecord(json.current) || !isRecord(json.daily)) throw new WeatherError('Unexpected Open-Meteo response');
  const w = { temp: num(json.current.temperature_2m), code: num(json.current.weather_code), high: first(json.daily.temperature_2m_max), low: first(json.daily.temperature_2m_min) };
  if (Object.values(w).some(Number.isNaN)) throw new WeatherError('Open-Meteo response is missing fields');
  return w;
}

export async function fetchWeather(): Promise<Weather> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${CITY.lat}&longitude=${CITY.lon}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1`;
  const res = await fetch(url);
  if (!res.ok) throw new WeatherError(`Open-Meteo HTTP ${res.status}`);
  return parseWeather(await res.json());
}

// WMO weather interpretation codes, grouped the way the Weather app words them.
export function describe(code: number): { text: string; icon: string } {
  if (code === 0) return { text: 'Clear', icon: '☀️' };
  if (code <= 2) return { text: 'Partly Cloudy', icon: '⛅️' };
  if (code === 3) return { text: 'Cloudy', icon: '☁️' };
  if (code <= 48) return { text: 'Fog', icon: '🌫️' };
  if (code <= 57) return { text: 'Drizzle', icon: '🌦️' };
  if (code <= 67) return { text: 'Rain', icon: '🌧️' };
  if (code <= 77) return { text: 'Snow', icon: '🌨️' };
  if (code <= 82) return { text: 'Showers', icon: '🌧️' };
  return { text: 'Thunderstorms', icon: '⛈️' };
}

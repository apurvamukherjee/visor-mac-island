export interface Conditions {
  /** Degrees Celsius. */
  temperature: number;
  symbol: string;
}

// WMO weather codes as Open-Meteo documents them; WeatherManager.symbol maps the same ranges.
export function symbol(code: number, isDay: boolean) {
  if (code === 0) return isDay ? '☀️' : '🌙';
  if (code <= 2) return isDay ? '⛅' : '☁️';
  if (code === 3) return '☁️';
  if (code === 45 || code === 48) return '🌫️';
  if (code >= 51 && code <= 57) return '🌦️';
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return '🌧️';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return '🌨️';
  if (code >= 95) return '⛈️';
  return '☁️';
}

// The countries that read Fahrenheit.
const FAHRENHEIT = ['US', 'LR', 'MM', 'BS', 'BZ', 'KY', 'PW'];

export function formatTemperature(celsius: number) {
  const region = new Intl.Locale(navigator.language).maximize().region ?? '';
  return FAHRENHEIT.includes(region) ? `${Math.round((celsius * 9) / 5 + 32)}°F` : `${Math.round(celsius)}°C`;
}

function position() {
  return new Promise<GeolocationPosition>((ok, fail) =>
    navigator.geolocation.getCurrentPosition(ok, fail, { maximumAge: 30 * 60_000, timeout: 15_000 }),
  );
}

interface Response {
  current: { temperature_2m: number; weather_code: number; is_day: number };
}

/** Windows location, rounded to about a kilometre before it leaves the PC, like the Mac app. */
export async function fetchWeather(): Promise<Conditions> {
  const { coords } = await position();
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', coords.latitude.toFixed(2));
  url.searchParams.set('longitude', coords.longitude.toFixed(2));
  url.searchParams.set('current', 'temperature_2m,weather_code,is_day');
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo answered ${res.status}`);
  const { current } = (await res.json()) as Response;
  return { temperature: current.temperature_2m, symbol: symbol(current.weather_code, current.is_day === 1) };
}

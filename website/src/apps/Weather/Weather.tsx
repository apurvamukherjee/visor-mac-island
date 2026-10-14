import { CITY, describe, useWeather } from '../../widgets/weather';
import './Weather.css';

export function Weather() {
  const { data, isError } = useWeather();
  const d = data && describe(data.code);
  return (
    <div className="weather-app">
      <span className="weather-pin">📍 Where Visor is made</span>
      <h1>{CITY.name}</h1>
      <div className="weather-temp">{data ? `${Math.round(data.temp)}°` : isError ? '—' : '…'}</div>
      {d && data && (
        <>
          <p className="weather-cond">{d.icon} {d.text}</p>
          <p>H:{Math.round(data.high)}°  L:{Math.round(data.low)}°</p>
        </>
      )}
      {isError && <p>Couldn’t reach Open-Meteo.</p>}
      <small>Live from Open-Meteo. Visor can show the weather beside its calendar.</small>
    </div>
  );
}

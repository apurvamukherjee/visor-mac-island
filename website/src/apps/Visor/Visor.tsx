import { links } from '../../links';
import { features } from '../features';
import './Visor.css';

export function Visor() {
  const { version, build } = __RELEASE__;
  return (
    <div className="visor-app">
      <header className="visor-hero">
        <img src={`${import.meta.env.BASE_URL}icon.png`} alt="" width={96} height={96} />
        <div>
          <h1>Visor</h1>
          <p>Your MacBook’s notch, put to work: music, calendar, a file shelf and the HUDs, right where the camera sits.</p>
          <div className="visor-actions">
            <a className="app-btn is-primary is-big" href={links.dmg}>Download for macOS</a>
            <a className="app-btn is-big" href={links.repo} target="_blank" rel="noreferrer">View on GitHub ↗</a>
          </div>
          <small className="app-muted">Version {version} ({build}) · Free and open source · macOS 14+ · Apple silicon</small>
        </div>
      </header>
      <p className="visor-hint app-muted">Hover the notch at the top of the screen to try it.</p>
      <ul className="visor-features">
        {features.map((f) => (
          <li key={f.title}>
            <img src={f.icon} alt="" width={36} height={36} />
            <div>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

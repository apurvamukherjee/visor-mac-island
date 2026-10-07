import { QUARANTINE_CMD, links } from '../../links';
import { Command } from '../ui';
import './Downloads.css';

export function Downloads() {
  const { version, build, date } = __RELEASE__;
  return (
    <div className="downloads">
      <div className="downloads-file">
        <img src={`${import.meta.env.BASE_URL}icon.png`} alt="" width={64} height={64} />
        <div>
          <b>Visor.dmg</b>
          <span className="app-muted">Version {version} ({build}){date && ` · ${date}`}</span>
        </div>
      </div>
      <a className="app-btn is-primary is-big downloads-cta" href={links.dmg}>Download Visor {version}</a>
      <ol className="downloads-steps">
        <li>Open <b>Visor.dmg</b> and drag Visor into <b>Applications</b>.</li>
        <li>
          Builds are ad-hoc signed, so macOS quarantines them. Clear that once in Terminal:
          <Command text={QUARANTINE_CMD} />
        </li>
        <li>Open Visor. The welcome tour explains each permission before it asks.</li>
      </ol>
      <p className="app-muted downloads-foot">
        Needs macOS 14 Sonoma or later on Apple silicon. <a href={links.releases} target="_blank" rel="noreferrer">All releases ↗</a>
      </p>
    </div>
  );
}

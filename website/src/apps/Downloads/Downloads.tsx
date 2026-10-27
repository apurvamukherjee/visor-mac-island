import { QUARANTINE_CMD, links } from '../../links';
import { Command, WindowsLogo } from '../ui';
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
          Builds are self-signed, not notarized, so macOS quarantines them. Clear that once in Terminal:
          <Command text={QUARANTINE_CMD} />
        </li>
        <li>Open Visor. The welcome tour explains each permission before it asks.</li>
      </ol>
      <p className="app-muted downloads-foot">
        Needs macOS 14 Sonoma or later on Apple silicon. <a href={links.releases} target="_blank" rel="noreferrer">All releases ↗</a>
      </p>
      <a className="app-btn is-big downloads-cta downloads-windows" href={links.exe}><WindowsLogo /> Download for Windows</a>
      <p className="app-muted downloads-foot">
        Windows 10 or 11. Installs for your user only, no admin needed. The installer isn’t signed yet, so SmartScreen asks once: More info › Run anyway.
      </p>
    </div>
  );
}

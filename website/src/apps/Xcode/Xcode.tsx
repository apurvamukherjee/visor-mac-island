import { links } from '../../links';
import { apps } from '../apps';
import { Command } from '../ui';
import './Xcode.css';

export function Xcode() {
  return (
    <div className="xcode">
      <div className="xcode-welcome">
        <img src={apps.xcode.icon} alt="" width={96} height={96} />
        <h1>Build Visor</h1>
        <p className="app-muted">Clone the repo and build it yourself.</p>
        <div className="xcode-steps">
          <Command text={`git clone ${links.repo}.git`} />
          <Command text="cd visor-mac-island && brew install xcodegen && xcodegen generate" />
          <Command text="xcodebuild -scheme Visor -configuration Debug build" />
        </div>
      </div>
      <aside className="xcode-recent">
        <h4>Recent</h4>
        <a href={links.repo} target="_blank" rel="noreferrer"><b>Visor.xcodeproj</b><small>~/Developer/visor-mac-island</small></a>
        <a href={`${links.repo}/tree/main/website`} target="_blank" rel="noreferrer"><b>website</b><small>Vite · React · TypeScript</small></a>
      </aside>
    </div>
  );
}

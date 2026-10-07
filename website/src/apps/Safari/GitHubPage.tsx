import { links } from '../../links';
import './GitHubPage.css';

const hero = new URL('../../../../assets/readme/hero.svg', import.meta.url).href;
const files: [string, string][] = [
  ['.github/workflows', 'ci(site): build and deploy the website'],
  ['Visor', 'the app'],
  ['assets/readme', 'README images'],
  ['scripts', 'make-dmg.sh and release helpers'],
  ['website', 'this desktop'],
  ['CHANGELOG.md', 'what changed in each release'],
  ['LICENSE', 'GPL-3.0'],
  ['README.md', 'start here'],
  ['project.yml', 'XcodeGen project'],
];

// GitHub refuses to load in an iframe, so this is a lookalike that links to the real page.
export function GitHubPage() {
  const { version, date } = __RELEASE__;
  const stars = `https://img.shields.io/github/stars/apurvamukherjee/visor-mac-island?style=social`;
  return (
    <div className="gh">
      <header className="gh-head">
        <div className="gh-repo">
          <a href={links.author} target="_blank" rel="noreferrer">apurvamukherjee</a> / <a href={links.repo} target="_blank" rel="noreferrer"><b>visor-mac-island</b></a>
          <span className="gh-pill">Public</span>
        </div>
        <div className="gh-actions">
          <a href={links.repo} target="_blank" rel="noreferrer"><img src={stars} alt="Star on GitHub" height={20} /></a>
          <a className="gh-btn" href={`${links.repo}/fork`} target="_blank" rel="noreferrer">Fork</a>
        </div>
      </header>
      <nav className="gh-tabs">
        <a className="is-active" href={links.repo} target="_blank" rel="noreferrer">Code</a>
        <a href={links.issues} target="_blank" rel="noreferrer">Issues</a>
        <a href={`${links.repo}/pulls`} target="_blank" rel="noreferrer">Pull requests</a>
        <a href={`${links.repo}/actions`} target="_blank" rel="noreferrer">Actions</a>
        <a href={links.releases} target="_blank" rel="noreferrer">Releases</a>
      </nav>
      <div className="gh-body">
        <main>
          <table className="gh-files">
            <tbody>
              {files.map(([name, msg]) => (
                <tr key={name}>
                  <td>{name.includes('.') && !name.startsWith('.') ? '📄' : '📁'} <a href={`${links.repo}/tree/main/${name}`} target="_blank" rel="noreferrer">{name}</a></td>
                  <td className="gh-msg">{msg}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <article className="gh-readme">
            <h4>README.md</h4>
            <img src={hero} alt="Visor: the notch opens into an island" />
            <p><b>Visor</b> is a free, open-source Mac app by <b>Apurva Mukherjee</b> that turns the notch on your MacBook into something you can use.</p>
            <a className="gh-btn is-green" href={links.dmg}>Download Visor.dmg</a>
          </article>
        </main>
        <aside className="gh-side">
          <h4>About</h4>
          <p>Turns the MacBook notch into a music player, calendar, file shelf and HUD.</p>
          <p>⚖️ GPL-3.0 license</p>
          <h4>Releases</h4>
          <a href={links.releases} target="_blank" rel="noreferrer" className="gh-release">
            🏷 Visor {version} <span className="gh-pill is-green">Latest</span>
            <small>{date}</small>
          </a>
          <h4>Languages</h4>
          <div className="gh-lang"><i style={{ width: '82%', background: '#F05138' }} /><i style={{ width: '18%', background: '#3178c6' }} /></div>
          <small>Swift · TypeScript</small>
        </aside>
      </div>
    </div>
  );
}

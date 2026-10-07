import closed from '../../../../assets/readme/closed.png';
import home from '../../../../assets/readme/home.png';
import shelf from '../../../../assets/readme/shelf.png';
import { links } from '../../links';
import { inline } from '../markdown';
import './AppStore.css';

const sidebar = ['Discover', 'Create', 'Work', 'Play', 'Develop', 'Categories', 'Updates'];
const shots = [
  { src: home, alt: 'The open notch with the player and calendar' },
  { src: shelf, alt: 'The shelf with AirDrop and a drop zone' },
  { src: closed, alt: 'The closed notch with the cover and a visualizer' },
];

export function AppStore() {
  const { version, date, notes } = __RELEASE__;
  const info: [string, string][] = [
    ['Developer', 'Apurva Mukherjee'],
    ['Category', 'Utilities'],
    ['Compatibility', 'macOS 14 or later, Apple silicon'],
    ['Price', 'Free'],
    ['License', 'GPL-3.0, open source'],
    ['Version', version],
  ];
  return (
    <div className="store">
      <nav className="store-side" aria-label="App Store">
        <div className="store-search">🔍 Search</div>
        {sidebar.map((s) => <button key={s} className={s === 'Discover' ? 'is-active' : ''}>{s}</button>)}
      </nav>
      <main className="store-main">
        <header className="store-head">
          <img src={`${import.meta.env.BASE_URL}icon.png`} alt="" width={128} height={128} />
          <div>
            <h1>Visor</h1>
            <p>The notch, put to work</p>
            <a className="store-get" href={links.dmg}>Get</a>
            <small>Free · Not on the Mac App Store; downloads the DMG from GitHub</small>
          </div>
        </header>
        <section>
          <h2>Preview</h2>
          <div className="store-shots">{shots.map((s) => <img key={s.alt} src={s.src} alt={s.alt} />)}</div>
        </section>
        <section className="store-desc">
          <p>Visor turns the notch on your MacBook into something you can use: your music, your calendar, a shelf for files and the volume and brightness HUDs, right where the camera sits.</p>
        </section>
        <section>
          <h2>What’s New <small>Version {version} · {date}</small></h2>
          <ul className="store-new">{notes.slice(0, 4).map((n) => <li key={n}>{inline(n)}</li>)}</ul>
        </section>
        <section>
          <h2>Information</h2>
          <dl className="store-info">{info.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
        </section>
      </main>
    </div>
  );
}

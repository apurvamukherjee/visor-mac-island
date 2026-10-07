import { Cover } from '../../notch/Cover';
import { useNotch } from '../../notch/store';
import { PREVIEW_S, formatTime, trackAt, tracks } from '../../notch/tracks';
import './Music.css';

const sidebar: [string, string[]][] = [
  ['Apple Music', ['Home', 'New', 'Radio']],
  ['Library', ['Recently Added', 'Artists', 'Albums', 'Songs']],
  ['Playlists', ['Visor Mix']],
];

export function Music() {
  const { track: current, playing, position, togglePlay, skip, playTrack } = useNotch();
  const now = trackAt(current);
  const index = ((current % tracks.length) + tracks.length) % tracks.length;
  return (
    <div className="music">
      <nav className="music-side" aria-label="Music">
        <div className="music-search">🔍 Search</div>
        {sidebar.map(([group, items]) => (
          <section key={group}>
            <h4>{group}</h4>
            {items.map((i) => <button key={i} className={i === 'Visor Mix' ? 'is-active' : ''}>{i}</button>)}
          </section>
        ))}
      </nav>
      <div className="music-main">
        <div className="music-bar">
          <div className="music-bar-controls">
            <button aria-label="Previous track" onClick={() => skip(-1)}>⏮</button>
            <button aria-label={playing ? 'Pause' : 'Play'} onClick={togglePlay} className="is-big">{playing ? '⏸' : '▶'}</button>
            <button aria-label="Next track" onClick={() => skip(1)}>⏭</button>
          </div>
          <div className="music-lcd">
            <Cover track={now} size={36} />
            <div>
              <b>{now.title}</b>
              <small>{now.artist} — {now.album}</small>
              <i style={{ width: `${(position / PREVIEW_S) * 100}%` }} />
            </div>
          </div>
        </div>
        <div className="music-list">
          <header className="music-head">
            <div className="music-mosaic">{tracks.slice(0, 4).map((t) => <img key={t.title} src={t.art} alt="" />)}</div>
            <div>
              <small>Playlist</small>
              <h1>Visor Mix</h1>
              <p>Chase Atlantic, The Weeknd · {tracks.length} songs · 30-second previews</p>
              <button className="music-play" onClick={() => playTrack(playing ? index + 1 : index)}>▶ Play</button>
            </div>
          </header>
          <table>
            <tbody>
              {tracks.map((t, i) => (
                <tr key={t.title} className={i === index ? 'is-current' : ''} onDoubleClick={() => playTrack(i)}>
                  <td className="music-n">{i === index && playing ? <span className="music-eq" aria-label="Playing"><i /><i /><i /></span> : i + 1}</td>
                  <td><button className="music-row" onClick={() => playTrack(i)}><img src={t.art} alt="" width={32} height={32} />{t.title}</button></td>
                  <td className="music-dim">{t.artist}</td>
                  <td className="music-dim music-album">{t.album}</td>
                  <td className="music-dim">{formatTime(PREVIEW_S)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

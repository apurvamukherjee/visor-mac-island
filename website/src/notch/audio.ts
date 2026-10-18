import { useSettings } from '../store/settings';
import { useNotch } from './store';
import { trackAt } from './tracks';

export class PlaybackError extends Error {
  override name = 'PlaybackError';
}

// One audio element for the whole page, driven by the notch store so every player (notch, Music, lock screen) stays in sync.
const audio = new Audio();
audio.preload = 'none';

let loaded = -1;
let seeking = false;

function load(track: number) {
  if (loaded === track) return;
  loaded = track;
  audio.src = trackAt(track).preview;
}

function play() {
  load(useNotch.getState().track);
  audio.play().catch((err: unknown) => {
    useNotch.setState({ playing: false });
    // Autoplay without a click is expected to be refused; anything else is a real failure.
    if (!(err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'AbortError'))) {
      throw new PlaybackError(`Could not play ${trackAt(loaded).title}`, { cause: err });
    }
  });
}

audio.volume = useSettings.getState().volume;
useSettings.subscribe((s) => { audio.volume = s.volume; });

audio.addEventListener('timeupdate', () => {
  if (!seeking) useNotch.getState().setPosition(audio.currentTime);
});
audio.addEventListener('ended', () => useNotch.getState().skip(1));

useNotch.subscribe((s, prev) => {
  if (s.track !== prev.track) {
    load(s.track);
    if (s.playing) play();
  }
  if (s.playing !== prev.playing) {
    if (s.playing) play();
    else audio.pause();
  }
  if (s.position !== prev.position && Math.abs(audio.currentTime - s.position) > 1) {
    seeking = true;
    audio.currentTime = s.position;
    seeking = false;
  }
});

// The keyboard's media keys and the system's Now Playing panel drive the same player, as with Visor and Music.
if ('mediaSession' in navigator) {
  const session = navigator.mediaSession;
  const describe = (track: number) => {
    const t = trackAt(track);
    session.metadata = new MediaMetadata({ title: t.title, artist: t.artist, album: t.album, artwork: [{ src: t.art, sizes: '600x600', type: 'image/jpeg' }] });
  };
  describe(useNotch.getState().track);
  session.setActionHandler('play', () => useNotch.setState({ playing: true }));
  session.setActionHandler('pause', () => useNotch.setState({ playing: false }));
  session.setActionHandler('previoustrack', () => useNotch.getState().skip(-1));
  session.setActionHandler('nexttrack', () => useNotch.getState().skip(1));
  useNotch.subscribe((s, prev) => {
    if (s.track !== prev.track) describe(s.track);
    if (s.playing !== prev.playing) session.playbackState = s.playing ? 'playing' : 'paused';
  });
}

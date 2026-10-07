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

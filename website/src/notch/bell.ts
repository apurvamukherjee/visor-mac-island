// A short two-tone bell made with Web Audio, so no sound file ships with the site.
export function ringBell() {
  const ctx = new AudioContext();
  [880, 1320].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    const t = ctx.currentTime + i * 0.18;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 1.3);
  });
  setTimeout(() => void ctx.close(), 2000);
}

// A nod to the Mac startup chime: an F major chord swelling and fading. Resolves when it has rung out.
export function playChime(): Promise<void> {
  const ctx = new AudioContext();
  const t = ctx.currentTime;
  [174.61, 261.63, 349.23, 440, 523.25].forEach((freq) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.12, t + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 1.7);
  });
  return new Promise((done) => setTimeout(() => void ctx.close().then(done), 1500));
}

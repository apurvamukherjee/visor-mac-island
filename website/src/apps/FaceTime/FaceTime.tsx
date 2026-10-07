import { useEffect, useRef, useState } from 'react';
import './FaceTime.css';

type State = 'idle' | 'on' | 'denied';

// Visor's Mirror is a camera check before a call; this is the same idea. The stream stays in the page.
export function FaceTime() {
  const video = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [state, setState] = useState<State>('idle');

  useEffect(() => {
    if (video.current) video.current.srcObject = stream;
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, [stream]);

  const start = async () => {
    try {
      setStream(await navigator.mediaDevices.getUserMedia({ video: true, audio: false }));
      setState('on');
    } catch (err: unknown) {
      if (err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'NotFoundError')) setState('denied');
      else throw err;
    }
  };

  return (
    <div className="facetime">
      {state === 'on' ? (
        <>
          <video ref={video} autoPlay playsInline muted aria-label="Your camera" />
          <button className="facetime-end" onClick={() => { setStream(null); setState('idle'); }}>End</button>
        </>
      ) : (
        <div className="facetime-idle">
          <span className="facetime-avatar" aria-hidden>🪞</span>
          <h2>Mirror</h2>
          <p>{state === 'denied' ? 'Camera access was blocked. Allow it in your browser to try the mirror.' : 'Check your camera before a call, like Visor’s mirror. Nothing leaves your browser.'}</p>
          <button className="facetime-start" onClick={() => void start()}>Turn On Camera</button>
        </div>
      )}
    </div>
  );
}

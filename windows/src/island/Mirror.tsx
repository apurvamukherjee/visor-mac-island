import { useEffect, useRef, useState } from 'react';

/** WebcamView: a mirrored camera preview beside the player, for a quick look before a call. */
export function Mirror() {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  // The camera is an outside system: it's on only while the mirror shows, so the privacy dot goes out with it.
  useEffect(() => {
    let stream: MediaStream | null = null;
    let gone = false;
    navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } }).then(
      (s) => {
        if (gone) return s.getTracks().forEach((t) => t.stop());
        stream = s;
        if (video.current) video.current.srcObject = s;
      },
      (e: unknown) => setError(e instanceof DOMException && e.name === 'NotAllowedError' ? 'Camera access is off' : 'No camera found'),
    );
    return () => {
      gone = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="mirror">
      {error ? <span className="mirror-error">{error}</span> : <video ref={video} autoPlay muted playsInline aria-label="Camera preview" />}
    </div>
  );
}

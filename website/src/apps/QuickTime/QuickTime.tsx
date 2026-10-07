import demo from '../../../../assets/readme/demo.mp4';
import poster from '../../../../assets/readme/home.png';
import './QuickTime.css';

export function QuickTime() {
  return (
    <div className="quicktime">
      <video src={demo} poster={poster} autoPlay muted loop playsInline controls aria-label="Visor demo: the island opening, playing music and showing the calendar" />
    </div>
  );
}

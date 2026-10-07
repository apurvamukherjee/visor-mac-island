import './Maps.css';

const KOLKATA = { lat: 22.5726, lon: 88.3639 };
const bbox = [KOLKATA.lon - 0.08, KOLKATA.lat - 0.05, KOLKATA.lon + 0.08, KOLKATA.lat + 0.05].join(',');
const embed = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${KOLKATA.lat},${KOLKATA.lon}`;

export function Maps() {
  return (
    <div className="maps">
      <aside className="maps-card">
        <b>Kolkata</b>
        <small>West Bengal, India</small>
        <p>Where Visor is made.</p>
        <a href={`https://www.openstreetmap.org/?mlat=${KOLKATA.lat}&mlon=${KOLKATA.lon}#map=12/${KOLKATA.lat}/${KOLKATA.lon}`} target="_blank" rel="noreferrer">Open in OpenStreetMap ↗</a>
      </aside>
      <iframe title="Map of Kolkata" src={embed} loading="lazy" />
    </div>
  );
}

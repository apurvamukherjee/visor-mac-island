const icon = (name: string) => new URL(`../../../assets/readme/icons/${name}.svg`, import.meta.url).href;

export interface Feature {
  title: string;
  icon: string;
  text: string;
}

// Condensed from the README's Features section; keep the two in step when a feature changes.
export const features: Feature[] = [
  { title: 'Now Playing', icon: icon('music'), text: 'Cover, title, a scrubbable timeline and controls for whatever plays: Music, Spotify, or YouTube Music in a browser.' },
  { title: 'Live activity', icon: icon('live'), text: 'Closed, the cover sits on one wing and a visualizer on the other. Sneak peek flashes each new song.' },
  { title: 'Vinyl mode', icon: icon('vinyl'), text: 'A spinning record with the art on its label. The tonearm drops on play and swings back on pause.' },
  { title: 'Lock & unlock', icon: icon('lock'), text: 'A padlock snaps shut in the notch while your Mac is locked; the lock screen keeps the player.' },
  { title: 'HUDs', icon: icon('hud'), text: 'Volume, brightness and keyboard backlight show in the notch instead of the big macOS overlay.' },
  { title: 'Battery', icon: icon('battery'), text: 'Charge level beside the notch, and a heads-up when you plug in or unplug.' },
  { title: 'Shelf', icon: icon('shelf'), text: 'Drop files on the notch, drag them out later, AirDrop or Quick Look them. They survive restarts.' },
  { title: 'Calendar & Reminders', icon: icon('calendar'), text: 'A week strip with today’s events, weather, and a one-click Join for Zoom, Meet, Teams and Webex.' },
  { title: 'Mirror', icon: icon('mirror'), text: 'A camera check in one click before a call. Round or square.' },
  { title: 'Hover & gestures', icon: icon('gestures'), text: 'Hover to open, scroll down to open, up to close, sideways to skip, with a haptic tap.' },
  { title: 'Timer', icon: icon('live'), text: 'A 1 to 60 minute timer. The countdown sits beside the notch and a bell rings at the end.' },
  { title: 'Downloads', icon: icon('download'), text: 'A ring fills beside the notch while Safari, Chrome or Firefox downloads a file.' },
  { title: 'Any display', icon: icon('displays'), text: 'Made for notched MacBooks; other screens get a floating island sized your way.' },
  { title: 'Make it yours', icon: icon('custom'), text: 'Accent colors, Liquid Glass on macOS 26, artwork tint, glow and the player buttons you want.' },
  { title: 'Camera & mic', icon: icon('shield'), text: 'A green dot while an app uses a camera, orange while one uses the microphone.' },
  { title: 'Light & up to date', icon: icon('chip'), text: 'Barely wakes while music plays, calms down in Low Power Mode, and tells you about new versions.' },
];

export interface Track {
  title: string;
  artist: string;
  album: string;
  art: string;
  link: string;
  preview: string;
}

const art = (path: string) => `https://is1-ssl.mzstatic.com/image/thumb/${path}/600x600bb.jpg`;
const preview = (path: string) => `https://audio-ssl.itunes.apple.com/itunes-assets/${path}.plus.aac.p.m4a`;

// Apple's previews are 30 seconds; the player shows the preview, not the full song.
export const PREVIEW_S = 30;

// Metadata, artwork and 30-second previews from the iTunes Search API, streamed from Apple's CDN rather than
// shipped, and each track links to Apple Music.
export const tracks: [Track, ...Track[]] = [
  { title: 'Swim', artist: 'Chase Atlantic', album: 'Chase Atlantic', art: art('Music125/v4/d1/36/7e/d1367ea2-40e5-c689-5241-290f1b0daaf9/093624914174.jpg'), link: 'https://music.apple.com/us/album/swim/1290755604', preview: preview('AudioPreview211/v4/62/20/b3/6220b31b-bb4e-a74a-bb80-fbed531490be/mzaf_16963009197566026715') },
  { title: 'Blinding Lights', artist: 'The Weeknd', album: 'After Hours', art: art('Music125/v4/6f/bc/e6/6fbce6c4-c38c-72d8-4fd0-66cfff32f679/20UMGIM12176.rgb.jpg'), link: 'https://music.apple.com/us/album/blinding-lights/1499378108', preview: preview('AudioPreview211/v4/19/d6/60/19d660ff-e3a9-8377-15a3-ce4b28e89cac/mzaf_18422426156481158187') },
  { title: 'Into It', artist: 'Chase Atlantic', album: 'Part One', art: art('Music125/v4/5e/77/31/5e77310c-003b-e3f2-ca0d-da2fc94b7ba9/093624913436.jpg'), link: 'https://music.apple.com/us/album/into-it/1197080053', preview: preview('AudioPreview221/v4/32/94/0f/32940fb4-ab55-88a5-af7b-5f29f276d343/mzaf_12684891256221466355') },
  { title: 'Starboy', artist: 'The Weeknd', album: 'Starboy', art: art('Music115/v4/b5/92/bb/b592bb72-52e3-e756-9b26-9f56d08f47ab/16UMGIM67864.rgb.jpg'), link: 'https://music.apple.com/us/album/starboy-feat-daft-punk/1440870373', preview: preview('AudioPreview221/v4/11/71/d6/1171d6ad-3c96-e027-2af6-58028426588c/mzaf_15137631797407745471') },
  { title: 'Friends', artist: 'Chase Atlantic', album: 'Nostalgia', art: art('Music221/v4/90/d1/3f/90d13fba-4c95-f97a-511c-145a39df9e68/5055834135256.jpg'), link: 'https://music.apple.com/us/album/friends/1708867356', preview: preview('AudioPreview221/v4/3a/9a/36/3a9a360d-7f06-86b6-7336-794e5167141d/mzaf_13584895285351627525') },
  { title: 'Die For You', artist: 'The Weeknd', album: 'Starboy', art: art('Music115/v4/e2/61/f8/e261f8c1-73db-9a7a-c89e-1068f19970e0/16UMGIM67863.rgb.jpg'), link: 'https://music.apple.com/us/album/die-for-you/1440871397', preview: preview('AudioPreview221/v4/50/50/1a/50501a86-bd74-e90d-8a56-68c9b5e6e7d6/mzaf_4588197682084244913') },
  { title: 'High For This', artist: 'The Weeknd', album: 'House of Balloons', art: art('Music114/v4/31/18/fa/3118fab0-90ea-2ae5-cf6c-bc64054ab9e3/21UMGIM21449.rgb.jpg'), link: 'https://music.apple.com/us/album/high-for-this-original/1558941834', preview: preview('AudioPreview221/v4/ba/15/40/ba1540a8-85c8-8be4-fb36-bf41724e7415/mzaf_9906795115333967924') },
];

export const trackAt = (i: number): Track => tracks[((i % tracks.length) + tracks.length) % tracks.length] ?? tracks[0];

export const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

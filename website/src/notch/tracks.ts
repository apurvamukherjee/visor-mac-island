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
const t = (title: string, artist: string, album: string, artPath: string, link: string, previewPath: string): Track => ({
  title, artist, album, art: art(artPath), link, preview: preview(previewPath),
});

export const tracks: [Track, ...Track[]] = [
  t('Swim', 'Chase Atlantic', 'Chase Atlantic', 'Music125/v4/d1/36/7e/d1367ea2-40e5-c689-5241-290f1b0daaf9/093624914174.jpg', 'https://music.apple.com/us/album/swim/1290755604', 'AudioPreview211/v4/62/20/b3/6220b31b-bb4e-a74a-bb80-fbed531490be/mzaf_16963009197566026715'),
  t('Blinding Lights', 'The Weeknd', 'After Hours', 'Music125/v4/6f/bc/e6/6fbce6c4-c38c-72d8-4fd0-66cfff32f679/20UMGIM12176.rgb.jpg', 'https://music.apple.com/us/album/blinding-lights/1499378108', 'AudioPreview211/v4/19/d6/60/19d660ff-e3a9-8377-15a3-ce4b28e89cac/mzaf_18422426156481158187'),
  t('Into It', 'Chase Atlantic', 'Part One', 'Music125/v4/5e/77/31/5e77310c-003b-e3f2-ca0d-da2fc94b7ba9/093624913436.jpg', 'https://music.apple.com/us/album/into-it/1197080053', 'AudioPreview221/v4/32/94/0f/32940fb4-ab55-88a5-af7b-5f29f276d343/mzaf_12684891256221466355'),
  t('Starboy', 'The Weeknd', 'Starboy', 'Music115/v4/b5/92/bb/b592bb72-52e3-e756-9b26-9f56d08f47ab/16UMGIM67864.rgb.jpg', 'https://music.apple.com/us/album/starboy-feat-daft-punk/1440870373', 'AudioPreview221/v4/11/71/d6/1171d6ad-3c96-e027-2af6-58028426588c/mzaf_15137631797407745471'),
  t('Friends', 'Chase Atlantic', 'Nostalgia', 'Music221/v4/90/d1/3f/90d13fba-4c95-f97a-511c-145a39df9e68/5055834135256.jpg', 'https://music.apple.com/us/album/friends/1708867356', 'AudioPreview221/v4/3a/9a/36/3a9a360d-7f06-86b6-7336-794e5167141d/mzaf_13584895285351627525'),
  t('Die For You', 'The Weeknd', 'Starboy', 'Music115/v4/e2/61/f8/e261f8c1-73db-9a7a-c89e-1068f19970e0/16UMGIM67863.rgb.jpg', 'https://music.apple.com/us/album/die-for-you/1440871397', 'AudioPreview221/v4/50/50/1a/50501a86-bd74-e90d-8a56-68c9b5e6e7d6/mzaf_4588197682084244913'),
  t('High For This', 'The Weeknd', 'House of Balloons', 'Music114/v4/31/18/fa/3118fab0-90ea-2ae5-cf6c-bc64054ab9e3/21UMGIM21449.rgb.jpg', 'https://music.apple.com/us/album/high-for-this-original/1558941834', 'AudioPreview221/v4/ba/15/40/ba1540a8-85c8-8be4-fb36-bf41724e7415/mzaf_9906795115333967924'),
  t('Okay', 'Chase Atlantic', 'Chase Atlantic', 'Music125/v4/d1/36/7e/d1367ea2-40e5-c689-5241-290f1b0daaf9/093624914174.jpg', 'https://music.apple.com/us/album/okay/1290755604', 'AudioPreview211/v4/bd/8d/e3/bd8de3b3-3422-ad47-c800-265416784a4b/mzaf_14428822608784493083'),
  t('Save Your Tears', 'The Weeknd', 'After Hours', 'Music125/v4/6f/bc/e6/6fbce6c4-c38c-72d8-4fd0-66cfff32f679/20UMGIM12176.rgb.jpg', 'https://music.apple.com/us/album/save-your-tears/1499378108', 'AudioPreview221/v4/14/4c/93/144c934b-0cf0-6862-7209-a881b7224294/mzaf_11580342643921855366'),
  t('Slow Down', 'Chase Atlantic', 'Paradise', 'Music116/v4/31/90/79/31907989-2f32-9e91-6f58-69d65ee2371e/5059033998360.jpg', 'https://music.apple.com/us/album/slow-down/1708868570', 'AudioPreview211/v4/3f/dc/ba/3fdcba40-a1b9-502a-d79b-0d3f61ef636e/mzaf_2391568117539785637'),
  t('The Hills', 'The Weeknd', 'Beauty Behind the Madness', 'Music124/v4/40/cd/1a/40cd1a65-7948-eb96-74c6-1c4b3497456c/15UMGIM36513.rgb.jpg', 'https://music.apple.com/us/album/the-hills/1440826239', 'AudioPreview211/v4/5e/c0/57/5ec057de-f005-6235-49e0-685995c9e016/mzaf_12436354896756929883'),
  t('Church', 'Chase Atlantic', 'Part One', 'Music125/v4/5e/77/31/5e77310c-003b-e3f2-ca0d-da2fc94b7ba9/093624913436.jpg', 'https://music.apple.com/us/album/church/1197080053', 'AudioPreview211/v4/08/38/cf/0838cf6a-0763-4279-6f55-69b98b743193/mzaf_7255607546800570121'),
  t('Call Out My Name', 'The Weeknd', 'My Dear Melancholy,', 'Music115/v4/2a/aa/b4/2aaab42a-a4cb-a600-4a25-d78961495960/18UMGIM17204.rgb.jpg', 'https://music.apple.com/us/album/call-out-my-name/1363309866', 'AudioPreview211/v4/d1/2f/3d/d12f3d43-a2e2-eba4-8db5-91f3f3c13f5a/mzaf_8470584399239689698'),
  t('Meddle About', 'Chase Atlantic', 'Meddle About', 'Music126/v4/5d/87/3b/5d873b4b-4a35-eefa-347a-c53d70cea9b4/5055834153564.jpg', 'https://music.apple.com/us/album/meddle-about/1713639127', 'AudioPreview221/v4/f4/cf/bc/f4cfbc56-5355-c630-a490-5d351e620f1a/mzaf_4300956829901113916'),
  t('Can\'t Feel My Face', 'The Weeknd', 'Beauty Behind the Madness', 'Music124/v4/40/cd/1a/40cd1a65-7948-eb96-74c6-1c4b3497456c/15UMGIM36513.rgb.jpg', 'https://music.apple.com/us/album/cant-feel-my-face/1440826239', 'AudioPreview221/v4/1e/cd/50/1ecd50b2-343b-c570-d976-7e089e56e0a5/mzaf_7391966967236748397'),
  t('Often', 'The Weeknd', 'Beauty Behind the Madness', 'Music124/v4/40/cd/1a/40cd1a65-7948-eb96-74c6-1c4b3497456c/15UMGIM36513.rgb.jpg', 'https://music.apple.com/us/album/often/1440826239', 'AudioPreview221/v4/86/74/96/867496b7-6a58-20e2-10ec-c3392632232b/mzaf_4605202725979000134'),
  t('Earned It', 'The Weeknd', 'Fifty Shades of Grey', 'Music122/v4/fd/7a/13/fd7a1394-5ce1-6da6-93ad-977533762a1f/15UMGIM00463.rgb.jpg', 'https://music.apple.com/us/album/earned-it/1440845197', 'AudioPreview221/v4/04/13/7a/04137aba-99fa-6331-81d5-d69097ab97be/mzaf_3869073502048666760'),
];

export const trackAt = (i: number): Track => tracks[((i % tracks.length) + tracks.length) % tracks.length] ?? tracks[0];

export const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

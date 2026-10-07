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

// The playlist “ruined by her hands”: Apurva’s picks first, in their order, then Chase Atlantic and The Weeknd.
export const tracks: [Track, ...Track[]] = [
  t('Jealous', 'Eyedress', 'Jealous', 'Music211/v4/a5/53/d7/a553d7cd-08df-b1b1-9b46-f55f19af635b/0878390006205_cover.jpg', 'https://music.apple.com/us/album/jealous/1829721811', 'AudioPreview211/v4/7c/c6/86/7cc686ea-5d13-6984-565d-f2fb6d9cdcd2/mzaf_4291589743695805168'),
  t('Bad Habit', 'Steve Lacy', 'Gemini Rights', 'Music221/v4/41/cf/77/41cf7744-535f-3679-0ca6-c1b8d3f98c8f/196874557266.jpg', 'https://music.apple.com/us/album/bad-habit/6788150539', 'AudioPreview211/v4/fd/df/23/fddf23b3-bc0c-2a6c-b811-e9784e2e8fc2/mzaf_16866686323648484948'),
  t('Smooth Operator (Single Version)', 'Sade', 'The Best of Sade', 'Music115/v4/5f/ad/2a/5fad2aca-d998-701d-7b27-c074339d5fd0/886972262628.jpg', 'https://music.apple.com/us/album/smooth-operator-single-version/604770232', 'AudioPreview221/v4/c6/db/56/c6db5666-4464-a6e5-d6e8-8d481b926e70/mzaf_17727462257578713488'),
  t('Stayin’ Alive', 'Bee Gees', 'Staying Alive (Original Motion Picture Soundtrack)', 'Music128/v4/6d/ed/e9/6dede96a-6c1b-c5bb-001b-e3039195bdbb/00602567067177.rgb.jpg', 'https://music.apple.com/us/album/stayin-alive/1440899890', 'AudioPreview211/v4/3f/26/77/3f2677d0-8077-c16a-7eea-7795fa614e0f/mzaf_14501202821130740263'),
  t('All I Wanted', 'Paramore', 'Brand New Eyes (Deluxe Version)', 'Music124/v4/04/97/17/049717b9-67ea-126b-7b3b-eaaa7f048dd8/dj.gczfwqsh.jpg', 'https://music.apple.com/us/album/all-i-wanted/607337417', 'AudioPreview211/v4/68/15/13/681513b3-9b1d-b595-87a5-9f3f89064f31/mzaf_10274762722318579110'),
  t('Midnight in a Perfect World', 'DJ Shadow', 'Endtroducing.....', 'Music122/v4/0d/14/6d/0d146d5c-44c5-22e2-c596-2242180f4774/5400863103361_cover.jpg', 'https://music.apple.com/us/album/midnight-in-a-perfect-world/1660485817', 'AudioPreview221/v4/de/3f/ef/de3fef5c-45b6-c406-74b3-19b1a7d36801/mzaf_5889275247233806044'),
  t('Friends', 'Chase Atlantic', 'Nostalgia', 'Music221/v4/90/d1/3f/90d13fba-4c95-f97a-511c-145a39df9e68/5055834135256.jpg', 'https://music.apple.com/us/album/friends/1708867356', 'AudioPreview221/v4/3a/9a/36/3a9a360d-7f06-86b6-7336-794e5167141d/mzaf_13584895285351627525'),
  t('Softcore', 'The Neighbourhood', 'Hard To Imagine The Neighbourhood Ever Changing', 'Music125/v4/fc/d0/89/fcd0899c-2236-a726-9ce2-ebb110e2204d/886447414545.jpg', 'https://music.apple.com/us/album/softcore/1440532502', 'AudioPreview221/v4/1b/08/9e/1b089e17-1084-d825-d576-66d46ae1e243/mzaf_11823295334220528749'),
  t('Doubt', 'twenty one pilots', 'Blurryface', 'Music211/v4/8e/e2/89/8ee28904-0821-610d-5011-a61845f62756/075679926951.jpg', 'https://music.apple.com/us/album/doubt/974485462', 'AudioPreview211/v4/ac/18/8b/ac188b7d-ede2-6546-f127-4ba373950aaf/mzaf_4034588712522087740'),
  t('BABYDOLL', 'Ari Abdul', 'BABYDOLL', 'Music122/v4/3d/21/89/3d21895b-048a-2420-fa67-0e408ced2455/196700749070.jpg', 'https://music.apple.com/us/album/babydoll/1616203086', 'AudioPreview211/v4/00/03/22/0003226a-0458-07f1-8f5e-5f5b08553514/mzaf_2930245327792553908'),
  t('Moth To A Flame', 'Swedish House Mafia & The Weeknd', 'Paradise Again', 'Music112/v4/2d/29/7e/2d297efe-2bb9-7aa9-38c7-9cfd46cbdcac/22UMGIM37187.rgb.jpg', 'https://music.apple.com/us/album/moth-to-a-flame/1618145588', 'AudioPreview221/v4/bb/68/86/bb688685-67b3-8b8b-b30b-228198384dc4/mzaf_6772664971473573459'),
  t('OHMAMI', 'Chase Atlantic', 'OHMAMI', 'Music115/v4/05/02/a6/0502a67e-9242-a02e-62db-3a6f8bd4ed7e/21CRGIM28540.rgb.jpg', 'https://music.apple.com/us/album/ohmami/1571847403', 'AudioPreview211/v4/a7/8e/13/a78e1374-bb20-90be-9584-18eade542620/mzaf_2819071388772582753'),
  t('Numb to the Feeling', 'Chase Atlantic', 'Numb to the Feeling', 'Music114/v4/f2/79/69/f27969af-f55f-23d2-103a-04306c7f91ab/054391951090.jpg', 'https://music.apple.com/us/album/numb-to-the-feeling/1364912613', 'AudioPreview122/v4/24/66/c4/2466c467-66fb-aa6c-533d-af84c112ceb1/mzaf_9169314385273430914'),
  t('Triggered', 'Chase Atlantic', 'Chase Atlantic', 'Music125/v4/d1/36/7e/d1367ea2-40e5-c689-5241-290f1b0daaf9/093624914174.jpg', 'https://music.apple.com/us/album/triggered/1290755604', 'AudioPreview221/v4/5a/89/1d/5a891dfa-44b8-8687-cdc3-578fe14dbd67/mzaf_10214355521708912408'),
  t('Cassie', 'Chase Atlantic', 'Chase Atlantic', 'Music125/v4/d1/36/7e/d1367ea2-40e5-c689-5241-290f1b0daaf9/093624914174.jpg', 'https://music.apple.com/us/album/cassie/1290755604', 'AudioPreview221/v4/f8/1c/ee/f81cee83-2633-7cf2-b56b-d242643e1185/mzaf_14799884160737737318'),
  t('Uncomfortable', 'Chase Atlantic', 'Chase Atlantic', 'Music125/v4/d1/36/7e/d1367ea2-40e5-c689-5241-290f1b0daaf9/093624914174.jpg', 'https://music.apple.com/us/album/uncomfortable/1290755604', 'AudioPreview221/v4/36/36/f7/3636f7e8-6a7d-d3bd-820c-b2fde12703e5/mzaf_7067841834905093442'),
  t('HEAVEN AND BACK', 'Chase Atlantic', 'PHASES', 'Music113/v4/d1/a6/63/d1a66336-de0b-d541-df25-3bcd3e14f7ea/4050538506297.jpg', 'https://music.apple.com/us/album/heaven-and-back/1460407836', 'AudioPreview221/v4/73/83/39/7383393f-9e44-dc14-ab6b-2283143c06ba/mzaf_10443090398063011912'),
  t('SLIDE', 'Chase Atlantic', 'BEAUTY IN DEATH', 'Music114/v4/bb/28/ec/bb28ecc1-302e-5c9b-f9a2-c87b7f790b16/21CRGIM25885.rgb.jpg', 'https://music.apple.com/us/album/slide/1550876511', 'AudioPreview221/v4/a7/1f/14/a71f1487-cc76-16a4-4dc1-5cf24e441e0e/mzaf_11220211621595833215'),
  t('Right Here', 'Chase Atlantic', 'Part One', 'Music125/v4/5e/77/31/5e77310c-003b-e3f2-ca0d-da2fc94b7ba9/093624913436.jpg', 'https://music.apple.com/us/album/right-here/1197080053', 'AudioPreview211/v4/cd/28/67/cd286787-16a0-025f-3450-813db0540123/mzaf_11485540069523476276'),
  t('DEVILISH', 'Chase Atlantic', 'DON\'T TRY THIS', 'Music114/v4/c3/79/ae/c379ae0b-f0d1-1ac4-207f-7baed45d4f04/4050538467802.jpg', 'https://music.apple.com/us/album/devilish/1448869074', 'AudioPreview211/v4/00/b0/d0/00b0d057-6ac5-1fae-52cc-70c99b2e19c4/mzaf_10418359310024986207'),
  t('Moonlight', 'Chase Atlantic', 'Paradise', 'Music116/v4/31/90/79/31907989-2f32-9e91-6f58-69d65ee2371e/5059033998360.jpg', 'https://music.apple.com/us/album/moonlight/1708868570', 'AudioPreview211/v4/8e/b3/2a/8eb32aff-a7d0-3c0a-9897-ef4ee7ea537c/mzaf_467652645987377423'),
  t('Swim', 'Chase Atlantic', 'Chase Atlantic', 'Music125/v4/d1/36/7e/d1367ea2-40e5-c689-5241-290f1b0daaf9/093624914174.jpg', 'https://music.apple.com/us/album/swim/1290755604', 'AudioPreview211/v4/62/20/b3/6220b31b-bb4e-a74a-bb80-fbed531490be/mzaf_16963009197566026715'),
  t('Blinding Lights', 'The Weeknd', 'After Hours', 'Music125/v4/6f/bc/e6/6fbce6c4-c38c-72d8-4fd0-66cfff32f679/20UMGIM12176.rgb.jpg', 'https://music.apple.com/us/album/blinding-lights/1499378108', 'AudioPreview211/v4/19/d6/60/19d660ff-e3a9-8377-15a3-ce4b28e89cac/mzaf_18422426156481158187'),
  t('Into It', 'Chase Atlantic', 'Part One', 'Music125/v4/5e/77/31/5e77310c-003b-e3f2-ca0d-da2fc94b7ba9/093624913436.jpg', 'https://music.apple.com/us/album/into-it/1197080053', 'AudioPreview221/v4/32/94/0f/32940fb4-ab55-88a5-af7b-5f29f276d343/mzaf_12684891256221466355'),
  t('Starboy', 'The Weeknd', 'Starboy', 'Music115/v4/b5/92/bb/b592bb72-52e3-e756-9b26-9f56d08f47ab/16UMGIM67864.rgb.jpg', 'https://music.apple.com/us/album/starboy-feat-daft-punk/1440870373', 'AudioPreview221/v4/11/71/d6/1171d6ad-3c96-e027-2af6-58028426588c/mzaf_15137631797407745471'),
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

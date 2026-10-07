export interface Wallpaper {
  file: string;
  title: string;
  artist: string;
  year: string;
  source: string;
}

const commons = (file: string) => `https://commons.wikimedia.org/wiki/File:${file}`;

// Japanese woodblock prints and paintings, all public domain, from Wikimedia Commons.
export const wallpapers: [Wallpaper, ...Wallpaper[]] = [
  { file: 'great-wave.webp', title: 'The Great Wave off Kanagawa', artist: 'Katsushika Hokusai', year: 'c. 1831', source: commons('Tsunami_by_hokusai_19th_century.jpg') },
  { file: 'dragon.webp', title: 'Tamatori-hime and the Dragon King (detail)', artist: 'Utagawa Kuniyoshi', year: '1853', source: commons('Ryūgū_Tamatori-hime_no_Zu_(Detail_-_Dragon).jpg') },
  { file: 'red-fuji.webp', title: 'Fine Wind, Clear Morning (Red Fuji)', artist: 'Katsushika Hokusai', year: 'c. 1831', source: commons('Katsushika_Hokusai_-_Fine_Wind,_Clear_Morning_(Gaifū_kaisei)_-_Google_Art_Project.jpg') },
  { file: 'whirlpools-awa.webp', title: 'The Whirlpools of Awa', artist: 'Utagawa Hiroshige', year: '1857', source: commons('Awa_no_Naruto-雪月花_阿波鳴門之風景-The_Whirlpools_of_Awa_MET_DP146864.jpg') },
  { file: 'storm-fuji.webp', title: 'Thunderstorm Beneath the Summit', artist: 'Katsushika Hokusai', year: 'c. 1831', source: commons('Lightnings_below_the_summit.jpg') },
  { file: 'dragon-king.webp', title: 'Recovering the Jewel from the Dragon King’s Palace', artist: 'Utagawa Kuniyoshi', year: '1853', source: commons('Ryugu_Tamatori_Hime_no_su-Recovering_the_Stolen_Jewel_from_the_Palace_of_the_Dragon_King_MET_DP146820.jpg') },
  { file: 'kajikazawa.webp', title: 'Kajikazawa in Kai Province', artist: 'Katsushika Hokusai', year: 'c. 1831', source: commons('Kajikazawa_in_Kai_province.jpg') },
  { file: 'coast-moonlight.webp', title: 'Coastal Landscape in Moonlight', artist: 'Utagawa Hiroshige', year: '1857', source: commons('Hiroshige,_Coastal_landscape_in_moonlight.jpg') },
  { file: 'dragon-cavern.webp', title: 'Pines and Waves at the Dragon Cavern', artist: 'Katsushika Hokusai', year: 'c. 1833', source: commons('Katsushika_Hokusai_Pines_and_Waves_at_the_Dragon_Cavern.jpeg') },
  { file: 'kanaya.webp', title: 'Fuji from Kanaya on the Tōkaidō', artist: 'Katsushika Hokusai', year: 'c. 1831', source: commons('The_Fuji_from_Kanaya_on_the_Tokaido.jpg') },
  { file: 'musashi-whale.webp', title: 'Miyamoto Musashi Attacking a Giant Whale', artist: 'Utagawa Kuniyoshi', year: '1847', source: commons('Miyamoto-Musashi-Attacking-Giant-Whale-Utagawa-Kuniyoshi.png') },
  { file: 'ejiri.webp', title: 'Ejiri in Suruga Province', artist: 'Katsushika Hokusai', year: 'c. 1831', source: commons('Ejiri_in_the_Suruga_province.jpg') },
  { file: 'kanbara-snow.webp', title: 'Night Snow at Kanbara', artist: 'Utagawa Hiroshige', year: 'c. 1833', source: commons('Kanbara_LCCN2008660619.jpg') },
  { file: 'tago-bay.webp', title: 'Tago Bay near Ejiri on the Tōkaidō', artist: 'Katsushika Hokusai', year: 'c. 1831', source: commons('Shore_of_Tago_Bay,_Ejiri_at_Tokaido.jpg') },
];

export const wallpaperUrl = (w: Wallpaper) => `${import.meta.env.BASE_URL}wallpapers/${w.file}`;

export const wallpaperAt = (i: number): Wallpaper => wallpapers[i % wallpapers.length] ?? wallpapers[0];

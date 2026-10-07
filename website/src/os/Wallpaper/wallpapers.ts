export interface Wallpaper {
  file: string;
  title: string;
  artist: string;
  year: string;
  source: string;
}

const commons = (file: string) => `https://commons.wikimedia.org/wiki/File:${file}`;

// All public domain, from Wikimedia Commons.
export const wallpapers: [Wallpaper, ...Wallpaper[]] = [
  { file: 'starry-night.webp', title: 'The Starry Night', artist: 'Vincent van Gogh', year: '1889', source: commons('Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg') },
  { file: 'great-wave.webp', title: 'The Great Wave off Kanagawa', artist: 'Katsushika Hokusai', year: 'c. 1831', source: commons('Tsunami_by_hokusai_19th_century.jpg') },
  { file: 'impression-sunrise.webp', title: 'Impression, Sunrise', artist: 'Claude Monet', year: '1872', source: commons('Monet_-_Impression,_Sunrise.jpg') },
  { file: 'sierra-nevada.webp', title: 'Among the Sierra Nevada, California', artist: 'Albert Bierstadt', year: '1868', source: commons('Albert_Bierstadt_-_Among_the_Sierra_Nevada,_California_-_Google_Art_Project.jpg') },
  { file: 'magpie.webp', title: 'The Magpie', artist: 'Claude Monet', year: '1868–69', source: commons('Claude_Monet_-_The_Magpie_-_Google_Art_Project.jpg') },
  { file: 'ninth-wave.webp', title: 'The Ninth Wave', artist: 'Ivan Aivazovsky', year: '1850', source: commons('Hovhannes_Aivazovsky_-_The_Ninth_Wave_-_Google_Art_Project.jpg') },
];

export const wallpaperUrl = (w: Wallpaper) => `${import.meta.env.BASE_URL}wallpapers/${w.file}`;

export const wallpaperAt = (i: number): Wallpaper => wallpapers[i % wallpapers.length] ?? wallpapers[0];

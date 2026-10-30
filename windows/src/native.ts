import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { create } from 'zustand';

// Mirrors src-tauri/src/state.rs.
export interface Media {
  app: string;
  title: string;
  artist: string;
  album: string;
  playing: boolean;
  canSeek: boolean;
  position: number;
  duration: number;
  updatedAt: number;
  cover: number;
}
export interface Battery {
  level: number;
  charging: boolean;
  plugged: boolean;
  saver: boolean;
}
export interface Output {
  id: string;
  name: string;
  default: boolean;
}
export interface SystemState {
  media: Media | null;
  volume: number;
  muted: boolean;
  brightness: number | null;
  battery: Battery | null;
  locked: boolean;
  camera: boolean;
  mic: boolean;
  accent: string;
  outputs: Output[];
  downloading: boolean;
  fahrenheit: boolean;
  hour24: boolean;
}

export const useSystem = create<SystemState & { ready: boolean }>()(() => ({
  ready: false,
  media: null,
  volume: 0,
  muted: false,
  brightness: null,
  battery: null,
  locked: false,
  camera: false,
  mic: false,
  accent: '#0078d4',
  outputs: [],
  downloading: false,
  fahrenheit: false,
  hour24: false,
}));

/** Commands fail with a message string; nothing here can recover, so it's logged for the dev console. */
export const report = (e: unknown) => console.error('visor:', e);

export function startSystem() {
  void listen<SystemState>('state', (e) => useSystem.setState({ ...e.payload, ready: true }));
  invoke<SystemState>('get_state').then((s) => useSystem.setState({ ...s, ready: true }), report);
}

export type MediaAction = { kind: 'toggle' } | { kind: 'next' } | { kind: 'previous' } | { kind: 'seek'; seconds: number };
export const media = (action: MediaAction) => invoke('media', { action });
export const mediaCover = () => invoke<ArrayBuffer>('media_cover');
export const setVolume = (level: number) => invoke('set_volume', { level });
export const setOutput = (id: string) => invoke('set_output', { id });

export const thumbnail = (path: string) => invoke<ArrayBuffer>('thumbnail', { path });
export const openTarget = (target: string) => invoke('open', { target });
export const reveal = (path: string) => invoke('reveal', { path });
export const startDrag = (paths: string[]) => invoke('start_drag', { paths });
export const share = (paths: string[]) => invoke('share', { paths });

export type ImageFormat = 'png' | 'jpeg' | 'bmp' | 'tiff' | 'gif';
export const convertImage = (path: string, format: ImageFormat) => invoke<string>('convert_image', { path, format });
export const imagesToPdf = (paths: string[]) => invoke<string>('images_to_pdf', { paths });
export const pdfToImages = (path: string) => invoke<string[]>('pdf_to_images', { path });

export const fetchText = (url: string) => invoke<string>('fetch_text', { url });
export const showSettings = () => invoke('show_settings');

/** The settings Rust acts on; see src-tauri/src/prefs.rs. */
export interface NativeSettings {
  replaceHud: boolean;
  hideFromCapture: boolean;
  hideInFullscreen: boolean;
  launchAtLogin: boolean;
}
export const applySettings = (settings: NativeSettings) => invoke('apply_settings', { settings });

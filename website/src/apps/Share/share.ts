import { links } from '../../links';

export const SHARE_TEXT = `Visor turns the MacBook notch into a music player, calendar, file shelf and HUD. Free and open source: ${links.repo}`;
export const whatsappUrl = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;
export const xUrl = (text: string) => `https://x.com/intent/post?text=${encodeURIComponent(text)}`;

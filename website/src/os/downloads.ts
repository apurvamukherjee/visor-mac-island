import { links } from '../links';
import { useNotch } from '../notch/store';

// Visor's download ring, for every way this page offers the DMG or the Windows installer: links, desktop and Finder icons, the Terminal.
const ring = () => useNotch.getState().flash({ kind: 'download', app: 'Safari' }, 3000);

export function openUrl(href: string) {
  if (href === links.dmg || href === links.exe) ring();
  window.open(href, '_blank', 'noopener');
}

export function watchDownloads() {
  document.addEventListener('click', (e) => {
    // Chrome's page rings its own ring, labelled Chrome, before this listener on document hears the click.
    if (useNotch.getState().transient?.kind === 'download') return;
    if (e.target instanceof Element && e.target.closest(`a[href="${links.dmg}"], a[href="${links.exe}"]`)) ring();
  });
}

import { apps, type AppId } from '../../apps/apps';
import { links } from '../../links';
import { useWindows } from '../../store/windows';

export type MenuItem =
  | { label: string; shortcut?: string; run?: () => void; href?: string; disabled?: boolean }
  | 'separator';

export interface Menu {
  label: string;
  items: () => MenuItem[];
}

const win = () => useWindows.getState();
const open = (id: AppId) => () => win().open(id);
const onFocused = (fn: (id: AppId) => void) => () => {
  const id = win().focused;
  if (id) fn(id);
};

export const systemMenu: Menu = {
  label: 'Visor menu',
  items: () => [
    { label: 'About Visor', run: open('visor') },
    'separator',
    { label: 'System Settings…', run: open('settings') },
    'separator',
    { label: 'Restart…', run: () => location.reload() },
  ],
};

export const appMenus: Menu[] = [
  {
    label: 'File',
    items: () => [
      { label: 'New Terminal Window', run: open('terminal') },
      { label: 'Open README.md', href: links.readme },
      'separator',
      { label: 'Close Window', run: onFocused((id) => win().close(id)), disabled: !win().focused },
    ],
  },
  {
    label: 'Edit',
    items: () => ['Undo', 'Redo', 'Cut', 'Copy', 'Paste', 'Select All'].map((label) => ({ label, disabled: true })),
  },
  {
    label: 'View',
    items: () => [
      {
        label: document.fullscreenElement ? 'Exit Full Screen' : 'Enter Full Screen',
        run: () => void (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()),
      },
    ],
  },
  {
    label: 'Window',
    items: () => {
      const { wins, focused } = win();
      const open = Object.values(wins).map((w) => ({ label: `${w.id === focused ? '✓ ' : ''}${apps[w.id].name}`, run: () => win().open(w.id) }));
      return [
        { label: 'Minimize', run: onFocused((id) => win().minimize(id)), disabled: !focused },
        { label: 'Zoom', run: onFocused((id) => win().toggleZoom(id)), disabled: !focused },
        ...(open.length ? ['separator' as const, ...open] : []),
      ];
    },
  },
  {
    label: 'Help',
    items: () => [
      { label: 'Visor README', href: links.readme },
      { label: 'What’s New', href: links.changelog },
      { label: 'All Releases', href: links.releases },
      { label: 'Report an Issue…', href: links.newIssue },
      'separator',
      { label: 'Keyboard Shortcuts', run: open('notes') },
    ],
  },
];

export const visorAppMenu: Menu = {
  label: 'Visor',
  items: () => [
    { label: 'About Visor', run: open('visor') },
    { label: 'Download Visor', href: links.dmg },
    { label: 'View on GitHub', href: links.repo },
    'separator',
    { label: 'Quit All Apps', run: () => Object.values(win().wins).forEach((w) => win().close(w.id)) },
  ],
};

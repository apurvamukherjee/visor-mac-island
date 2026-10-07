import { QUARANTINE_CMD, links } from '../../links';
import { apps, type AppId } from '../apps';

export type Effect = { kind: 'open'; app: AppId } | { kind: 'url'; href: string } | { kind: 'clear' };

export interface Result {
  lines: string[];
  effect?: Effect;
}

const HELP: [string, string][] = [
  ['help', 'this list'],
  ['about', 'what Visor is'],
  ['version', 'the latest release'],
  ['download', 'download Visor.dmg'],
  ['install', 'how to install'],
  ['repo', 'open the GitHub repo'],
  ['changelog', 'what changed in each version'],
  ['issues', 'report a bug'],
  ['shortcuts', 'keyboard shortcuts'],
  ['open <app>', 'open an app, e.g. open notes'],
  ['neofetch', 'about this Mac'],
  ['cowsay <text>', 'moo'],
  ['clear', 'wipe the screen'],
];

function cowsay(text: string) {
  const t = text || 'moo';
  return [` ${'_'.repeat(t.length + 2)}`, `< ${t} >`, ` ${'-'.repeat(t.length + 2)}`, '        \\   ^__^', '         \\  (oo)\\_______', '            (__)\\       )\\/\\', '                ||----w |', '                ||     ||'];
}

function findApp(name: string): AppId | undefined {
  const q = name.toLowerCase().replace(/\.app$/, '');
  return (Object.keys(apps) as AppId[]).find((id) => id === q || apps[id].name.toLowerCase() === q);
}

export function run(input: string, version: string): Result {
  const [cmd = '', ...rest] = input.trim().split(/\s+/);
  const arg = rest.join(' ');
  switch (cmd.toLowerCase()) {
    case '':
      return { lines: [] };
    case 'help':
      return { lines: HELP.map(([c, d]) => `${c.padEnd(15)} ${d}`) };
    case 'about':
      return { lines: ['Visor turns the notch on your MacBook into something you can use:', 'music, calendar, a file shelf and the HUDs, right where the camera sits.', 'Free and open source (GPL-3.0), by Apurva Mukherjee.'] };
    case 'version':
      return { lines: [`Visor ${version}`] };
    case 'download':
      return { lines: ['Downloading Visor.dmg…'], effect: { kind: 'url', href: links.dmg } };
    case 'install':
      return { lines: ['1. Open Visor.dmg and drag Visor into Applications.', '2. Clear the quarantine flag once:', `   ${QUARANTINE_CMD}`, '3. Open Visor.'] };
    case 'xattr':
      return { lines: ['Run that in your own Terminal, not this one. This one is a website.'] };
    case 'brew':
      return { lines: ['Visor is not on Homebrew yet. Type download to get the DMG.'] };
    case 'repo':
      return { lines: [`Opening ${links.repo}`], effect: { kind: 'url', href: links.repo } };
    case 'changelog':
      return { lines: ['Opening the changelog…'], effect: { kind: 'url', href: links.changelog } };
    case 'issues':
      return { lines: ['Opening a new issue…'], effect: { kind: 'url', href: links.newIssue } };
    case 'shortcuts':
      return { lines: ['⌘ ⇧ I   open or close the notch', '⌘ ⇧ H   sneak peek at what is playing'] };
    case 'open': {
      const app = findApp(arg);
      return app ? { lines: [], effect: { kind: 'open', app } } : { lines: [`The application “${arg}” can’t be found.`] };
    }
    case 'neofetch':
      return { lines: ['      ●       visitor@visorbook', '    ●●●●●     OS: macOS (in a browser)', '   ●●● ●●●    Host: MacBook with a notch', '    ●●●●●     Shell: zsh, sort of', '      ●       Notch: Visor ' + version] };
    case 'cowsay':
      return { lines: cowsay(arg) };
    case 'sudo':
      return { lines: ['visitor is not in the sudoers file. This incident will be reported.'] };
    case 'whoami':
      return { lines: ['visitor'] };
    case 'echo':
      return { lines: [arg] };
    case 'clear':
      return { lines: [], effect: { kind: 'clear' } };
    default:
      return { lines: [`zsh: command not found: ${cmd}`, 'Type help to see what works.'] };
  }
}

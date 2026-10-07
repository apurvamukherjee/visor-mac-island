import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export interface Release {
  version: string;
  build: string;
  date: string;
  notes: string[];
}

export class ReleaseParseError extends Error {
  override name = 'ReleaseParseError';
}

const root = (file: string) => fileURLToPath(new URL(`../${file}`, import.meta.url));

// The site is built from the same commit as the app, so the repo files are the source of truth, not the GitHub API.
export function readRelease(): Release {
  const project = readFileSync(root('project.yml'), 'utf8');
  const changelog = readFileSync(root('CHANGELOG.md'), 'utf8');
  const version = /MARKETING_VERSION:\s*"([^"]+)"/.exec(project)?.[1];
  const build = /CURRENT_PROJECT_VERSION:\s*"([^"]+)"/.exec(project)?.[1];
  if (!version || !build) throw new ReleaseParseError('MARKETING_VERSION or CURRENT_PROJECT_VERSION missing in project.yml');

  const section = changelog.split(/^## /m).find((s) => s.startsWith(`${version} `));
  if (!section) throw new ReleaseParseError(`CHANGELOG.md has no section for ${version}`);
  const date = /·\s*(\d{4}-\d{2}-\d{2})/.exec(section)?.[1] ?? '';
  const notes = section
    .split('\n')
    .filter((l) => l.startsWith('- '))
    .map((l) => l.slice(2).trim());
  return { version, build, date, notes };
}

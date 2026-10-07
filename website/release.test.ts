import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { readRelease } from './release.ts';

test('reads the current version, build and notes from the repo', () => {
  const project = readFileSync(new URL('../project.yml', import.meta.url), 'utf8');
  const release = readRelease();
  expect(project).toContain(`MARKETING_VERSION: "${release.version}"`);
  expect(project).toContain(`CURRENT_PROJECT_VERSION: "${release.build}"`);
  expect(release.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(release.notes.length).toBeGreaterThan(0);
});

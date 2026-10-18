import { expect, test } from 'vitest';
import { links } from '../../links';
import { complete, run } from './commands';

test('opens apps by id or display name, case-insensitively', () => {
  expect(run('open notes', '1.0').effect).toEqual({ kind: 'open', app: 'notes' });
  expect(run('open System Settings', '1.0').effect).toEqual({ kind: 'open', app: 'settings' });
  expect(run('open Terminal.app', '1.0').effect).toEqual({ kind: 'open', app: 'terminal' });
  expect(run('open nothing', '1.0').lines[0]).toContain('can’t be found');
});

test('download and clear carry their effects', () => {
  expect(run('download', '1.0').effect).toEqual({ kind: 'url', href: links.dmg });
  expect(run('  clear  ', '1.0').effect).toEqual({ kind: 'clear' });
});

test('unknown commands and blank input', () => {
  expect(run('rm -rf /', '1.0').lines[0]).toBe('zsh: command not found: rm');
  expect(run('', '1.0')).toEqual({ lines: [] });
  expect(run('version', '3.4.0').lines).toEqual(['Visor 3.4.0']);
});

test('tab completes one match and leaves ambiguity alone', () => {
  expect(complete('neo')).toBe('neofetch ');
  expect(complete('open ter')).toBe('open terminal');
  expect(complete('c')).toBe('c');
  expect(complete('open zz')).toBe('open zz');
});

test('easter egg: the sandwich needs sudo', () => {
  expect(run('make me a sandwich', '1.0').lines).toEqual(['What? Make it yourself.']);
  expect(run('sudo make me a sandwich', '1.0').lines).toEqual(['Okay.']);
});

test('easter egg: sl runs a train', () => {
  expect(run('sl', '1.0').lines.at(-1)).toBe('You meant ls. Have a train anyway.');
});

test('easter eggs: exit quits, vim teases, coffee is a teapot', () => {
  expect(run('exit', '1.0').effect).toEqual({ kind: 'quit' });
  expect(run(':wq', '1.0').lines[0]).toContain('There was no vim');
  expect(run('brew coffee', '1.0').lines[0]).toContain('418');
});

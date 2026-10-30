import { expect, test } from 'vitest';
import { cleanQuery, lineAt, parseLrc } from './lyrics';

test('stamps sort, repeated stamps repeat the line, blanks drop, and the current line follows the clock', () => {
  const lines = parseLrc('[00:12.50] Second\n[ar:Someone]\n[00:30.00]\n[00:03.00][01:00.00] Chorus\n');
  expect(lines.map((l) => [l.time, l.text])).toEqual([
    [3, 'Chorus'],
    [12.5, 'Second'],
    [60, 'Chorus'],
  ]);
  expect(lineAt(lines, 1)).toBe('Chorus');
  expect(lineAt([], 1)).toBe('');
  expect(lineAt(lines, 12.5)).toBe('Second');
  expect(lineAt(lines, 59)).toBe('Second');
  expect(lineAt(lines, 61)).toBe('Chorus');
});

test('the song comes out of what YouTube and Spotify report', () => {
  expect(cleanQuery('The Weeknd - Blinding Lights (Official Video)', 'TheWeekndVEVO')).toEqual({ title: 'Blinding Lights', artist: 'The Weeknd' });
  expect(cleanQuery('Bohemian Rhapsody - Remastered 2011', 'Queen')).toEqual({ title: 'Bohemian Rhapsody', artist: 'Queen' });
  expect(cleanQuery('Kesariya [Lyrics] (feat. Arijit Singh)', 'Pritam - Topic')).toEqual({ title: 'Kesariya', artist: 'Pritam' });
  expect(cleanQuery('Song - From "A Film"', 'Someone')).toEqual({ title: 'Song - From "A Film"', artist: 'Someone' });
});

import { expect, test } from 'vitest';
import { connectedDevice } from './devices';

const out = (name: string) => ({ id: name, name, default: false });

test('a known device that just became an output is announced', () => {
  expect(connectedDevice([out('Speakers')], [out('Speakers'), out('Studio AirPods Pro')])).toEqual({
    device: 'airpods',
    name: 'Studio AirPods Pro',
  });
  expect(connectedDevice([], [out('JBL Bar 500')])?.device).toBe('jblBar');
  expect(connectedDevice([], [out('Headphones (boAt Rockerz 512 ANC)')])?.device).toBe('rockerz');
});

test('devices already connected, or unknown, are not', () => {
  expect(connectedDevice([out('OnePlus Buds 3')], [out('OnePlus Buds 3')])).toBeNull();
  expect(connectedDevice([], [out('Realtek Speakers')])).toBeNull();
});

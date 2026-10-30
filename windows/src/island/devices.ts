import type { Output } from '../native';

export type DeviceKind = 'airpods' | 'oneplusBuds' | 'jblBar' | 'rockerz';

// DeviceKind.swift: matched by the name Windows gives the output.
export function deviceKind(name: string): DeviceKind | null {
  const n = name.toLowerCase();
  if (n.includes('airpods')) return 'airpods';
  if (n.includes('oneplus buds')) return 'oneplusBuds';
  if (n.includes('jbl cinema') || n.includes('jbl bar')) return 'jblBar';
  if (n.includes('rockerz')) return 'rockerz';
  return null;
}

/** A known device that has just become an output, as DeviceMonitor notices on the Mac. */
export function connectedDevice(before: Output[], after: Output[]) {
  const known = new Set(before.map((o) => o.name));
  for (const o of after) {
    const device = deviceKind(o.name);
    if (device && !known.has(o.name)) return { device, name: o.name };
  }
  return null;
}

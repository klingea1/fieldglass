import { describe, expect, it, vi } from 'vitest';
import { NativeSource, type SensorsPlugin } from './native';
import type { Reading } from './types';

function fakePlugin() {
  let emit: (event: { readings: Reading[] }) => void = () => {};
  const plugin: SensorsPlugin = {
    listSensors: vi.fn(async () => ({ sensors: [] })),
    start: vi.fn(async () => {}),
    stop: vi.fn(async () => {}),
    addListener: vi.fn(async (_event, listener) => {
      emit = listener;
      return { remove: async () => {} };
    }),
  };
  return { plugin, emit: (readings: Reading[]) => emit({ readings }) };
}

const reading = (timestamp: number): Reading => ({
  type: 'magnetometer',
  timestamp,
  values: [1, 2, 3],
  accuracy: 'high',
});

describe('NativeSource', () => {
  it('passes start and stop through to the plugin', async () => {
    const { plugin } = fakePlugin();
    const source = new NativeSource(plugin);
    await source.start('magnetometer', 50);
    await source.stop('magnetometer');
    expect(plugin.start).toHaveBeenCalledWith({ type: 'magnetometer', rateHz: 50 });
    expect(plugin.stop).toHaveBeenCalledWith({ type: 'magnetometer' });
  });

  it('unpacks batched readings to every listener, in order', () => {
    const { plugin, emit } = fakePlugin();
    const source = new NativeSource(plugin);
    const a = vi.fn();
    const b = vi.fn();
    source.onReading(a);
    source.onReading(b);
    emit([reading(1), reading(2)]);
    expect(a.mock.calls.map(([r]) => r.timestamp)).toEqual([1, 2]);
    expect(b).toHaveBeenCalledTimes(2);
    expect(plugin.addListener).toHaveBeenCalledTimes(1);
  });

  it('stops delivering after unsubscribe', () => {
    const { plugin, emit } = fakePlugin();
    const source = new NativeSource(plugin);
    const listener = vi.fn();
    source.onReading(listener)();
    emit([reading(1)]);
    expect(listener).not.toHaveBeenCalled();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SensorHub } from './hub';
import { SimulatedSource } from './simulated';

describe('SensorHub with SimulatedSource', () => {
  let clock = 0;
  let source: SimulatedSource;
  let hub: SensorHub;

  beforeEach(() => {
    vi.useFakeTimers();
    clock = 0;
    source = new SimulatedSource(() => clock);
    hub = new SensorHub(source);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const advance = async (ms: number) => {
    clock += ms;
    await vi.advanceTimersByTimeAsync(ms);
  };

  it('delivers readings at the requested rate', async () => {
    const listener = vi.fn();
    hub.subscribe('magnetometer', 50, listener);
    await advance(1000);
    expect(listener).toHaveBeenCalledTimes(50);
    expect(listener.mock.lastCall?.[0]).toMatchObject({ type: 'magnetometer', accuracy: 'high' });
  });

  it('starts once for several subscribers and stops after the last leaves', async () => {
    const start = vi.spyOn(source, 'start');
    const stop = vi.spyOn(source, 'stop');
    const a = hub.subscribe('magnetometer', 10, () => {});
    const b = hub.subscribe('magnetometer', 10, () => {});
    await advance(0);
    expect(start).toHaveBeenCalledTimes(1);

    a();
    await advance(0);
    expect(stop).not.toHaveBeenCalled();

    b();
    await advance(0);
    expect(stop).toHaveBeenCalledWith('magnetometer');
  });

  it('runs at the fastest requested rate', async () => {
    const start = vi.spyOn(source, 'start');
    hub.subscribe('magnetometer', 10, () => {});
    hub.subscribe('magnetometer', 40, () => {});
    await advance(0);
    expect(start).toHaveBeenLastCalledWith('magnetometer', 40);
  });

  it('only delivers readings of the subscribed type', async () => {
    const listener = vi.fn();
    hub.subscribe('magnetometer', 10, listener);
    hub.subscribe('accelerometer', 10, () => {});
    await advance(1000);
    expect(listener.mock.calls.every(([r]) => r.type === 'magnetometer')).toBe(true);
  });
});

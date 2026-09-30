import { describe, expect, it } from 'vitest';
import { toneFor } from './tone';

describe('toneFor', () => {
  it('rises in pitch and volume with the level', () => {
    const low = toneFor(0.2);
    const high = toneFor(0.8);
    expect(high.frequency).toBeGreaterThan(low.frequency);
    expect(high.gain).toBeGreaterThan(low.gain);
  });

  it('hums quietly at rest and clamps out-of-range levels', () => {
    expect(toneFor(0)).toEqual({ frequency: 400, gain: 0.015 });
    expect(toneFor(5)).toEqual(toneFor(1));
  });
});

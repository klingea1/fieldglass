import { describe, expect, it } from 'vitest';
import { MetalDetector } from './detector';

const BIAS = [-118, 64, -305];

/** An uncalibrated reading of the given calibrated field vector. */
function reading(field: number[], bias = BIAS): number[] {
  return [...field.map((v, i) => v + (bias[i] ?? 0)), ...bias];
}

describe('MetalDetector', () => {
  it('zeroes itself on the first reading', () => {
    const detector = new MetalDetector({ fullScaleUt: 30 });
    const state = detector.update(reading([20, 0, -40]), 0);
    expect(state.field).toBeCloseTo(Math.hypot(20, 40));
    expect(state.deviation).toBe(0);
    expect(state.level).toBe(0);
  });

  it('ignores rotation: same field strength in a different direction reads zero', () => {
    const detector = new MetalDetector({ fullScaleUt: 30, smoothingS: 0.001 });
    detector.update(reading([20, 0, -40]), 0);
    const turned = detector.update(reading([0, 40, 20]), 1000);
    expect(turned.deviation).toBeCloseTo(0);
  });

  it('reports a stronger field as positive deviation and scales the level', () => {
    const detector = new MetalDetector({ fullScaleUt: 30, smoothingS: 0.001 });
    detector.update(reading([0, 0, 45]), 0);
    const state = detector.update(reading([0, 0, 60]), 1000);
    expect(state.deviation).toBeCloseTo(15);
    expect(state.level).toBeCloseTo(0.5);
  });

  it('clamps the level at full scale and reports weaker fields as negative', () => {
    const detector = new MetalDetector({ fullScaleUt: 10, smoothingS: 0.001 });
    detector.update(reading([0, 0, 45]), 0);
    const state = detector.update(reading([0, 0, 20]), 1000);
    expect(state.deviation).toBeCloseTo(-25);
    expect(state.level).toBe(1);
  });

  it('smooths sudden changes', () => {
    const detector = new MetalDetector({ fullScaleUt: 30, smoothingS: 0.1 });
    detector.update(reading([0, 0, 45]), 0);
    const state = detector.update(reading([0, 0, 65]), 20);
    expect(state.deviation).toBeGreaterThan(0);
    expect(state.deviation).toBeLessThan(10);
  });

  it('re-zeroes when Android changes its bias estimate', () => {
    const detector = new MetalDetector({ fullScaleUt: 30, smoothingS: 0.001 });
    detector.update(reading([0, 0, 45]), 0);
    const newBias = [-100, 64, -305];
    const state = detector.update(reading([0, 0, 50], newBias), 1000);
    expect(state.recalibrated).toBe(true);
    expect(state.deviation).toBe(0);
    expect(detector.update(reading([0, 0, 50], newBias), 1020).recalibrated).toBe(false);
  });

  it('zero() makes the current field the new zero point', () => {
    const detector = new MetalDetector({ fullScaleUt: 30, smoothingS: 0.001 });
    detector.update(reading([0, 0, 45]), 0);
    detector.update(reading([0, 0, 55]), 1000);
    detector.zero();
    expect(detector.update(reading([0, 0, 55]), 2000).deviation).toBeCloseTo(0);
  });

  it('flags readings near the sensor limit as saturated', () => {
    const detector = new MetalDetector({ fullScaleUt: 30, maxRangeUt: 3198 });
    expect(detector.update(reading([0, 0, 45]), 0).saturated).toBe(false);
    expect(detector.update(reading([3200, 0, 0], [0, 0, 0]), 20).saturated).toBe(true);
  });
});

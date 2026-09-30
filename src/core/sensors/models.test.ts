import { describe, expect, it } from 'vitest';
import { magnitude } from '../processing/vector';
import { EARTH_FIELD_UT, MAGNET_PASS_PERIOD_S, magnetometerModel } from './models';

describe('magnetometerModel', () => {
  it('reads close to Earth field between magnet passes', () => {
    const model = magnetometerModel();
    expect(magnitude(model(0))).toBeCloseTo(magnitude(EARTH_FIELD_UT), 0);
  });

  it('spikes during a magnet pass', () => {
    const model = magnetometerModel();
    const quiet = magnitude(model(1));
    const pass = magnitude(model(MAGNET_PASS_PERIOD_S / 2));
    expect(pass - quiet).toBeGreaterThan(20);
  });

  it('is repeatable for the same seed', () => {
    expect(magnetometerModel(7)(3)).toEqual(magnetometerModel(7)(3));
  });
});

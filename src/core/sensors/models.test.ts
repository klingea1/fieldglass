import { describe, expect, it } from 'vitest';
import { magnitude } from '../processing/vector';
import { splitUncalibrated } from '../processing/magnetic';
import {
  EARTH_FIELD_UT,
  HARD_IRON_BIAS_UT,
  MAGNET_PASS_PERIOD_S,
  magnetometerModel,
  magnetometerUncalibratedModel,
} from './models';

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

describe('magnetometerUncalibratedModel', () => {
  it('adds the bias to the calibrated field and reports it separately', () => {
    const calibrated = magnetometerModel(3)(2);
    const uncalibrated = magnetometerUncalibratedModel(3)(2);
    expect(uncalibrated.slice(3)).toEqual([...HARD_IRON_BIAS_UT]);
    expect(splitUncalibrated(uncalibrated).corrected).toBeCloseTo(Math.hypot(...calibrated));
  });
});

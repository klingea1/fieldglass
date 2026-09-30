import { createRandom, gaussian } from './random';
import type { SensorInfo, SensorType } from './types';

/** Produces one sample of axis values at time t (seconds). */
export type SensorModel = (t: number) => number[];

/** A typical mid-latitude geomagnetic field in device coordinates, about 44 µT total. */
export const EARTH_FIELD_UT: readonly [number, number, number] = [22, -4, -38];

/** Seconds between simulated "magnet passes" on the magnetometer. */
export const MAGNET_PASS_PERIOD_S = 10;

/**
 * Magnetometer: Earth's field, slow drift, sensor noise, and a periodic bump as if
 * a piece of steel were swept past the phone. Gives the metal detector something to find.
 */
export function magnetometerModel(seed = 1): SensorModel {
  const random = createRandom(seed);
  return (t) => {
    const drift = 0.8 * Math.sin((2 * Math.PI * t) / 120);
    const phase = (t % MAGNET_PASS_PERIOD_S) - MAGNET_PASS_PERIOD_S / 2;
    const pass = 55 * Math.exp(-(phase * phase) / (2 * 0.35 * 0.35));
    const [x, y, z] = EARTH_FIELD_UT;
    return [
      x + drift + 0.6 * pass + 0.25 * gaussian(random),
      y + 0.2 * pass + 0.25 * gaussian(random),
      z - drift - 0.4 * pass + 0.25 * gaussian(random),
    ];
  };
}

/** Accelerometer: phone lying roughly flat with a small tilt wobble. */
export function accelerometerModel(seed = 2): SensorModel {
  const random = createRandom(seed);
  const g = 9.80665;
  return (t) => {
    const tilt = 0.03 * Math.sin((2 * Math.PI * t) / 7);
    return [
      g * Math.sin(tilt) + 0.02 * gaussian(random),
      0.02 * gaussian(random),
      g * Math.cos(tilt) + 0.02 * gaussian(random),
    ];
  };
}

export function lightModel(seed = 3): SensorModel {
  const random = createRandom(seed);
  return (t) => [Math.max(0, 320 + 40 * Math.sin((2 * Math.PI * t) / 30) + 3 * gaussian(random))];
}

export function pressureModel(seed = 4): SensorModel {
  const random = createRandom(seed);
  return () => [1013.25 + 0.02 * gaussian(random)];
}

interface SimulatedSensor {
  info: SensorInfo;
  model: () => SensorModel;
}

const simulatedInfo = (
  type: SensorType,
  name: string,
  maxRange: number,
  resolution: number,
): SensorInfo => ({
  type,
  name,
  vendor: 'fieldglass simulator',
  maxRange,
  resolution,
  maxRateHz: 100,
});

export const SIMULATED_SENSORS: Partial<Record<SensorType, SimulatedSensor>> = {
  magnetometer: {
    info: simulatedInfo('magnetometer', 'Simulated magnetometer', 4900, 0.15),
    model: magnetometerModel,
  },
  accelerometer: {
    info: simulatedInfo('accelerometer', 'Simulated accelerometer', 78.4, 0.0024),
    model: accelerometerModel,
  },
  light: { info: simulatedInfo('light', 'Simulated light sensor', 40000, 1), model: lightModel },
  pressure: {
    info: simulatedInfo('pressure', 'Simulated barometer', 1100, 0.0017),
    model: pressureModel,
  },
};

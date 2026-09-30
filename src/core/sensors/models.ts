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

/**
 * A strong fixed offset, as if from a magnet built into the phone (like Qi2 charging
 * magnets). The calibrated magnetometer hides it; the uncalibrated one reports it.
 */
export const HARD_IRON_BIAS_UT: readonly [number, number, number] = [-118, 64, -305];

/** Uncalibrated magnetometer: [x, y, z] including the bias, then the bias estimate itself. */
export function magnetometerUncalibratedModel(seed = 1): SensorModel {
  const calibrated = magnetometerModel(seed);
  const [bx, by, bz] = HARD_IRON_BIAS_UT;
  return (t) => {
    const [x = 0, y = 0, z = 0] = calibrated(t);
    return [x + bx, y + by, z + bz, bx, by, bz];
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

export function gravityModel(): SensorModel {
  const g = 9.80665;
  return (t) => {
    const tilt = 0.03 * Math.sin((2 * Math.PI * t) / 7);
    return [g * Math.sin(tilt), 0, g * Math.cos(tilt)];
  };
}

export function gyroscopeModel(seed = 5): SensorModel {
  const random = createRandom(seed);
  return (t) => {
    const wobble = ((2 * Math.PI) / 7) * 0.03 * Math.cos((2 * Math.PI * t) / 7);
    return [0.002 * gaussian(random), wobble + 0.002 * gaussian(random), 0.002 * gaussian(random)];
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
  androidType: string,
  name: string,
  maxRange: number,
  resolution: number,
): SensorInfo => ({
  type,
  androidType: `android.sensor.${androidType}`,
  name,
  vendor: 'fieldglass simulator',
  version: 1,
  maxRange,
  resolution,
  powerMa: 0,
  maxRateHz: 100,
  wakeUp: false,
});

export const SIMULATED_SENSORS: Partial<Record<SensorType, SimulatedSensor>> = {
  accelerometer: {
    info: simulatedInfo('accelerometer', 'accelerometer', 'Simulated accelerometer', 78.4, 0.0024),
    model: accelerometerModel,
  },
  gravity: {
    info: simulatedInfo('gravity', 'gravity', 'Simulated gravity', 78.4, 0.0024),
    model: gravityModel,
  },
  gyroscope: {
    info: simulatedInfo('gyroscope', 'gyroscope', 'Simulated gyroscope', 34.9, 0.001),
    model: gyroscopeModel,
  },
  magnetometer: {
    info: simulatedInfo('magnetometer', 'magnetic_field', 'Simulated magnetometer', 4900, 0.15),
    model: magnetometerModel,
  },
  'magnetometer-uncalibrated': {
    info: simulatedInfo(
      'magnetometer-uncalibrated',
      'magnetic_field_uncalibrated',
      'Simulated magnetometer (uncalibrated)',
      4900,
      0.15,
    ),
    model: magnetometerUncalibratedModel,
  },
  light: {
    info: simulatedInfo('light', 'light', 'Simulated light sensor', 40000, 1),
    model: lightModel,
  },
  pressure: {
    info: simulatedInfo('pressure', 'pressure', 'Simulated barometer', 1100, 0.0017),
    model: pressureModel,
  },
};

/** Sensors the simulator lists but can't stream, standing in for the extras a real phone has. */
export const SIMULATED_EXTRA_SENSORS: SensorInfo[] = [
  {
    type: null,
    androidType: 'android.sensor.step_counter',
    name: 'Simulated step counter',
    vendor: 'fieldglass simulator',
    version: 1,
    maxRange: 2 ** 31,
    resolution: 1,
    powerMa: 0,
    maxRateHz: 0,
    wakeUp: false,
  },
];

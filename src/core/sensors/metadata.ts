import type { SensorType } from './types';

export interface SensorMeta {
  label: string;
  unit: string;
  /** Names for each value in Reading.values, in order. */
  axes: string[];
  /** Decimal places worth showing, given typical phone sensor resolution. */
  decimals: number;
}

export const SENSOR_META: Record<SensorType, SensorMeta> = {
  accelerometer: { label: 'Accelerometer', unit: 'm/s²', axes: ['x', 'y', 'z'], decimals: 3 },
  gravity: { label: 'Gravity', unit: 'm/s²', axes: ['x', 'y', 'z'], decimals: 3 },
  gyroscope: { label: 'Gyroscope', unit: 'rad/s', axes: ['x', 'y', 'z'], decimals: 4 },
  magnetometer: { label: 'Magnetometer', unit: 'µT', axes: ['x', 'y', 'z'], decimals: 2 },
  'magnetometer-uncalibrated': {
    label: 'Magnetometer (uncalibrated)',
    unit: 'µT',
    axes: ['x', 'y', 'z', 'bias x', 'bias y', 'bias z'],
    decimals: 2,
  },
  light: { label: 'Light', unit: 'lx', axes: ['illuminance'], decimals: 0 },
  pressure: { label: 'Barometer', unit: 'hPa', axes: ['pressure'], decimals: 2 },
};

/** "android.sensor.magnetic_field" -> "magnetic_field" */
export function shortAndroidType(androidType: string): string {
  return androidType.replace(/^android\.sensor\./, '');
}

/** Sensor kinds fieldglass knows about. Names follow Android's Sensor.TYPE_* constants. */
export type SensorType =
  | 'accelerometer'
  | 'gravity'
  | 'gyroscope'
  | 'magnetometer'
  | 'magnetometer-uncalibrated'
  | 'light'
  | 'pressure';

/** Android's SensorManager.SENSOR_STATUS_* values, as names. */
export type SensorAccuracy = 'unreliable' | 'low' | 'medium' | 'high';

export interface Reading {
  type: SensorType;
  /** Milliseconds, monotonic within a session. */
  timestamp: number;
  /** Axis values in the sensor's native unit (e.g. [x, y, z] in µT for the magnetometer). */
  values: number[];
  accuracy: SensorAccuracy;
}

export interface SensorInfo {
  type: SensorType;
  name: string;
  vendor: string;
  /** Maximum value the sensor can report, in its native unit. */
  maxRange: number;
  /** Smallest change the sensor can report, in its native unit. */
  resolution: number;
  /** Fastest supported sample rate in Hz, or 0 if unknown. */
  maxRateHz: number;
}

export type ReadingListener = (reading: Reading) => void;

/**
 * Where readings come from. The simulator implements this today; the native
 * Android plugin implements it in Phase 1.
 */
export interface SensorSource {
  /** True when readings are synthetic, so the UI can say so. */
  readonly simulated: boolean;
  listSensors(): Promise<SensorInfo[]>;
  start(type: SensorType, rateHz: number): Promise<void>;
  stop(type: SensorType): Promise<void>;
  onReading(listener: ReadingListener): () => void;
}

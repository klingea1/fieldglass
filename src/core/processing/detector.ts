import { magnitude } from './vector';

export interface DetectorOptions {
  /** Deviation in µT that fills the meter. Smaller is more sensitive. */
  fullScaleUt: number;
  /** Smoothing time constant in seconds. Larger is calmer but slower to respond. */
  smoothingS?: number;
  /** The sensor's per-axis limit in µT; readings near it are flagged as saturated. */
  maxRangeUt?: number;
  /** How far any bias axis may move (µT) before it counts as a new calibration. */
  biasToleranceUt?: number;
}

export interface DetectorState {
  /** Field strength with the phone's own offset removed, smoothed, in µT. */
  field: number;
  /** field minus the zero point, in µT. Metal can push this either way. */
  deviation: number;
  /** |deviation| as a fraction of full scale, clamped to [0, 1]. */
  level: number;
  /** An axis is at or near the sensor's limit, so readings can't be trusted. */
  saturated: boolean;
  /** Android changed its bias estimate on this reading and the detector re-zeroed. */
  recalibrated: boolean;
}

/**
 * Metal detection from the uncalibrated magnetometer ([x, y, z, bias x, bias y, bias z]).
 *
 * Subtracting the phone's own bias (Qi2 magnets and the like) leaves Earth's field,
 * whose strength stays the same however the phone is turned. Nearby ferrous metal
 * and magnets change that strength, and the change from a zero point is the signal.
 */
export class MetalDetector {
  private readonly smoothingS: number;
  private readonly biasToleranceUt: number;
  private fullScaleUt: number;
  private maxRangeUt: number;

  private smoothed: number | null = null;
  private baseline: number | null = null;
  private lastTimestamp: number | null = null;
  private lastBias: readonly number[] | null = null;

  constructor(options: DetectorOptions) {
    this.fullScaleUt = options.fullScaleUt;
    this.smoothingS = options.smoothingS ?? 0.08;
    this.maxRangeUt = options.maxRangeUt ?? Infinity;
    this.biasToleranceUt = options.biasToleranceUt ?? 0.5;
  }

  configure(options: Partial<Pick<DetectorOptions, 'fullScaleUt' | 'maxRangeUt'>>): void {
    this.fullScaleUt = options.fullScaleUt ?? this.fullScaleUt;
    this.maxRangeUt = options.maxRangeUt ?? this.maxRangeUt;
  }

  /** Makes the current field the zero point. Do this away from metal. */
  zero(): void {
    this.baseline = this.smoothed;
  }

  /** Feeds one reading. timestamp is in milliseconds. */
  update(values: readonly number[], timestamp: number): DetectorState {
    const [x = 0, y = 0, z = 0, bx = 0, by = 0, bz = 0] = values;
    const bias = [bx, by, bz];
    const field = magnitude([x - bx, y - by, z - bz]);

    const recalibrated =
      this.lastBias !== null &&
      bias.some((b, i) => Math.abs(b - (this.lastBias?.[i] ?? b)) > this.biasToleranceUt);
    this.lastBias = bias;

    if (this.smoothed === null || recalibrated) {
      this.smoothed = field;
    } else {
      const dt = Math.max(0, (timestamp - (this.lastTimestamp ?? timestamp)) / 1000);
      const alpha = 1 - Math.exp(-dt / this.smoothingS);
      this.smoothed += alpha * (field - this.smoothed);
    }
    this.lastTimestamp = timestamp;

    if (this.baseline === null || recalibrated) this.zero();

    const deviation = this.smoothed - (this.baseline ?? this.smoothed);
    return {
      field: this.smoothed,
      deviation,
      level: Math.min(1, Math.abs(deviation) / this.fullScaleUt),
      saturated: [x, y, z].some((v) => Math.abs(v) >= 0.98 * this.maxRangeUt),
      recalibrated,
    };
  }
}

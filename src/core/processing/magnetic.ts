import { magnitude } from './vector';

export interface UncalibratedField {
  /** Total field as measured, including the hard-iron offset. */
  raw: number;
  /** Size of the offset Android estimated (magnets and magnetised parts in the phone). */
  bias: number;
  /** Total field once the offset is removed; should match the calibrated magnetometer. */
  corrected: number;
}

/** Splits an uncalibrated magnetometer reading ([x, y, z, bias x, bias y, bias z]). */
export function splitUncalibrated(values: readonly number[]): UncalibratedField {
  const [x = 0, y = 0, z = 0, bx = 0, by = 0, bz = 0] = values;
  return {
    raw: magnitude([x, y, z]),
    bias: magnitude([bx, by, bz]),
    corrected: magnitude([x - bx, y - by, z - bz]),
  };
}

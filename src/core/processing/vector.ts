/** Euclidean length of a vector, e.g. total field strength from [x, y, z]. */
export function magnitude(values: readonly number[]): number {
  return Math.hypot(...values);
}

/** Maps value from [min, max] to [0, 1], clamped. */
export function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0;
  return Math.min(1, Math.max(0, (value - min) / (max - min)));
}

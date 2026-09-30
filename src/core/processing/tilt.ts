import { toDegrees, wrap180 } from './angles';
import { magnitude } from './vector';

export type LevelMode = 'surface' | 'edge';

export interface SurfaceTilt {
  mode: 'surface';
  /** Tilt left/right in degrees; positive when the right edge is higher. */
  x: number;
  /** Tilt toward/away in degrees; positive when the top edge is higher. */
  y: number;
  /** Total tilt from level in degrees. */
  total: number;
}

export interface EdgeTilt {
  mode: 'edge';
  /** Rotation of the screen from upright portrait, in degrees, counter-clockwise positive. */
  angle: number;
  /** Degrees away from the nearest level or plumb position (0°, 90°, 180°, 270°). */
  deviation: number;
}

export type Tilt = SurfaceTilt | EdgeTilt;

/** Below this angle between the screen and horizontal the phone counts as lying flat. */
const SURFACE_THRESHOLD_DEG = 45;

/**
 * Tilt from a gravity reading in Android device axes (x right, y up the screen,
 * z out of the screen). Android reports the upward reaction to gravity, so a
 * phone lying face up reads about [0, 0, +9.81].
 */
export function tiltFromGravity(gravity: readonly number[]): Tilt {
  const [gx = 0, gy = 0, gz = 0] = gravity;
  const g = magnitude([gx, gy, gz]) || 1;
  const screenTilt = toDegrees(Math.acos(Math.min(1, Math.abs(gz) / g)));

  if (screenTilt < SURFACE_THRESHOLD_DEG) {
    const x = toDegrees(Math.asin(gx / g));
    const y = toDegrees(Math.asin(gy / g));
    return { mode: 'surface', x, y, total: screenTilt };
  }

  const angle = toDegrees(Math.atan2(gx, gy));
  return { mode: 'edge', angle, deviation: wrap180(angle - 90 * Math.round(angle / 90)) };
}

export interface LevelZero {
  surface: { x: number; y: number };
  edge: number;
}

export const NO_ZERO: LevelZero = { surface: { x: 0, y: 0 }, edge: 0 };

/** Applies a user-set zero, so tilt is measured relative to a reference surface. */
export function applyZero(tilt: Tilt, zero: LevelZero): Tilt {
  if (tilt.mode === 'surface') {
    const x = tilt.x - zero.surface.x;
    const y = tilt.y - zero.surface.y;
    return { mode: 'surface', x, y, total: Math.hypot(x, y) };
  }
  const deviation = wrap180(tilt.deviation - zero.edge);
  return { mode: 'edge', angle: tilt.angle - zero.edge, deviation };
}

/** The zero that makes the current tilt read level in its current mode. */
export function zeroFrom(tilt: Tilt, current: LevelZero): LevelZero {
  return tilt.mode === 'surface'
    ? { ...current, surface: { x: tilt.x, y: tilt.y } }
    : { ...current, edge: tilt.deviation };
}

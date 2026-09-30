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

/**
 * Which edge of the phone is down, as quarter turns counter-clockwise from upright
 * portrait: 0 bottom edge, 1 left edge, 2 top edge, 3 right edge. Odd values are
 * the long edges (landscape).
 */
export type Quadrant = 0 | 1 | 2 | 3;

export interface EdgeTilt {
  mode: 'edge';
  /** Rotation of the screen from upright portrait, in degrees, counter-clockwise positive. */
  angle: number;
  quadrant: Quadrant;
  /**
   * Degrees away from the nearest level or plumb position (0°, 90°, 180°, 270°).
   * Positive when the phone is turned counter-clockwise past it, so the right-hand
   * end (as you look at the upright screen) is higher.
   */
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
  const turns = Math.round(angle / 90);
  const quadrant = (((turns % 4) + 4) % 4) as Quadrant;
  return { mode: 'edge', angle, quadrant, deviation: wrap180(angle - 90 * turns) };
}

export interface LevelZero {
  surface: { x: number; y: number };
  /** One zero per edge (indexed by Quadrant), since each edge of a phone is off by its own amount. */
  edge: [number, number, number, number];
}

export const NO_ZERO: LevelZero = { surface: { x: 0, y: 0 }, edge: [0, 0, 0, 0] };

/** Accepts a stored zero, including the older single-edge format, and returns a valid one. */
export function normalizeZero(value: unknown): LevelZero {
  const stored = value as Partial<{ surface: { x: number; y: number }; edge: unknown }> | null;
  const surface =
    typeof stored?.surface?.x === 'number' && typeof stored.surface.y === 'number'
      ? { x: stored.surface.x, y: stored.surface.y }
      : NO_ZERO.surface;
  const edge =
    Array.isArray(stored?.edge) && stored.edge.length === 4 && stored.edge.every(Number.isFinite)
      ? (stored.edge as LevelZero['edge'])
      : NO_ZERO.edge;
  return { surface, edge: [...edge] };
}

export function hasZero(zero: LevelZero): boolean {
  return zero.surface.x !== 0 || zero.surface.y !== 0 || zero.edge.some((e) => e !== 0);
}

/** Applies a user-set zero, so tilt is measured relative to a reference surface. */
export function applyZero(tilt: Tilt, zero: LevelZero): Tilt {
  if (tilt.mode === 'surface') {
    const x = tilt.x - zero.surface.x;
    const y = tilt.y - zero.surface.y;
    return { mode: 'surface', x, y, total: Math.hypot(x, y) };
  }
  const offset = zero.edge[tilt.quadrant];
  return {
    mode: 'edge',
    angle: tilt.angle - offset,
    quadrant: tilt.quadrant,
    deviation: wrap180(tilt.deviation - offset),
  };
}

/** The zero that makes the current tilt read level in its current mode. */
export function zeroFrom(tilt: Tilt, current: LevelZero): LevelZero {
  return tilt.mode === 'surface'
    ? { ...current, surface: { x: tilt.x, y: tilt.y } }
    : {
        ...current,
        edge: current.edge.map((e, i) =>
          i === tilt.quadrant ? tilt.deviation : e,
        ) as LevelZero['edge'],
      };
}

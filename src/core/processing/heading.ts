import { toDegrees, wrap360 } from './angles';

/**
 * Compass heading of the top of the phone, in degrees clockwise from magnetic north,
 * from gravity and a calibrated magnetometer reading in device axes. Tilt-compensated
 * (the same maths as Android's SensorManager.getRotationMatrix and getOrientation).
 * Returns null when the two vectors are nearly parallel and heading is undefined.
 */
export function magneticHeading(
  gravity: readonly number[],
  magnetic: readonly number[],
): number | null {
  const [ax = 0, ay = 0, az = 0] = gravity;
  const [ex = 0, ey = 0, ez = 0] = magnetic;

  // East = magnetic × gravity.
  let hx = ey * az - ez * ay;
  let hy = ez * ax - ex * az;
  let hz = ex * ay - ey * ax;
  const normH = Math.hypot(hx, hy, hz);
  const normA = Math.hypot(ax, ay, az);
  if (normH < 0.1 || normA < 0.1) return null;
  hx /= normH;
  hy /= normH;
  hz /= normH;

  // North = gravity × east.
  const nx = ax / normA;
  const nz = az / normA;
  const my = nz * hx - nx * hz;

  return wrap360(toDegrees(Math.atan2(hy, my)));
}

const POINTS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;

/** 0 -> "N", 100 -> "E", 225 -> "SW". */
export function cardinal(degrees: number): string {
  return POINTS[Math.round(wrap360(degrees) / 45) % 8] ?? 'N';
}

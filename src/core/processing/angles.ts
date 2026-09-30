export const toDegrees = (radians: number) => (radians * 180) / Math.PI;
export const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/** Wraps an angle into [0, 360). */
export function wrap360(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

/** Wraps an angle into [-180, 180). */
export function wrap180(degrees: number): number {
  return wrap360(degrees + 180) - 180;
}

/**
 * Exponential smoothing for angles, done on the unit circle so that 359° and 1°
 * average to 0°, not 180°.
 */
export class AngleSmoother {
  private x: number | null = null;
  private y = 0;

  constructor(private readonly alpha: number) {}

  update(degrees: number): number {
    const cx = Math.cos(toRadians(degrees));
    const cy = Math.sin(toRadians(degrees));
    if (this.x === null) {
      this.x = cx;
      this.y = cy;
    } else {
      this.x += this.alpha * (cx - this.x);
      this.y += this.alpha * (cy - this.y);
    }
    return wrap360(toDegrees(Math.atan2(this.y, this.x)));
  }
}

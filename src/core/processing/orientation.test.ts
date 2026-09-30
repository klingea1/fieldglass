import { describe, expect, it } from 'vitest';
import { AngleSmoother, wrap180, wrap360 } from './angles';
import { cardinal, magneticHeading } from './heading';
import { NO_ZERO, applyZero, normalizeZero, tiltFromGravity, zeroFrom } from './tilt';

const G = 9.80665;
const rad = (deg: number) => (deg * Math.PI) / 180;

describe('angles', () => {
  it('wraps', () => {
    expect(wrap360(-10)).toBe(350);
    expect(wrap360(370)).toBe(10);
    expect(wrap180(190)).toBe(-170);
  });

  it('smooths across north without swinging through south', () => {
    const smoother = new AngleSmoother(0.5);
    smoother.update(350);
    expect(wrap180(smoother.update(10))).toBeCloseTo(0, 5);
  });
});

describe('tiltFromGravity', () => {
  it('reads level lying face up', () => {
    const tilt = tiltFromGravity([0, 0, G]);
    expect(tilt).toEqual({ mode: 'surface', x: 0, y: 0, total: 0 });
  });

  it('reads positive x when the right edge is raised', () => {
    const tilt = tiltFromGravity([G * Math.sin(rad(3)), 0, G * Math.cos(rad(3))]);
    expect(tilt.mode).toBe('surface');
    if (tilt.mode === 'surface') {
      expect(tilt.x).toBeCloseTo(3);
      expect(tilt.total).toBeCloseTo(3);
    }
  });

  it('switches to edge mode standing upright and measures rotation from plumb', () => {
    const tilt = tiltFromGravity([G * Math.sin(rad(2)), G * Math.cos(rad(2)), 0]);
    expect(tilt).toMatchObject({ mode: 'edge' });
    if (tilt.mode === 'edge') {
      expect(tilt.angle).toBeCloseTo(2);
      expect(tilt.deviation).toBeCloseTo(2);
    }
  });

  it('measures deviation from the nearest right angle in landscape', () => {
    const tilt = tiltFromGravity([G * Math.sin(rad(88)), G * Math.cos(rad(88)), 0]);
    if (tilt.mode !== 'edge') throw new Error('expected edge mode');
    expect(tilt.angle).toBeCloseTo(88);
    expect(tilt.quadrant).toBe(1);
    expect(tilt.deviation).toBeCloseTo(-2);
  });

  it('identifies which edge is down', () => {
    const edge = (deg: number) => {
      const tilt = tiltFromGravity([G * Math.sin(rad(deg)), G * Math.cos(rad(deg)), 0]);
      return tilt.mode === 'edge' ? tilt.quadrant : null;
    };
    expect([edge(0), edge(90), edge(180), edge(-90), edge(-46)]).toEqual([0, 1, 2, 3, 3]);
  });

  it('keeps a separate zero for each edge', () => {
    const at = (deg: number) =>
      tiltFromGravity([G * Math.sin(rad(deg)), G * Math.cos(rad(deg)), 0]);
    const zero = zeroFrom(at(91), NO_ZERO);
    const landscape = applyZero(at(91), zero);
    const portrait = applyZero(at(1), zero);
    if (landscape.mode !== 'edge' || portrait.mode !== 'edge') throw new Error('expected edge');
    expect(landscape.deviation).toBeCloseTo(0);
    expect(portrait.deviation).toBeCloseTo(1);
  });

  it('reads stored zeros, including the old single-edge format', () => {
    expect(normalizeZero({ surface: { x: 1, y: 2 }, edge: 0.5 })).toEqual({
      surface: { x: 1, y: 2 },
      edge: [0, 0, 0, 0],
    });
    expect(normalizeZero(null)).toEqual(NO_ZERO);
  });

  it('zeroes against a reference surface', () => {
    const tilt = tiltFromGravity([G * Math.sin(rad(1)), 0, G * Math.cos(rad(1))]);
    const zero = zeroFrom(tilt, NO_ZERO);
    const zeroed = applyZero(tilt, zero);
    if (zeroed.mode !== 'surface') throw new Error('expected surface mode');
    expect(zeroed.x).toBeCloseTo(0);
    expect(zeroed.total).toBeCloseTo(0);
  });
});

describe('magneticHeading', () => {
  // Northern-hemisphere field: 20 µT north, 40 µT down.
  const flat = [0, 0, G];

  it('reads 0° with the top of the phone pointing north', () => {
    expect(magneticHeading(flat, [0, 20, -40])).toBeCloseTo(0);
  });

  it('reads 90° pointing east and 270° pointing west', () => {
    expect(magneticHeading(flat, [-20, 0, -40])).toBeCloseTo(90);
    expect(magneticHeading(flat, [20, 0, -40])).toBeCloseTo(270);
  });

  it('compensates for tilt', () => {
    // Top of the phone raised 30°, still facing north.
    const t = rad(30);
    const gravity = [0, G * Math.sin(t), G * Math.cos(t)];
    // Rotate the world field (north 20, down 40) into the tilted device frame.
    const magnetic = [0, 20 * Math.cos(t) - 40 * Math.sin(t), -20 * Math.sin(t) - 40 * Math.cos(t)];
    expect(wrap180(magneticHeading(gravity, magnetic) ?? NaN)).toBeCloseTo(0);
  });

  it('returns null when heading is undefined', () => {
    expect(magneticHeading(flat, [0, 0, -40])).toBeNull();
  });

  it('names compass points', () => {
    expect(cardinal(0)).toBe('N');
    expect(cardinal(100)).toBe('E');
    expect(cardinal(225)).toBe('SW');
    expect(cardinal(350)).toBe('N');
  });
});

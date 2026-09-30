import { describe, expect, it } from 'vitest';
import { magnitude, normalize } from './vector';

describe('magnitude', () => {
  it('computes the Euclidean length', () => {
    expect(magnitude([3, 4, 12])).toBe(13);
  });
});

describe('normalize', () => {
  it('maps into [0, 1] and clamps', () => {
    expect(normalize(50, 0, 100)).toBe(0.5);
    expect(normalize(-10, 0, 100)).toBe(0);
    expect(normalize(150, 0, 100)).toBe(1);
  });

  it('returns 0 for an empty range', () => {
    expect(normalize(5, 5, 5)).toBe(0);
  });
});

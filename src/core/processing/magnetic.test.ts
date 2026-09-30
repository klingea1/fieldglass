import { describe, expect, it } from 'vitest';
import { splitUncalibrated } from './magnetic';

describe('splitUncalibrated', () => {
  it('separates the raw field, the bias and the corrected field', () => {
    const field = splitUncalibrated([3 + 10, 4, 0, 10, 0, 0]);
    expect(field.corrected).toBe(5);
    expect(field.bias).toBe(10);
    expect(field.raw).toBeCloseTo(Math.hypot(13, 4));
  });
});

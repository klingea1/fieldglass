import { describe, expect, it } from 'vitest';
import { TraceBuffer } from './trace';

describe('TraceBuffer', () => {
  it('drops samples older than the window', () => {
    const trace = new TraceBuffer(1000);
    trace.push(0, 1);
    trace.push(600, 2);
    trace.push(1500, 3);
    expect(trace.items.map((s) => s.value)).toEqual([2, 3]);
    expect(trace.latest?.value).toBe(3);
  });
});

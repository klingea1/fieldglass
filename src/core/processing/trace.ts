export interface Sample {
  /** Milliseconds. */
  t: number;
  value: number;
}

/** Keeps the most recent samples within a time window, for drawing a live trace. */
export class TraceBuffer {
  private samples: Sample[] = [];

  constructor(readonly windowMs: number) {}

  push(t: number, value: number): void {
    this.samples.push({ t, value });
    const cutoff = t - this.windowMs;
    let drop = 0;
    while (drop < this.samples.length && (this.samples[drop]?.t ?? 0) < cutoff) drop++;
    if (drop) this.samples.splice(0, drop);
  }

  clear(): void {
    this.samples = [];
  }

  get items(): readonly Sample[] {
    return this.samples;
  }

  get latest(): Sample | undefined {
    return this.samples[this.samples.length - 1];
  }
}

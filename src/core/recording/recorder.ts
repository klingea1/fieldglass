export type Row = readonly (number | string)[];

/** Collects rows for one recording session. Values stay as numbers until export. */
export class Recorder {
  private rows: Row[] = [];
  private active = false;
  private startedAt: Date | null = null;

  constructor(readonly columns: readonly string[]) {}

  get recording(): boolean {
    return this.active;
  }

  get count(): number {
    return this.rows.length;
  }

  /** When the current or most recent recording started. */
  get startTime(): Date | null {
    return this.startedAt;
  }

  start(): void {
    this.rows = [];
    this.active = true;
    this.startedAt = new Date();
  }

  stop(): void {
    this.active = false;
  }

  push(row: Row): void {
    if (!this.recording) return;
    if (row.length !== this.columns.length) {
      throw new Error(`Expected ${this.columns.length} values, got ${row.length}`);
    }
    this.rows.push(row);
  }

  toCSV(): string {
    return [this.columns, ...this.rows].map((row) => row.map(csvField).join(',')).join('\n') + '\n';
  }
}

function csvField(value: number | string): string {
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/** e.g. "magnetometer-2026-09-30T14-05-09.csv" */
export function recordingFilename(toolId: string, startedAt: Date): string {
  const stamp = startedAt.toISOString().slice(0, 19).replaceAll(':', '-');
  return `${toolId}-${stamp}.csv`;
}

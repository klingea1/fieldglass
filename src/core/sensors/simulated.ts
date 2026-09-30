import { SIMULATED_SENSORS, type SensorModel } from './models';
import type { ReadingListener, SensorInfo, SensorSource, SensorType } from './types';

/** Generates synthetic readings on timers, for development without a phone. */
export class SimulatedSource implements SensorSource {
  readonly simulated = true;
  private readonly listeners = new Set<ReadingListener>();
  private readonly timers = new Map<SensorType, ReturnType<typeof setInterval>>();

  constructor(private readonly now: () => number = () => performance.now()) {}

  async listSensors(): Promise<SensorInfo[]> {
    return Object.values(SIMULATED_SENSORS).map((sensor) => sensor.info);
  }

  async start(type: SensorType, rateHz: number): Promise<void> {
    const sensor = SIMULATED_SENSORS[type];
    if (!sensor) throw new Error(`No simulated ${type} sensor`);
    this.clearTimer(type);

    const model: SensorModel = sensor.model();
    const startedAt = this.now();
    const intervalMs = 1000 / Math.min(rateHz, sensor.info.maxRateHz);
    this.timers.set(
      type,
      setInterval(() => {
        const timestamp = this.now();
        const values = model((timestamp - startedAt) / 1000);
        for (const listener of this.listeners) {
          listener({ type, timestamp, values, accuracy: 'high' });
        }
      }, intervalMs),
    );
  }

  async stop(type: SensorType): Promise<void> {
    this.clearTimer(type);
  }

  private clearTimer(type: SensorType): void {
    clearInterval(this.timers.get(type));
    this.timers.delete(type);
  }

  onReading(listener: ReadingListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

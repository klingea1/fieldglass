import type { Reading, ReadingListener, SensorInfo, SensorSource, SensorType } from './types';

export type ErrorListener = (error: Error) => void;

interface Subscription {
  rateHz: number;
  listener: ReadingListener;
  onError?: ErrorListener;
}

/**
 * Shares one SensorSource between tools. A sensor runs while at least one
 * subscriber wants it, at the fastest rate any subscriber asked for.
 */
export class SensorHub {
  private readonly subscriptions = new Map<SensorType, Set<Subscription>>();
  private readonly runningRates = new Map<SensorType, number>();

  constructor(readonly source: SensorSource) {
    source.onReading((reading) => this.dispatch(reading));
  }

  get simulated(): boolean {
    return this.source.simulated;
  }

  listSensors(): Promise<SensorInfo[]> {
    return this.source.listSensors();
  }

  /**
   * Starts receiving readings. onError hears about a sensor that fails to start,
   * e.g. one this phone doesn't have. Returns an unsubscribe function.
   */
  subscribe(
    type: SensorType,
    rateHz: number,
    listener: ReadingListener,
    onError?: ErrorListener,
  ): () => void {
    const subscription: Subscription = { rateHz, listener, onError };
    const subscribers = this.subscriptions.get(type) ?? new Set();
    subscribers.add(subscription);
    this.subscriptions.set(type, subscribers);
    void this.sync(type);

    return () => {
      subscribers.delete(subscription);
      void this.sync(type);
    };
  }

  private dispatch(reading: Reading): void {
    for (const { listener } of this.subscriptions.get(reading.type) ?? []) {
      listener(reading);
    }
  }

  /** Starts, restarts or stops a sensor to match its current subscribers. */
  private async sync(type: SensorType): Promise<void> {
    const subscribers = [...(this.subscriptions.get(type) ?? [])];
    const wanted = subscribers.length ? Math.max(...subscribers.map((s) => s.rateHz)) : 0;
    const running = this.runningRates.get(type) ?? 0;
    if (wanted === running) return;

    try {
      if (wanted === 0) {
        this.runningRates.delete(type);
        await this.source.stop(type);
      } else {
        this.runningRates.set(type, wanted);
        await this.source.start(type, wanted);
      }
    } catch (cause) {
      this.runningRates.delete(type);
      const error = cause instanceof Error ? cause : new Error(String(cause));
      for (const { onError } of this.subscriptions.get(type) ?? []) onError?.(error);
    }
  }
}

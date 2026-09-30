import { registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import type { Reading, ReadingListener, SensorInfo, SensorSource, SensorType } from './types';

/** The contract with android/.../sensors/SensorsPlugin.kt. */
export interface SensorsPlugin {
  listSensors(): Promise<{ sensors: SensorInfo[] }>;
  start(options: { type: SensorType; rateHz: number }): Promise<void>;
  stop(options: { type: SensorType }): Promise<void>;
  geomagnetic(options: { latitude: number; longitude: number; altitude?: number }): Promise<{
    declination: number;
    inclination: number;
    fieldStrengthUt: number;
  }>;
  addListener(
    event: 'readings',
    listener: (event: { readings: Reading[] }) => void,
  ): Promise<PluginListenerHandle>;
}

export const Sensors = registerPlugin<SensorsPlugin>('Sensors');

/** Real sensor readings from Android, via the native Sensors plugin. */
export class NativeSource implements SensorSource {
  readonly simulated = false;
  private readonly listeners = new Set<ReadingListener>();
  private subscribed = false;

  constructor(private readonly plugin: SensorsPlugin = Sensors) {}

  async listSensors(): Promise<SensorInfo[]> {
    return (await this.plugin.listSensors()).sensors;
  }

  start(type: SensorType, rateHz: number): Promise<void> {
    return this.plugin.start({ type, rateHz });
  }

  stop(type: SensorType): Promise<void> {
    return this.plugin.stop({ type });
  }

  onReading(listener: ReadingListener): () => void {
    this.listeners.add(listener);
    if (!this.subscribed) {
      this.subscribed = true;
      void this.plugin.addListener('readings', ({ readings }) => {
        for (const reading of readings) {
          for (const each of this.listeners) each(reading);
        }
      });
    }
    return () => this.listeners.delete(listener);
  }
}

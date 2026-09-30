import { Capacitor } from '@capacitor/core';
import { SensorHub } from './hub';
import { NativeSource } from './native';
import { SimulatedSource } from './simulated';

export * from './types';
export * from './metadata';
export { SensorHub } from './hub';
export { NativeSource } from './native';
export { SimulatedSource } from './simulated';

/** The app-wide sensor hub: real sensors on the phone, the simulator in a browser. */
export const sensors = new SensorHub(
  Capacitor.isNativePlatform() ? new NativeSource() : new SimulatedSource(),
);

import { SensorHub } from './hub';
import { SimulatedSource } from './simulated';

export * from './types';
export { SensorHub } from './hub';
export { SimulatedSource } from './simulated';

/**
 * The app-wide sensor hub. Everything runs on the simulator until the native
 * Android plugin lands in Phase 1, which will be chosen here when available.
 */
export const sensors = new SensorHub(new SimulatedSource());

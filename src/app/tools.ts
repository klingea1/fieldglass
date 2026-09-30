import type { Component } from 'svelte';
import type { SensorType } from '../core/sensors';

export interface ToolDefinition {
  /** URL-safe id, used in the route (#/magnetometer) and in export filenames. */
  id: string;
  name: string;
  summary: string;
  sensors: SensorType[];
  /** Planned tools show on the home screen but cannot be opened yet. */
  load?: () => Promise<{ default: Component }>;
}

export const TOOLS: ToolDefinition[] = [
  {
    id: 'magnetometer',
    name: 'Magnetometer',
    summary: 'Magnetic field strength on three axes',
    sensors: ['magnetometer'],
    load: () => import('../tools/magnetometer/Magnetometer.svelte'),
  },
  {
    id: 'metal-detector',
    name: 'Metal detector',
    summary: 'Find ferrous metal by its disturbance of the field',
    sensors: ['magnetometer'],
  },
  {
    id: 'level',
    name: 'Level',
    summary: 'Bubble level and inclinometer',
    sensors: ['accelerometer'],
  },
  {
    id: 'compass',
    name: 'Compass',
    summary: 'Magnetic and true heading',
    sensors: ['magnetometer', 'accelerometer'],
  },
  {
    id: 'sound-meter',
    name: 'Sound meter',
    summary: 'Sound level in dB',
    sensors: [],
  },
  {
    id: 'light-meter',
    name: 'Light meter',
    summary: 'Illuminance in lux',
    sensors: ['light'],
  },
];

export function findTool(id: string): ToolDefinition | undefined {
  return TOOLS.find((tool) => tool.id === id);
}

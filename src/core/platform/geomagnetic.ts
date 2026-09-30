import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { Sensors } from '../sensors/native';

export interface Geomagnetic {
  /** Degrees east of true north that a compass needle points. Add to a magnetic heading. */
  declination: number;
  /** Degrees the field dips below horizontal. */
  inclination: number;
  /** Expected total field strength at this location, in µT. */
  fieldStrengthUt: number;
  simulated: boolean;
}

/**
 * Looks up Earth's expected field where the phone is, using approximate location.
 * Asks for location permission the first time. In a browser it returns fixed values.
 */
export async function lookupGeomagnetic(): Promise<Geomagnetic> {
  if (!Capacitor.isNativePlatform()) {
    return { declination: 10.5, inclination: 65, fieldStrengthUt: 52, simulated: true };
  }

  let { coarseLocation } = await Geolocation.checkPermissions();
  if (coarseLocation !== 'granted') {
    ({ coarseLocation } = await Geolocation.requestPermissions({
      permissions: ['coarseLocation'],
    }));
  }
  if (coarseLocation !== 'granted') {
    throw new Error('True north needs approximate location, to look up magnetic declination.');
  }

  const { coords } = await Geolocation.getCurrentPosition({
    enableHighAccuracy: false,
    timeout: 20_000,
    // Declination barely changes over tens of kilometres, so an old fix is fine.
    maximumAge: 24 * 60 * 60 * 1000,
  });
  const field = await Sensors.geomagnetic({
    latitude: coords.latitude,
    longitude: coords.longitude,
    altitude: coords.altitude ?? 0,
  });
  return { ...field, simulated: false };
}

import { KeepAwake } from '@capacitor-community/keep-awake';

/** Keeps the screen on while a measurement is running. Best effort: failures are ignored. */
export async function keepAwake(on: boolean): Promise<void> {
  try {
    if (!(await KeepAwake.isSupported()).isSupported) return;
    await (on ? KeepAwake.keepAwake() : KeepAwake.allowSleep());
  } catch {
    // Not critical: the screen may just dim during a long reading.
  }
}

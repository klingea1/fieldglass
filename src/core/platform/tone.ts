/** Pitch and volume for a detector level in [0, 1]. */
export function toneFor(level: number): { frequency: number; gain: number } {
  const clamped = Math.min(1, Math.max(0, level));
  return {
    // Two and a half octaves up from 400 Hz. Phone speakers struggle below ~300 Hz.
    frequency: 400 * 2 ** (2.5 * clamped),
    // A faint idle hum so you can tell the sound is on, rising with the signal.
    gain: clamped < 0.05 ? 0.015 : 0.05 + 0.25 * clamped,
  };
}

/** A continuous tone whose pitch follows the detector level. */
export class Tone {
  private context: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private gain: GainNode | null = null;

  get playing(): boolean {
    return this.context !== null;
  }

  /** Must be called from a user gesture (a tap), or the browser keeps it silent. */
  async start(): Promise<void> {
    if (this.context) return;
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'triangle';
    gain.gain.value = 0;
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    await context.resume();
    this.context = context;
    this.oscillator = oscillator;
    this.gain = gain;
  }

  set(level: number): void {
    if (!this.context || !this.oscillator || !this.gain) return;
    const { frequency, gain } = toneFor(level);
    const now = this.context.currentTime;
    // Glide over ~30 ms so the tone doesn't click as it changes.
    this.oscillator.frequency.setTargetAtTime(frequency, now, 0.03);
    this.gain.gain.setTargetAtTime(gain, now, 0.03);
  }

  async stop(): Promise<void> {
    const context = this.context;
    this.context = this.oscillator = this.gain = null;
    await context?.close();
  }
}

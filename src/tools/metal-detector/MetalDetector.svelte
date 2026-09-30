<script lang="ts">
  import { MetalDetector, type DetectorState } from '../../core/processing/detector';
  import { TraceBuffer } from '../../core/processing/trace';
  import { keepAwake } from '../../core/platform/keep-awake';
  import { Tone } from '../../core/platform/tone';
  import { sensors, type Reading, type SensorAccuracy } from '../../core/sensors';
  import LevelBar from '../../ui/LevelBar.svelte';
  import Trace from '../../ui/Trace.svelte';

  const SENSITIVITIES = [
    { label: 'Low', fullScaleUt: 100 },
    { label: 'Medium', fullScaleUt: 30 },
    { label: 'High', fullScaleUt: 10 },
  ] as const;

  const DEFAULT_FULL_SCALE_UT = 30;

  let fullScaleUt = $state<number>(DEFAULT_FULL_SCALE_UT);
  const detector = new MetalDetector({ fullScaleUt: DEFAULT_FULL_SCALE_UT });
  const trace = new TraceBuffer(10_000);
  const tone = new Tone();

  let signal = $state<DetectorState | null>(null);
  let accuracy = $state<SensorAccuracy>('high');
  let sensorError = $state<string | null>(null);
  let soundOn = $state(false);
  let recalibratedAt = $state(0);
  let now = $state(0);

  const showRecalibrated = $derived(now - recalibratedAt < 4000);
  const needsCalibration = $derived(accuracy === 'unreliable' || accuracy === 'low');

  function onReading({ values, timestamp, accuracy: readingAccuracy }: Reading) {
    const next = detector.update(values, timestamp);
    trace.push(timestamp, next.deviation);
    tone.set(next.level);
    if (next.recalibrated) recalibratedAt = timestamp;
    now = timestamp;
    accuracy = readingAccuracy;
    signal = next;
  }

  $effect(() => {
    const unsubscribe = sensors.subscribe(
      'magnetometer-uncalibrated',
      50,
      onReading,
      (error) => (sensorError = error.message),
    );
    void keepAwake(true);
    sensors.listSensors().then((list) => {
      const sensor = list.find((s) => s.type === 'magnetometer-uncalibrated');
      if (sensor) detector.configure({ maxRangeUt: sensor.maxRange });
    });
    return () => {
      unsubscribe();
      void keepAwake(false);
      void tone.stop();
    };
  });

  $effect(() => detector.configure({ fullScaleUt }));

  async function toggleSound() {
    if (tone.playing) {
      await tone.stop();
    } else {
      await tone.start();
    }
    soundOn = tone.playing;
  }

  function zero() {
    detector.zero();
  }

  const formatDeviation = (value: number) =>
    `${value >= 0.05 ? '+' : value <= -0.05 ? '−' : ''}${Math.abs(value).toFixed(1)}`;
</script>

<section>
  <h1>Metal detector</h1>

  {#if sensorError}
    <p class="notice error" role="alert">{sensorError}</p>
  {:else if signal?.saturated}
    <p class="notice error" role="alert">
      Sensor saturated. The field is stronger than this phone can measure; move away from the
      magnet.
    </p>
  {:else if showRecalibrated}
    <p class="notice" role="status">Android recalibrated the sensor, so the detector re-zeroed.</p>
  {:else if needsCalibration}
    <p class="notice" role="status">
      Readings may be off. Wave the phone in a figure-8 a few times to recalibrate.
    </p>
  {/if}

  <div class="readout" aria-live="off">
    <span class="deviation">{signal ? formatDeviation(signal.deviation) : '–'}</span>
    <span class="unit">µT</span>
  </div>
  <p class="field">
    Field {signal ? signal.field.toFixed(1) : '–'} µT
  </p>

  <LevelBar level={signal?.level ?? 0} label="Signal strength" />

  <Trace {trace} range={fullScaleUt} label="Signal over the last 10 seconds" />

  <div class="controls">
    <button onclick={zero}>Zero</button>
    <button class:on={soundOn} onclick={toggleSound} aria-pressed={soundOn}>
      {soundOn ? 'Sound on' : 'Sound off'}
    </button>
  </div>

  <fieldset>
    <legend>Sensitivity</legend>
    <div class="segments">
      {#each SENSITIVITIES as option (option.label)}
        <label class:selected={fullScaleUt === option.fullScaleUt}>
          <input
            type="radio"
            name="sensitivity"
            value={option.fullScaleUt}
            bind:group={fullScaleUt}
          />
          {option.label}
          <small>±{option.fullScaleUt} µT</small>
        </label>
      {/each}
    </div>
  </fieldset>

  <details>
    <summary>How to use it</summary>
    <ol>
      <li>Hold the phone away from metal and tap <strong>Zero</strong>.</li>
      <li>
        Find the sensor: move a small magnet across the back of the phone and note where the signal
        peaks. Lead with that spot when you sweep.
      </li>
      <li>Sweep slowly, a few centimetres above the surface. The signal peaks over the target.</li>
      <li>
        It finds iron, steel and magnets. Aluminium, copper, gold and silver aren't magnetic and
        won't show up.
      </li>
      <li>Re-zero now and then; the reading drifts slowly with temperature and location.</li>
    </ol>
  </details>
</section>

<style>
  section {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  h1 {
    font-size: var(--text-xl);
    text-align: center;
  }

  .notice {
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--color-warning);
    border-radius: var(--radius-sm);
    color: var(--color-warning);
    font-size: var(--text-sm);
    text-align: center;
  }

  .notice.error {
    border-color: var(--color-danger);
    color: var(--color-danger);
  }

  .readout {
    display: flex;
    justify-content: center;
    align-items: baseline;
    gap: var(--space-2);
    margin-top: var(--space-2);
  }

  .deviation {
    font-family: var(--font-mono);
    font-size: calc(var(--text-display) * 1.6);
    font-variant-numeric: tabular-nums;
    line-height: 1;
  }

  .unit {
    color: var(--color-text-muted);
    font-size: var(--text-lg);
  }

  .field {
    margin-top: calc(-1 * var(--space-2));
    text-align: center;
    color: var(--color-text-muted);
    font-size: var(--text-sm);
  }

  .controls {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-2);
  }

  button {
    min-height: var(--tap-min);
    background: var(--color-surface-raised);
    border: none;
    border-radius: var(--radius-sm);
    font-weight: 600;
    cursor: pointer;
  }

  button.on {
    background: var(--color-accent);
  }

  fieldset {
    border: none;
  }

  legend {
    margin-bottom: var(--space-2);
    color: var(--color-text-muted);
    font-size: var(--text-sm);
  }

  .segments {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-1);
    padding: var(--space-1);
    background: var(--color-surface);
    border-radius: var(--radius-sm);
  }

  .segments label {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: var(--tap-min);
    border-radius: var(--radius-sm);
    font-weight: 600;
    cursor: pointer;
  }

  .segments label.selected {
    background: var(--color-surface-raised);
  }

  .segments input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  .segments label:has(input:focus-visible) {
    outline: 2px solid var(--color-accent);
  }

  small {
    color: var(--color-text-muted);
    font-weight: normal;
  }

  details {
    color: var(--color-text-muted);
    font-size: var(--text-sm);
    line-height: 1.5;
  }

  summary {
    padding: var(--space-3) 0;
    cursor: pointer;
    color: var(--color-text);
  }

  ol {
    padding-left: var(--space-6);
    display: grid;
    gap: var(--space-2);
  }
</style>

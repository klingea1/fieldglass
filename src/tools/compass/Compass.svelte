<script lang="ts">
  import { AngleSmoother, wrap360 } from '../../core/processing/angles';
  import { cardinal, magneticHeading } from '../../core/processing/heading';
  import { magnitude } from '../../core/processing/vector';
  import { lookupGeomagnetic, type Geomagnetic } from '../../core/platform/geomagnetic';
  import { keepAwake } from '../../core/platform/keep-awake';
  import { loadSetting, saveSetting } from '../../core/platform/storage';
  import { sensors, type Reading, type SensorAccuracy } from '../../core/sensors';

  type Reference = 'magnetic' | 'true';

  /** Field strength this far from what's expected here suggests nearby interference. */
  const INTERFERENCE_UT = 10;

  let reference = $state<Reference>(loadSetting<Reference>('compass.reference', 'magnetic'));
  let geomagnetic = $state<Geomagnetic | null>(null);
  let lookupError = $state<string | null>(null);
  let lookingUp = $state(false);

  let heading = $state<number | null>(null);
  let fieldUt = $state<number | null>(null);
  let upright = $state(false);
  let accuracy = $state<SensorAccuracy>('high');
  let sensorError = $state<string | null>(null);

  let gravity: readonly number[] | null = null;
  const smoother = new AngleSmoother(0.15);

  const displayed = $derived(
    heading === null
      ? null
      : reference === 'true' && geomagnetic
        ? wrap360(heading + geomagnetic.declination)
        : heading,
  );
  const interference = $derived.by(() => {
    if (fieldUt === null) return false;
    if (geomagnetic) return Math.abs(fieldUt - geomagnetic.fieldStrengthUt) > INTERFERENCE_UT;
    return fieldUt < 20 || fieldUt > 70;
  });
  const needsCalibration = $derived(accuracy === 'unreliable' || accuracy === 'low');

  function onGravity({ values }: Reading) {
    gravity = values;
    const g = magnitude(values) || 1;
    upright = Math.abs(values[2] ?? 0) / g < 0.5;
  }

  function onMagnetic({ values, accuracy: readingAccuracy }: Reading) {
    accuracy = readingAccuracy;
    fieldUt = magnitude(values);
    if (!gravity) return;
    const next = magneticHeading(gravity, values);
    if (next !== null) heading = smoother.update(next);
  }

  $effect(() => {
    const onError = (error: Error) => (sensorError = error.message);
    const stopGravity = sensors.subscribe('gravity', 30, onGravity, onError);
    const stopMagnetic = sensors.subscribe('magnetometer', 30, onMagnetic, onError);
    void keepAwake(true);
    return () => {
      stopGravity();
      stopMagnetic();
      void keepAwake(false);
    };
  });

  function useReference(next: Reference) {
    reference = next;
    saveSetting('compass.reference', next);
  }

  async function lookup() {
    lookingUp = true;
    lookupError = null;
    try {
      geomagnetic = await lookupGeomagnetic();
    } catch (error) {
      lookupError = error instanceof Error ? error.message : String(error);
      reference = 'magnetic';
    } finally {
      lookingUp = false;
    }
  }

  // Looks up declination when true north is chosen, including when the tool opens with it.
  $effect(() => {
    if (reference === 'true' && !geomagnetic && !lookingUp) void lookup();
  });

  const TICKS = Array.from({ length: 72 }, (_, i) => i * 5);
  const LABELS = [
    { deg: 0, text: 'N' },
    { deg: 90, text: 'E' },
    { deg: 180, text: 'S' },
    { deg: 270, text: 'W' },
  ];
  const formatDeclination = (d: number) => `${Math.abs(d).toFixed(1)}° ${d >= 0 ? 'E' : 'W'}`;
</script>

<section>
  <h1>Compass</h1>

  {#if sensorError}
    <p class="notice error" role="alert">{sensorError}</p>
  {:else if needsCalibration}
    <p class="notice" role="status">
      Heading may be off. Wave the phone in a figure-8 a few times to recalibrate.
    </p>
  {:else if interference}
    <p class="notice" role="status">
      Magnetic interference nearby ({fieldUt?.toFixed(0)} µT{geomagnetic
        ? `, expected ${geomagnetic.fieldStrengthUt.toFixed(0)}`
        : ''}). Move away from metal, magnets and electronics.
    </p>
  {:else if upright}
    <p class="notice" role="status">Hold the phone flat for a steady heading.</p>
  {/if}

  <div class="dial">
    <svg viewBox="-120 -128 240 248" aria-hidden="true">
      <polygon class="lubber" points="0,-126 -8,-112 8,-112" />
      <g style:transform="rotate({-(displayed ?? 0)}deg)">
        <circle class="face" r="108" />
        {#each TICKS as deg (deg)}
          <line
            class="tick"
            class:major={deg % 30 === 0}
            y1="-108"
            y2={deg % 30 === 0 ? -94 : -101}
            transform="rotate({deg})"
          />
        {/each}
        {#each LABELS as { deg, text } (text)}
          <text
            class="label"
            class:north={text === 'N'}
            transform="rotate({deg}) translate(0 -76) rotate({-deg + (displayed ?? 0)})"
            text-anchor="middle"
            dominant-baseline="central">{text}</text
          >
        {/each}
      </g>
    </svg>
  </div>

  <p class="readout" aria-live="off">
    {#if displayed === null}
      –
    {:else}
      {Math.round(displayed) % 360}° <span class="point">{cardinal(displayed)}</span>
    {/if}
  </p>

  <fieldset>
    <legend>North reference</legend>
    <div class="segments">
      {#each [{ value: 'magnetic', label: 'Magnetic' }, { value: 'true', label: 'True' }] as const as option (option.value)}
        <label class:selected={reference === option.value}>
          <input
            type="radio"
            name="reference"
            checked={reference === option.value}
            onchange={() => useReference(option.value)}
          />
          {option.label}
        </label>
      {/each}
    </div>
  </fieldset>

  <p class="detail">
    {#if lookingUp}
      Finding your approximate location…
    {:else if lookupError}
      <span class="error">{lookupError}</span>
    {:else if reference === 'true' && geomagnetic}
      Declination {formatDeclination(geomagnetic.declination)}{geomagnetic.simulated
        ? ' (simulated)'
        : ''}. True north uses your approximate location, which stays on this phone.
    {:else}
      Magnetic north. Switch to true north to correct for declination where you are.
    {/if}
  </p>
  <p class="detail">Field {fieldUt === null ? '–' : fieldUt.toFixed(1)} µT</p>
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

  .dial {
    width: min(100%, 320px);
    margin: 0 auto;
  }

  svg {
    width: 100%;
    overflow: visible;
  }

  .face {
    fill: var(--color-surface);
    stroke: var(--color-surface-raised);
    stroke-width: 3;
  }

  .tick {
    stroke: var(--color-text-muted);
    stroke-width: 1;
  }

  .tick.major {
    stroke: var(--color-text);
    stroke-width: 2;
  }

  .label {
    fill: var(--color-text);
    font-family: var(--font-body);
    font-size: 20px;
    font-weight: 700;
  }

  .label.north {
    fill: var(--color-danger);
  }

  .lubber {
    fill: var(--color-signal);
  }

  .readout {
    font-family: var(--font-mono);
    font-size: calc(var(--text-display) * 1.4);
    font-variant-numeric: tabular-nums;
    text-align: center;
    line-height: 1;
  }

  .point {
    color: var(--color-text-muted);
    font-size: var(--text-xl);
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
    grid-template-columns: 1fr 1fr;
    gap: var(--space-1);
    padding: var(--space-1);
    background: var(--color-surface);
    border-radius: var(--radius-sm);
  }

  .segments label {
    display: flex;
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

  .detail {
    color: var(--color-text-muted);
    font-size: var(--text-sm);
    text-align: center;
    line-height: 1.5;
  }

  .error {
    color: var(--color-danger);
  }
</style>

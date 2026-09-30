<script lang="ts">
  import { toRadians, wrap180 } from '../../core/processing/angles';
  import {
    NO_ZERO,
    applyZero,
    hasZero,
    normalizeZero,
    tiltFromGravity,
    zeroFrom,
    type LevelZero,
    type Tilt,
  } from '../../core/processing/tilt';
  import { keepAwake } from '../../core/platform/keep-awake';
  import { loadSetting, saveSetting } from '../../core/platform/storage';
  import { sensors, type Reading } from '../../core/sensors';

  /** Within this many degrees the level reads as level. */
  const LEVEL_TOLERANCE = 0.2;
  /** Degrees at the edge of the vials. */
  const VIAL_RANGE = 10;
  const SMOOTHING = 0.25;
  /** CSS rotation that keeps the edge view upright for each edge-down position. */
  const VIEW_ROTATION = [0, 90, 180, -90];

  let zero = $state<LevelZero>(normalizeZero(loadSetting<unknown>('level.zero', NO_ZERO)));
  let raw = $state<Tilt | null>(null);
  let held = $state<Tilt | null>(null);
  let sensorError = $state<string | null>(null);
  let gravity: number[] | null = null;

  const tilt = $derived(held ?? (raw ? applyZero(raw, zero) : null));
  const zeroed = $derived(hasZero(zero));
  const isLevel = $derived(
    tilt !== null &&
      (tilt.mode === 'surface' ? tilt.total : Math.abs(tilt.deviation)) < LEVEL_TOLERANCE,
  );

  function onReading({ values }: Reading) {
    gravity = gravity ? gravity.map((g, i) => g + SMOOTHING * ((values[i] ?? g) - g)) : [...values];
    raw = tiltFromGravity(gravity);
  }

  $effect(() => {
    const unsubscribe = sensors.subscribe(
      'gravity',
      30,
      onReading,
      (error) => (sensorError = error.message),
    );
    void keepAwake(true);
    return () => {
      unsubscribe();
      void keepAwake(false);
    };
  });

  function setZero() {
    if (!raw) return;
    zero = zeroFrom(raw, zero);
    saveSetting('level.zero', zero);
  }

  function clearZero() {
    zero = NO_ZERO;
    saveSetting('level.zero', zero);
  }

  function toggleHold() {
    held = held ? null : tilt;
  }

  /** Slope as a percentage (rise over run), as used on building plans. */
  const grade = (degrees: number) => Math.tan(toRadians(Math.abs(degrees))) * 100;
  const clamp = (value: number) => Math.max(-1, Math.min(1, value / VIAL_RANGE));
  const fmt = (degrees: number) => `${Math.abs(degrees) < 0.05 ? '0.0' : degrees.toFixed(1)}°`;
</script>

<section>
  <h1>Level</h1>

  {#if sensorError}
    <p class="notice error" role="alert">{sensorError}</p>
  {/if}

  {#if tilt?.mode === 'surface'}
    {@const bx = clamp(tilt.x)}
    {@const by = clamp(tilt.y)}
    {@const r = Math.hypot(bx, by) > 1 ? Math.hypot(bx, by) : 1}
    <svg class="vial" viewBox="-110 -110 220 220" class:level={isLevel} aria-hidden="true">
      <circle class="glass" r="100" />
      <circle class="ring" r={(100 * 5) / VIAL_RANGE} />
      <circle class="ring target" r={(100 * 1) / VIAL_RANGE} />
      <line class="cross" x1="-100" x2="100" />
      <line class="cross" y1="-100" y2="100" />
      <circle class="bubble" cx={(84 * bx) / r} cy={(-84 * by) / r} r="16" />
    </svg>

    <p class="readout" class:level={isLevel} aria-live="polite">
      {isLevel ? 'Level' : fmt(tilt.total)}
    </p>
    <dl class="axes">
      <div>
        <dt>Left / right</dt>
        <dd>{fmt(tilt.x)}</dd>
      </div>
      <div>
        <dt>Top / bottom</dt>
        <dd>{fmt(tilt.y)}</dd>
      </div>
      <div>
        <dt>Grade</dt>
        <dd>{grade(tilt.total).toFixed(1)}%</dd>
      </div>
    </dl>
    <p class="hint">Lying flat: measuring the surface under the phone.</p>
  {:else if tilt?.mode === 'edge'}
    {@const bx = clamp(tilt.deviation)}
    <div class="edge-view" style:transform="rotate({VIEW_ROTATION[tilt.quadrant]}deg)">
      <svg class="tube" viewBox="-160 -30 320 60" class:level={isLevel} aria-hidden="true">
        <rect class="glass" x="-150" y="-22" width="300" height="44" rx="22" />
        <line class="mark" x1="-22" x2="-22" y1="-22" y2="22" />
        <line class="mark" x1="22" x2="22" y1="-22" y2="22" />
        <ellipse class="bubble" cx={120 * bx} rx="20" ry="14" />
      </svg>

      <p class="readout" class:level={isLevel} aria-live="polite">
        {isLevel ? 'Level' : fmt(tilt.deviation)}
      </p>
      <dl class="axes">
        <div>
          <dt>Rotation</dt>
          <dd>{fmt(wrap180(tilt.angle))}</dd>
        </div>
        <div>
          <dt>Grade</dt>
          <dd>{grade(tilt.deviation).toFixed(1)}%</dd>
        </div>
      </dl>
      <p class="hint">
        On its {tilt.quadrant % 2 ? 'long' : 'short'} edge: how far that edge is from level.
      </p>
    </div>
  {:else}
    <p class="hint">Waiting for the gravity sensor…</p>
  {/if}

  <div class="controls">
    <button onclick={setZero} disabled={!raw || held !== null}>Zero here</button>
    <button class:on={held !== null} onclick={toggleHold} aria-pressed={held !== null}>
      {held ? 'Release' : 'Hold'}
    </button>
  </div>
  {#if zeroed}
    <p class="zeroed">
      Measuring relative to a zero you set. <button class="link" onclick={clearZero}>Reset</button>
    </p>
  {/if}

  <details>
    <summary>Getting an accurate reading</summary>
    <ul>
      <li>
        Phones aren't perfectly calibrated. To cancel the phone's own error, put it on a surface,
        tap <strong>Zero here</strong>, then turn it 180° on the same spot. Half the reading you see
        then is the surface's true tilt.
      </li>
      <li>Camera bumps tilt the phone when it lies flat. Lay it on a flat case, or zero first.</li>
      <li><strong>Hold</strong> freezes the reading, for places where you can't see the screen.</li>
    </ul>
  </details>
</section>

<style>
  section {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    align-items: stretch;
  }

  h1 {
    font-size: var(--text-xl);
    text-align: center;
  }

  .vial {
    width: min(100%, 300px);
    margin: 0 auto;
  }

  .edge-view {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: var(--space-4);
    width: min(100%, 360px);
    aspect-ratio: 1;
    margin: 0 auto;
    transition: transform 250ms ease;
  }

  .tube {
    width: 100%;
  }

  .glass {
    fill: var(--color-surface);
    stroke: var(--color-surface-raised);
    stroke-width: 3;
  }

  .ring,
  .cross,
  .mark {
    fill: none;
    stroke: var(--color-surface-raised);
    stroke-width: 1.5;
  }

  .ring.target,
  .mark {
    stroke: var(--color-text-muted);
  }

  .bubble {
    fill: var(--color-text);
    opacity: 0.85;
  }

  .level .bubble {
    fill: var(--color-signal);
    opacity: 1;
    filter: drop-shadow(0 0 6px var(--color-glow));
  }

  .readout {
    font-family: var(--font-mono);
    font-size: calc(var(--text-display) * 1.4);
    font-variant-numeric: tabular-nums;
    text-align: center;
    line-height: 1;
  }

  .readout.level {
    color: var(--color-signal);
  }

  .axes {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: 1fr;
    gap: var(--space-2);
    text-align: center;
  }

  .axes div {
    padding: var(--space-2);
    background: var(--color-surface);
    border-radius: var(--radius-sm);
  }

  dt {
    color: var(--color-text-muted);
    font-size: var(--text-sm);
  }

  dd {
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
    font-size: var(--text-lg);
  }

  .hint,
  .zeroed,
  details {
    color: var(--color-text-muted);
    font-size: var(--text-sm);
    line-height: 1.5;
  }

  .hint,
  .zeroed {
    text-align: center;
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

  button:disabled {
    opacity: 0.4;
    cursor: default;
  }

  button.on {
    background: var(--color-accent);
  }

  button.link {
    min-height: 0;
    background: none;
    color: var(--color-accent);
    text-decoration: underline;
    font-weight: normal;
  }

  .notice.error {
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--color-danger);
    border-radius: var(--radius-sm);
    color: var(--color-danger);
    text-align: center;
  }

  summary {
    padding: var(--space-3) 0;
    cursor: pointer;
    color: var(--color-text);
  }

  ul {
    padding-left: var(--space-6);
    display: grid;
    gap: var(--space-2);
  }
</style>

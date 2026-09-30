<script lang="ts">
  import { normalize } from '../core/processing/vector';

  interface Props {
    value: number | null;
    min: number;
    max: number;
    unit: string;
    decimals?: number;
    label?: string;
  }

  let { value, min, max, unit, decimals = 1, label }: Props = $props();

  const fraction = $derived(value === null ? 0 : normalize(value, min, max));
  // Needle sweeps from pointing left (-90°) to pointing right (+90°).
  const needleAngle = $derived(-90 + 180 * fraction);
</script>

<figure class="gauge" aria-label={label}>
  <svg viewBox="0 0 200 116" role="img" aria-hidden="true">
    <path class="track" d="M 20 100 A 80 80 0 0 1 180 100" pathLength="100" />
    <path
      class="fill"
      d="M 20 100 A 80 80 0 0 1 180 100"
      pathLength="100"
      stroke-dasharray="{fraction * 100} 100"
    />
    <g class="needle" style:transform="rotate({needleAngle}deg)">
      <polygon points="98,100 100,28 102,100" />
    </g>
    <circle cx="100" cy="100" r="5" class="hub" />
    <text x="20" y="114" text-anchor="middle">{min}</text>
    <text x="180" y="114" text-anchor="middle">{max}</text>
  </svg>
  <figcaption>
    <span class="value">{value === null ? '–' : value.toFixed(decimals)}</span>
    <span class="unit">{unit}</span>
  </figcaption>
</figure>

<style>
  .gauge {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: min(100%, 320px);
    margin: 0 auto;
  }

  svg {
    width: 100%;
    overflow: visible;
  }

  path {
    fill: none;
    stroke-width: 12;
    stroke-linecap: round;
  }

  .track {
    stroke: var(--color-surface-raised);
  }

  .fill {
    stroke: var(--color-signal);
    filter: drop-shadow(0 0 6px var(--color-glow));
  }

  .needle {
    transform-origin: 100px 100px;
    transition: transform 80ms linear;
  }

  .needle polygon,
  .hub {
    fill: var(--color-text);
  }

  text {
    fill: var(--color-text-muted);
    font-size: 9px;
    font-family: var(--font-body);
  }

  figcaption {
    display: flex;
    align-items: baseline;
    gap: var(--space-2);
    margin-top: var(--space-2);
  }

  .value {
    font-family: var(--font-mono);
    font-size: var(--text-display);
    font-variant-numeric: tabular-nums;
  }

  .unit {
    color: var(--color-text-muted);
    font-size: var(--text-lg);
  }
</style>

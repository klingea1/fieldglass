<script lang="ts">
  import { SENSOR_META, shortAndroidType, type SensorInfo } from '../../core/sensors';
  import LiveValues from './LiveValues.svelte';

  let { sensor }: { sensor: SensorInfo } = $props();

  let open = $state(false);
  const unit = $derived(sensor.type ? SENSOR_META[sensor.type].unit : '');
  const specs = $derived<[string, string][]>([
    ['Type', shortAndroidType(sensor.androidType)],
    ['Vendor', `${sensor.vendor} (v${sensor.version})`],
    ['Range', `${formatNumber(sensor.maxRange)} ${unit}`],
    ['Resolution', `${formatNumber(sensor.resolution)} ${unit}`],
    ['Max rate', sensor.maxRateHz > 0 ? `${formatNumber(sensor.maxRateHz)} Hz` : 'on change'],
    ['Power', `${formatNumber(sensor.powerMa)} mA`],
  ]);

  function formatNumber(value: number): string {
    return Number(value.toPrecision(4)).toString();
  }
</script>

<article>
  <button class="header" onclick={() => (open = !open)} aria-expanded={open}>
    <span class="name">{sensor.type ? SENSOR_META[sensor.type].label : sensor.name}</span>
    {#if sensor.type}<span class="model">{sensor.name}</span>{/if}
  </button>

  {#if open}
    <div class="body">
      <dl>
        {#each specs as [label, value] (label)}
          <div>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        {/each}
      </dl>
      {#if sensor.type}
        <LiveValues type={sensor.type} />
      {/if}
    </div>
  {/if}
</article>

<style>
  article {
    background: var(--color-surface);
    border-radius: var(--radius-md);
    overflow: hidden;
  }

  .header {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-1);
    width: 100%;
    min-height: var(--tap-min);
    padding: var(--space-3) var(--space-4);
    background: none;
    border: none;
    text-align: left;
    cursor: pointer;
  }

  .name {
    font-weight: 600;
  }

  .model {
    color: var(--color-text-muted);
    font-size: var(--text-sm);
  }

  .body {
    display: grid;
    gap: var(--space-3);
    padding: 0 var(--space-4) var(--space-4);
  }

  dl {
    display: grid;
    gap: var(--space-1);
    font-size: var(--text-sm);
  }

  dl:not(:last-child) {
    padding-bottom: var(--space-3);
    border-bottom: 1px solid var(--color-surface-raised);
  }

  dl div {
    display: flex;
    justify-content: space-between;
    gap: var(--space-3);
  }

  dt {
    color: var(--color-text-muted);
  }

  dd {
    text-align: right;
    overflow-wrap: anywhere;
  }
</style>

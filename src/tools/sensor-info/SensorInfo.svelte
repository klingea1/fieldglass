<script lang="ts">
  import { exportCSV } from '../../core/recording/export';
  import { toCSV } from '../../core/recording/recorder';
  import { sensors, shortAndroidType, type SensorInfo } from '../../core/sensors';
  import SensorCard from './SensorCard.svelte';

  const list = sensors.listSensors();
  let exportError = $state<string | null>(null);

  async function exportList(all: SensorInfo[]) {
    exportError = null;
    const rows = all.map((s) => [
      s.type ?? '',
      shortAndroidType(s.androidType),
      s.name,
      s.vendor,
      s.version,
      s.maxRange,
      s.resolution,
      s.powerMa,
      s.maxRateHz,
      s.wakeUp ? 'yes' : 'no',
    ]);
    const csv = toCSV(
      [
        'fieldglass_type',
        'android_type',
        'name',
        'vendor',
        'version',
        'max_range',
        'resolution',
        'power_mA',
        'max_rate_Hz',
        'wake_up',
      ],
      rows,
    );
    const date = new Date().toISOString().slice(0, 10);
    try {
      await exportCSV(`sensors-${date}.csv`, csv);
    } catch (error) {
      exportError = error instanceof Error ? error.message : String(error);
    }
  }
</script>

<section>
  <h1>Sensor info</h1>

  {#await list}
    <p class="muted">Reading sensor list…</p>
  {:then all}
    {@const used = all.filter((s) => s.type)}
    {@const others = all.filter((s) => !s.type)}

    <p class="muted">
      This phone reports {all.length} sensors. Tap one for its specs; the ones fieldglass uses also show
      live readings.
    </p>

    <h2>Used by fieldglass</h2>
    <div class="list">
      {#each used as sensor (sensor.androidType + sensor.name)}
        <SensorCard {sensor} />
      {/each}
    </div>

    {#if others.length}
      <h2>Other sensors</h2>
      <div class="list">
        {#each others as sensor, i (i)}
          <SensorCard {sensor} />
        {/each}
      </div>
    {/if}

    <button class="export" onclick={() => exportList(all)}>Export sensor list (CSV)</button>
    {#if exportError}<p class="error" role="alert">Export failed: {exportError}</p>{/if}
  {:catch error}
    <p class="error">Could not read sensors: {error.message}</p>
  {/await}
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

  h2 {
    margin-top: var(--space-2);
    font-size: var(--text-md);
    color: var(--color-text-muted);
    font-weight: 600;
  }

  .list {
    display: grid;
    gap: var(--space-2);
  }

  .muted {
    color: var(--color-text-muted);
    font-size: var(--text-sm);
    line-height: 1.5;
  }

  .export {
    min-height: var(--tap-min);
    background: var(--color-surface-raised);
    border: none;
    border-radius: var(--radius-sm);
    font-weight: 600;
    cursor: pointer;
  }

  .error {
    color: var(--color-danger);
  }
</style>

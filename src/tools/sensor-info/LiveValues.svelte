<script lang="ts">
  import { splitUncalibrated } from '../../core/processing/magnetic';
  import { magnitude } from '../../core/processing/vector';
  import { SENSOR_META, sensors, type Reading, type SensorType } from '../../core/sensors';

  let { type }: { type: SensorType } = $props();

  const meta = $derived(SENSOR_META[type]);
  let reading = $state<Reading | null>(null);
  let error = $state<string | null>(null);

  $effect(() =>
    sensors.subscribe(
      type,
      10,
      (r) => (reading = r),
      (e) => (error = e.message),
    ),
  );

  const extras = $derived.by((): [string, number][] => {
    if (!reading) return [];
    if (type === 'magnetometer-uncalibrated') {
      const field = splitUncalibrated(reading.values);
      return [
        ['total, raw', field.raw],
        ['bias estimate', field.bias],
        ['total, corrected', field.corrected],
      ];
    }
    if (meta.axes.length === 3) return [['total', magnitude(reading.values)]];
    return [];
  });

  const format = (value: number | undefined) =>
    value === undefined || value === null ? '–' : value.toFixed(meta.decimals);
</script>

{#if error}
  <p class="error">{error}</p>
{:else}
  <table>
    <tbody>
      {#each meta.axes as axis, i (axis)}
        <tr>
          <th>{axis}</th>
          <td>{format(reading?.values[i])}</td>
        </tr>
      {/each}
      {#each extras as [label, value] (label)}
        <tr class="derived">
          <th>{label}</th>
          <td>{format(value)}</td>
        </tr>
      {/each}
    </tbody>
  </table>
  <p class="meta">
    {meta.unit}{#if reading}, accuracy {reading.accuracy}{/if}
  </p>
{/if}

<style>
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--text-sm);
  }

  th {
    text-align: left;
    font-weight: normal;
    color: var(--color-text-muted);
    padding: var(--space-1) 0;
  }

  td {
    text-align: right;
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
  }

  .derived th,
  .derived td {
    border-top: 1px solid var(--color-surface-raised);
    color: var(--color-signal);
  }

  .meta {
    margin-top: var(--space-2);
    color: var(--color-text-muted);
    font-size: var(--text-sm);
  }

  .error {
    color: var(--color-danger);
    font-size: var(--text-sm);
  }
</style>

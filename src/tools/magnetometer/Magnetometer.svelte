<script lang="ts">
  import { magnitude } from '../../core/processing/vector';
  import { keepAwake } from '../../core/platform/keep-awake';
  import { exportCSV } from '../../core/recording/export';
  import { Recorder, recordingFilename } from '../../core/recording/recorder';
  import { sensors, type Reading } from '../../core/sensors';
  import Gauge from '../../ui/Gauge.svelte';
  import RecordControls from '../../ui/RecordControls.svelte';

  const RATE_HZ = 50;
  const round = (value: number) => Number(value.toFixed(3));

  const recorder = new Recorder(['time_s', 'x_uT', 'y_uT', 'z_uT', 'total_uT', 'accuracy']);
  let recordStart = 0;

  let running = $state(true);
  let recording = $state(false);
  let count = $state(0);
  let latest = $state<{ x: number; y: number; z: number; total: number } | null>(null);
  let exportError = $state<string | null>(null);

  function onReading({ timestamp, values, accuracy }: Reading) {
    const [x = 0, y = 0, z = 0] = values;
    const total = magnitude(values);
    latest = { x, y, z, total };

    if (recorder.recording) {
      if (recorder.count === 0) recordStart = timestamp;
      recorder.push(
        [(timestamp - recordStart) / 1000, x, y, z, total, accuracy].map((v) =>
          typeof v === 'number' ? round(v) : v,
        ),
      );
      count = recorder.count;
    }
  }

  $effect(() => {
    if (!running) return;
    const unsubscribe = sensors.subscribe('magnetometer', RATE_HZ, onReading);
    void keepAwake(true);
    return () => {
      unsubscribe();
      void keepAwake(false);
    };
  });

  function toggleRecording() {
    if (recorder.recording) {
      recorder.stop();
    } else {
      recorder.start();
      count = 0;
    }
    recording = recorder.recording;
  }

  async function exportRecording() {
    exportError = null;
    try {
      await exportCSV(
        recordingFilename('magnetometer', recorder.startTime ?? new Date()),
        recorder.toCSV(),
      );
    } catch (error) {
      exportError = error instanceof Error ? error.message : String(error);
    }
  }
</script>

<section>
  <h1>Magnetometer</h1>

  <Gauge value={latest?.total ?? null} min={0} max={100} unit="µT" label="Total field strength" />

  <dl class="axes">
    {#each [['X', latest?.x], ['Y', latest?.y], ['Z', latest?.z]] as const as [axis, value] (axis)}
      <div>
        <dt>{axis}</dt>
        <dd>{value === undefined ? '–' : value.toFixed(2)}</dd>
      </div>
    {/each}
  </dl>

  <RecordControls
    {running}
    {recording}
    {count}
    onToggleRunning={() => (running = !running)}
    onToggleRecording={toggleRecording}
    onExport={exportRecording}
  />

  {#if exportError}
    <p class="error" role="alert">Export failed: {exportError}</p>
  {/if}

  <p class="note">
    Earth's field alone reads roughly 25 to 65 µT depending on where you are. Nearby steel, magnets
    and electronics push the reading up.
  </p>
</section>

<style>
  section {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  h1 {
    font-size: var(--text-xl);
    text-align: center;
  }

  .axes {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
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

  .note {
    color: var(--color-text-muted);
    font-size: var(--text-sm);
    line-height: 1.5;
  }

  .error {
    color: var(--color-danger);
    text-align: center;
  }
</style>

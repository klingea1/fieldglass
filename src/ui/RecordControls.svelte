<script lang="ts">
  interface Props {
    running: boolean;
    recording: boolean;
    count: number;
    onToggleRunning: () => void;
    onToggleRecording: () => void;
    onExport: () => void;
  }

  let { running, recording, count, onToggleRunning, onToggleRecording, onExport }: Props = $props();
</script>

<div class="controls">
  <button onclick={onToggleRunning}>{running ? 'Pause' : 'Resume'}</button>
  <button class:recording onclick={onToggleRecording} disabled={!running && !recording}>
    {recording ? 'Stop' : 'Record'}
  </button>
  <button onclick={onExport} disabled={recording || count === 0}>Export CSV</button>
</div>
<p class="count" aria-live="polite">
  {#if recording}
    Recording, {count} samples
  {:else if count > 0}
    {count} samples ready to export
  {:else}
    Not recording
  {/if}
</p>

<style>
  .controls {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-2);
  }

  button {
    min-height: var(--tap-min);
    padding: var(--space-2);
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

  .recording {
    background: var(--color-danger);
  }

  .count {
    margin-top: var(--space-2);
    color: var(--color-text-muted);
    font-size: var(--text-sm);
    text-align: center;
  }
</style>

<script lang="ts">
  let { level, label }: { level: number; label: string } = $props();
</script>

<div
  class="bar"
  role="meter"
  aria-label={label}
  aria-valuemin={0}
  aria-valuemax={100}
  aria-valuenow={Math.round(level * 100)}
>
  <div class="fill" style:transform="scaleX({level})"></div>
</div>

<style>
  .bar {
    height: 20px;
    background: var(--color-surface-raised);
    border-radius: 10px;
    overflow: hidden;
  }

  .fill {
    height: 100%;
    background: var(--color-signal);
    border-radius: 10px;
    transform-origin: left center;
    transition: transform 60ms linear;
    filter: drop-shadow(0 0 6px var(--color-glow));
  }
</style>

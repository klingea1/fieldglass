<script lang="ts">
  import { sensors } from '../core/sensors';
  import Home from './Home.svelte';
  import { navigate, route } from './router.svelte';
  import { findTool } from './tools';

  const tool = $derived(findTool(route.path));
</script>

<header>
  <button class="brand" onclick={() => navigate('')} aria-label="fieldglass home">
    <img src="/fieldglass.png" alt="" />
    <span>fieldglass</span>
  </button>
  {#if sensors.simulated}
    <span class="badge" title="Readings are generated, not from real sensors">Simulated data</span>
  {/if}
</header>

<main>
  {#if tool?.load}
    {#await tool.load()}
      <p class="status">Loading…</p>
    {:then module}
      <module.default />
    {:catch error}
      <p class="status">Could not open {tool.name}: {error.message}</p>
    {/await}
  {:else}
    <Home />
  {/if}
</main>

<style>
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    padding: var(--space-2) var(--space-4);
    background: var(--color-bg-deep);
  }

  .brand {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    min-height: var(--tap-min);
    background: none;
    border: none;
    font-size: var(--text-lg);
    cursor: pointer;
  }

  .brand img {
    width: 40px;
    height: 40px;
  }

  .badge {
    padding: var(--space-1) var(--space-2);
    border: 1px solid var(--color-warning);
    border-radius: var(--radius-sm);
    color: var(--color-warning);
    font-size: var(--text-sm);
    white-space: nowrap;
  }

  main {
    padding: var(--space-4);
    max-width: 640px;
    margin: 0 auto;
  }

  .status {
    color: var(--color-text-muted);
    text-align: center;
    padding: var(--space-8);
  }
</style>

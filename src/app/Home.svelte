<script lang="ts">
  import { navigate } from './router.svelte';
  import { TOOLS } from './tools';
</script>

<ul>
  {#each TOOLS as tool (tool.id)}
    <li>
      <button disabled={!tool.load} onclick={() => navigate(tool.id)}>
        <span class="name">{tool.name}</span>
        <span class="summary">{tool.load ? tool.summary : 'Coming soon'}</span>
      </button>
    </li>
  {/each}
</ul>

<style>
  ul {
    list-style: none;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: var(--space-3);
  }

  button {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    width: 100%;
    height: 100%;
    min-height: 96px;
    padding: var(--space-4);
    text-align: left;
    background: var(--color-surface);
    border: 1px solid var(--color-surface-raised);
    border-radius: var(--radius-md);
    cursor: pointer;
  }

  button:not(:disabled):active {
    background: var(--color-surface-raised);
  }

  button:disabled {
    opacity: 0.45;
    cursor: default;
  }

  .name {
    font-weight: 600;
  }

  .summary {
    color: var(--color-text-muted);
    font-size: var(--text-sm);
  }
</style>

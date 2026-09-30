/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  server: {
    // Reachable from the phone on the same network for live reload.
    host: true,
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});

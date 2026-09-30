<script lang="ts">
  import type { TraceBuffer } from '../core/processing/trace';

  interface Props {
    trace: TraceBuffer;
    /** The trace spans -range to +range. */
    range: number;
    label: string;
  }

  let { trace, range, label }: Props = $props();
  let canvas: HTMLCanvasElement;

  /** Reads a design token so the canvas follows the theme. */
  function token(name: string): string {
    return getComputedStyle(canvas).getPropertyValue(name).trim();
  }

  function draw() {
    const context = canvas.getContext('2d');
    if (!context) return;
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (canvas.width !== width * ratio || canvas.height !== height * ratio) {
      canvas.width = width * ratio;
      canvas.height = height * ratio;
    }
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);

    const pad = 6;
    const y = (value: number) =>
      height / 2 - (Math.max(-range, Math.min(range, value)) / range) * (height / 2 - pad);

    // Recessive guides: zero line, and full-scale lines above and below.
    context.lineWidth = 1;
    context.strokeStyle = token('--color-surface-raised');
    context.setLineDash([4, 4]);
    for (const value of [range, -range]) {
      context.beginPath();
      context.moveTo(0, y(value));
      context.lineTo(width, y(value));
      context.stroke();
    }
    context.setLineDash([]);
    context.strokeStyle = token('--color-text-muted');
    context.beginPath();
    context.moveTo(0, y(0));
    context.lineTo(width, y(0));
    context.stroke();

    const samples = trace.items;
    const end = trace.latest?.t;
    if (end === undefined) return;
    const x = (t: number) => width - ((end - t) / trace.windowMs) * width;

    context.lineWidth = 2;
    context.lineJoin = 'round';
    context.strokeStyle = token('--color-signal');
    context.beginPath();
    samples.forEach((sample, i) => {
      if (i === 0) context.moveTo(x(sample.t), y(sample.value));
      else context.lineTo(x(sample.t), y(sample.value));
    });
    context.stroke();
  }

  $effect(() => {
    let frame = requestAnimationFrame(function loop() {
      draw();
      frame = requestAnimationFrame(loop);
    });
    return () => cancelAnimationFrame(frame);
  });
</script>

<figure aria-label={label}>
  <canvas bind:this={canvas} aria-hidden="true"></canvas>
  <figcaption>
    <span>last {trace.windowMs / 1000} s</span>
    <span>±{range} µT</span>
  </figcaption>
</figure>

<style>
  canvas {
    display: block;
    width: 100%;
    height: 120px;
    background: var(--color-surface);
    border-radius: var(--radius-sm);
  }

  figcaption {
    display: flex;
    justify-content: space-between;
    margin-top: var(--space-1);
    color: var(--color-text-muted);
    font-size: var(--text-sm);
  }
</style>

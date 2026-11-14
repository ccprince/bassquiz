<script lang="ts">
  let { level, gate }: { level: number; gate: number } = $props()

  const MIN_DB = -70

  /** Position on the meter, 0–100, on a decibel scale. */
  function percent(value: number): number {
    if (value <= 0) return 0
    const db = 20 * Math.log10(value)
    return Math.max(0, Math.min(100, ((db - MIN_DB) / -MIN_DB) * 100))
  }
</script>

<div class="meter" role="meter" aria-label="Input level" aria-valuenow={percent(level)} aria-valuemin={0} aria-valuemax={100}>
  <div class="fill" class:open={level >= gate} style:width="{percent(level)}%"></div>
  <div class="gate" style:left="{percent(gate)}%"></div>
</div>

<style>
  .meter {
    position: relative;
    height: 0.75rem;
    border-radius: 0.375rem;
    background: var(--surface-2);
    overflow: hidden;
  }
  .fill {
    height: 100%;
    background: var(--muted);
  }
  .fill.open {
    background: var(--accent);
  }
  .gate {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    background: var(--text);
  }
</style>

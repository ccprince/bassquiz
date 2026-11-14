<script lang="ts">
  import type { Frame } from './lib/attack'
  import { noteName } from './lib/notes'

  let { frame, gate }: { frame: Frame | null; gate: number } = $props()

  const text = $derived.by(() => {
    if (!frame || frame.midi === null || frame.level < gate) return '—'
    const midi = Math.round(frame.midi)
    const cents = Math.round((frame.midi - midi) * 100)
    const sign = cents > 0 ? '+' : cents < 0 ? '−' : '±'
    return `${noteName(midi)} (${sign}${Math.abs(cents)}¢)`
  })
</script>

<span class="heard">{text}</span>

<style>
  .heard {
    font-variant-numeric: tabular-nums;
  }
</style>

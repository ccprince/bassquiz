<script lang="ts">
  import { type BassString, STANDARD_TUNING } from './lib/notes'
  import { MARKED_FRETS } from './lib/prompts'
  import { MAX_FRET } from './lib/settings'

  /** Highlights `positions` (frets) on `string`. */
  let { string, positions, label }: { string: BassString; positions: number[]; label: string } = $props()

  const NUT_X = 44
  const FRET_W = 40
  const STRING_GAP = 24
  const TOP = 20
  // Highest string drawn at the top, as in tab.
  const strings = [...STANDARD_TUNING].reverse()
  const bottom = TOP + STRING_GAP * (strings.length - 1)
  const width = NUT_X + FRET_W * MAX_FRET + 8
  const height = bottom + 34

  const fretX = (f: number) => NUT_X + f * FRET_W
  /** Where a note at fret `f` sits: just behind the fret wire, or left of the nut when open. */
  const noteX = (f: number) => (f === 0 ? NUT_X - 14 : fretX(f) - FRET_W / 2)
  const stringY = (s: BassString) => TOP + strings.findIndex((t) => t.name === s.name) * STRING_GAP
  const middle = (TOP + bottom) / 2
</script>

<svg viewBox="0 0 {width} {height}" role="img" aria-label={label}>
  {#each MARKED_FRETS as f (f)}
    {#if f === 12}
      <circle class="inlay" cx={noteX(f)} cy={middle - STRING_GAP} r="5" />
      <circle class="inlay" cx={noteX(f)} cy={middle + STRING_GAP} r="5" />
    {:else}
      <circle class="inlay" cx={noteX(f)} cy={middle} r="5" />
    {/if}
    <text class="fret-number" x={noteX(f)} y={height - 4}>{f}</text>
  {/each}

  <line class="nut" x1={NUT_X} x2={NUT_X} y1={TOP - 6} y2={bottom + 6} />
  {#each { length: MAX_FRET } as _, i (i)}
    <line class="fret" x1={fretX(i + 1)} x2={fretX(i + 1)} y1={TOP - 6} y2={bottom + 6} />
  {/each}

  {#each strings as s (s.name)}
    <line class="string" class:active={s.name === string.name} x1={NUT_X - 26} x2={width} y1={stringY(s)} y2={stringY(s)} />
    <text class="string-name" class:active={s.name === string.name} x="8" y={stringY(s) + 5}>{s.name}</text>
  {/each}

  {#each positions as f (f)}
    <circle class="note" cx={noteX(f)} cy={stringY(string)} r="10" />
  {/each}
</svg>

<style>
  svg {
    width: 100%;
    height: auto;
    display: block;
  }
  .inlay {
    fill: var(--surface-2);
  }
  .fret-number {
    fill: var(--muted);
    font-size: 13px;
    text-anchor: middle;
  }
  .nut {
    stroke: var(--text);
    stroke-width: 5;
  }
  .fret {
    stroke: var(--muted);
    stroke-width: 2;
  }
  .string {
    stroke: var(--muted);
    stroke-width: 2;
  }
  .string.active {
    stroke: var(--text);
    stroke-width: 3;
  }
  .string-name {
    fill: var(--muted);
    font-size: 15px;
  }
  .string-name.active {
    fill: var(--text);
    font-weight: 700;
  }
  .note {
    fill: var(--accent);
  }
</style>

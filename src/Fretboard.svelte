<script lang="ts">
  import { type BassString, STANDARD_TUNING } from './lib/notes'
  import { MARKED_FRETS } from './lib/prompts'
  import type { Grade } from './lib/results'
  import { MAX_FRET } from './lib/settings'

  export interface Dot {
    fret: number
    /** Which note it stands for; dots sharing a key are selected together. */
    key?: string
    /** Colours the dot; defaults to the accent colour. */
    grade?: Grade
    title?: string
  }

  interface Props {
    /** The string the dots are on. */
    string: BassString
    dots: Dot[]
    label: string
    selected?: string | null
    /** Makes the dots buttons. */
    onselect?: (key: string) => void
    /** The frets drawn; drawing less than the whole neck numbers every fret. */
    first?: number
    last?: number
  }

  let { string, dots, label, selected = null, onselect, first = 0, last = MAX_FRET }: Props = $props()

  const NUT_X = 44
  const FRET_W = 40
  const STRING_GAP = 24
  const TOP = 20
  // Highest string drawn at the top, as in tab.
  const strings = [...STANDARD_TUNING].reverse()
  const bottom = TOP + STRING_GAP * (strings.length - 1)
  const height = bottom + 34

  // The wire at the left edge: the nut, or the wire behind the first fret drawn.
  const edge = $derived(Math.max(first - 1, 0))
  const width = $derived(NUT_X + FRET_W * (last - edge) + 8)
  const wires = $derived(Array.from({ length: last - edge }, (_, i) => edge + i + 1))
  const inlays = $derived(MARKED_FRETS.filter((f) => f >= first && f <= last))
  const cropped = $derived(first > 0 || last < MAX_FRET)
  const numbered = $derived(cropped ? wires : MARKED_FRETS)

  const fretX = (f: number) => NUT_X + (f - edge) * FRET_W
  /** Where a note at fret `f` sits: just behind the fret wire, or left of the nut when open. */
  const noteX = (f: number) => (f === 0 ? NUT_X - 14 : fretX(f) - FRET_W / 2)
  const stringY = (s: BassString) => TOP + strings.findIndex((t) => t.name === s.name) * STRING_GAP
  const middle = (TOP + bottom) / 2
</script>

<svg viewBox="0 0 {width} {height}" role="img" aria-label={label}>
  {#each inlays as f (f)}
    {#if f === 12}
      <circle class="inlay" cx={noteX(f)} cy={middle - STRING_GAP} r="5" />
      <circle class="inlay" cx={noteX(f)} cy={middle + STRING_GAP} r="5" />
    {:else}
      <circle class="inlay" cx={noteX(f)} cy={middle} r="5" />
    {/if}
  {/each}
  {#each numbered as f (f)}
    <text class="fret-number" x={noteX(f)} y={height - 4}>{f}</text>
  {/each}

  <line class={edge === 0 ? 'nut' : 'fret'} x1={NUT_X} x2={NUT_X} y1={TOP - 6} y2={bottom + 6} />
  {#each wires as f (f)}
    <line class="fret" x1={fretX(f)} x2={fretX(f)} y1={TOP - 6} y2={bottom + 6} />
  {/each}

  {#each strings as s (s.name)}
    <line class="string" class:active={s.name === string.name} x1={NUT_X - 26} x2={width} y1={stringY(s)} y2={stringY(s)} />
    <text class="string-name" class:active={s.name === string.name} x="8" y={stringY(s) + 5}>{s.name}</text>
  {/each}

  {#each dots as d (d.fret)}
    {#if onselect && d.key}
      {@const key = d.key}
      <g
        class="dot {d.grade}"
        class:selected={selected === key}
        role="button"
        tabindex="0"
        aria-label={d.title}
        aria-pressed={selected === key}
        onclick={() => onselect(key)}
        onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onselect(key))}
      >
        <title>{d.title}</title>
        <circle class="hit" cx={noteX(d.fret)} cy={stringY(string)} r="16" />
        <circle class="note" cx={noteX(d.fret)} cy={stringY(string)} r="10" />
      </g>
    {:else}
      <circle class="note dot {d.grade}" cx={noteX(d.fret)} cy={stringY(string)} r="10">
        {#if d.title}<title>{d.title}</title>{/if}
      </circle>
    {/if}
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
  .dot .note,
  .note.dot {
    stroke: var(--surface);
    stroke-width: 2;
  }
  .never .note,
  .note.never {
    fill: var(--correct);
  }
  .sometimes .note,
  .note.sometimes {
    fill: var(--sometimes);
  }
  .always .note,
  .note.always {
    fill: var(--wrong);
  }
  .unasked .note,
  .note.unasked {
    fill: var(--surface);
    stroke: var(--muted);
    stroke-dasharray: 3 3;
  }
  g[role='button'] {
    cursor: pointer;
    outline: none;
  }
  .hit {
    fill: transparent;
  }
  .selected .note,
  g[role='button']:focus-visible .note {
    stroke: var(--text);
    stroke-width: 3;
  }
</style>

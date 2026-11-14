<script lang="ts">
  import { type FinishedDrill, type Grade, byNote, roundsReached, summarize, toWorkOn } from './lib/results'
  import Fretboard, { type Dot } from './Fretboard.svelte'

  interface Props extends FinishedDrill {
    onagain: () => void
    ondone: () => void
  }

  let { results, options, dealt, durationMs, onagain, ondone }: Props = $props()

  const GRADES: { grade: Grade; label: string }[] = [
    { grade: 'never', label: 'Never missed' },
    { grade: 'sometimes', label: 'Sometimes missed' },
    { grade: 'always', label: 'Always missed' },
    { grade: 'unasked', label: 'Not asked' },
  ]
  const gradeLabel = (g: Grade) => GRADES.find((x) => x.grade === g)?.label

  const reached = $derived(roundsReached({ results, options, dealt, durationMs }))
  const summary = $derived(summarize(results))
  const notes = $derived(byNote(results, options))
  const workOn = $derived(toWorkOn(notes))
  const dots: Dot[] = $derived(
    notes.flatMap((n) =>
      n.frets.map((fret) => ({
        fret,
        key: n.name,
        grade: n.grade,
        title: n.asked ? `${n.name}: right first time ${n.asked - n.missed} of ${n.asked}` : `${n.name}: not asked`,
      })),
    ),
  )

  let selected: string | null = $state(null)
  const note = $derived(notes.find((n) => n.name === selected))

  const seconds = (ms: number | null) => (ms === null ? '–' : `${(ms / 1000).toFixed(1)}s`)
  function clock(ms: number) {
    const s = Math.round(ms / 1000)
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  }
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
  const string = $derived(options.string)
</script>

<div class="screen">
  <h1>Drill finished</h1>
  {#if reached}
    <p class="muted rounds">
      {reached.complete ? `${plural(reached.of, 'round')} complete` : `Stopped during round ${reached.round} of ${reached.of}`}
    </p>
  {/if}

  <div class="tiles">
    <div class="tile hero">
      <div class="value">{Math.round(summary.firstTime * 100)}%</div>
      <div class="label">right first time · {summary.answered - summary.missed} of {summary.answered}</div>
    </div>
    <div class="tile"><div class="value">{summary.answered}</div><div class="label">notes played</div></div>
    <div class="tile"><div class="value">{seconds(summary.medianMs)}</div><div class="label">typical time</div></div>
    <div class="tile"><div class="value">{summary.bestStreak}</div><div class="label">best streak</div></div>
    <div class="tile"><div class="value">{clock(durationMs)}</div><div class="label">duration</div></div>
  </div>

  <section>
    <h2>{string.name} string</h2>
    <Fretboard
      {string}
      {dots}
      {selected}
      onselect={(key) => (selected = selected === key ? null : key)}
      label="How often each note was missed on the {string.name} string"
    />
    <ul class="legend">
      {#each GRADES as { grade, label } (grade)}
        <li><span class="swatch {grade}"></span>{label}</li>
      {/each}
    </ul>

    {#if note}
      <div class="detail {note.grade}" aria-live="polite">
        <div class="name">{note.name}</div>
        <div class="muted">{gradeLabel(note.grade)}</div>
        {#if note.asked === 0}
          <p class="muted small">Not asked this drill. {note.frets.length > 1 ? 'Frets' : 'Fret'} {note.frets.join(', ')}.</p>
        {:else}
          <dl>
            <div><dt>Right first time</dt><dd>{note.asked - note.missed} of {note.asked}</dd></div>
            <div><dt>Wrong notes</dt><dd>{note.wrong}</dd></div>
            <div><dt>Revealed</dt><dd>{note.revealed}</dd></div>
            <div><dt>Typical time</dt><dd>{seconds(note.medianMs)}</dd></div>
            <div><dt>Frets</dt><dd>{note.frets.join(', ')}</dd></div>
          </dl>
        {/if}
        {#if note.asked > 0 && note.spellings.length > 1}
          <p class="muted small">
            {#each note.spellings as s, i (s.spelling)}{i ? ' · ' : ''}{s.spelling}: missed {s.missed} of {s.asked}{/each}
          </p>
        {/if}
      </div>
    {:else}
      <p class="muted small">Tap a note for details.</p>
    {/if}
  </section>

  <section>
    <h2>Work on these</h2>
    {#if workOn.length === 0}
      <p>No misses.</p>
    {:else}
      <ul class="work-on">
        {#each workOn as s (s.spelling)}
          <li>
            <span class="spelling">{s.spelling}</span>
            <span class="bar"><span style="width: {(s.missed / s.asked) * 100}%"></span></span>
            <span class="muted small">missed {s.missed} of {s.asked}</span>
          </li>
        {/each}
      </ul>
    {/if}
    <p class="muted small">{plural(summary.wrong, 'wrong note')} · {plural(summary.revealed, 'reveal')}</p>
  </section>

  <div class="actions">
    <button class="secondary" onclick={ondone}>Settings</button>
    <button class="primary" onclick={onagain}>Drill again</button>
  </div>
</div>

<style>
  .rounds {
    margin: -1rem 0 1.5rem;
  }
  .tiles {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.75rem;
    margin-bottom: 1rem;
  }
  @media (max-width: 30rem) {
    .tiles {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  .tile {
    background: var(--surface);
    border-radius: 0.75rem;
    padding: 0.75rem 1rem;
  }
  .tile.hero {
    grid-column: 1 / -1;
  }
  .value {
    font-size: 1.75rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .hero .value {
    font-size: 3.5rem;
    line-height: 1.1;
  }
  .label {
    color: var(--muted);
    font-size: 0.85rem;
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem 1rem;
    list-style: none;
    padding: 0;
    margin: 0.5rem 0 0;
    font-size: 0.85rem;
    color: var(--muted);
  }
  .legend li {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }
  .swatch {
    width: 0.8rem;
    height: 0.8rem;
    border-radius: 50%;
  }
  .swatch.never {
    background: var(--correct);
  }
  .swatch.sometimes {
    background: var(--sometimes);
  }
  .swatch.always {
    background: var(--wrong);
  }
  .swatch.unasked {
    border: 1.5px dashed var(--muted);
  }
  .detail {
    margin-top: 1rem;
    padding-left: 1rem;
    border-left: 6px solid var(--muted);
  }
  .detail.never {
    border-color: var(--correct);
  }
  .detail.sometimes {
    border-color: var(--sometimes);
  }
  .detail.always {
    border-color: var(--wrong);
  }
  .name {
    font-size: 2.5rem;
    font-weight: 700;
    line-height: 1;
  }
  dl {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr));
    gap: 0.5rem 1rem;
    margin: 0.75rem 0 0;
  }
  dt {
    color: var(--muted);
    font-size: 0.8rem;
  }
  dd {
    margin: 0;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
  .work-on {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .work-on li {
    display: grid;
    grid-template-columns: 3rem 1fr 8rem;
    align-items: center;
    gap: 0.75rem;
    padding: 0.3rem 0;
  }
  .spelling {
    font-weight: 700;
    font-size: 1.25rem;
  }
  .bar {
    height: 0.5rem;
    background: var(--surface-2);
    border-radius: 0.25rem;
    overflow: hidden;
  }
  .bar span {
    display: block;
    height: 100%;
    background: var(--wrong);
    border-radius: 0.25rem;
  }
  .actions {
    display: flex;
    gap: 0.75rem;
  }
  .actions .primary {
    flex: 1;
  }
</style>

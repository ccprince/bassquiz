<script lang="ts">
  import type { Frame } from './lib/attack'
  import { type Accidentals, STANDARD_TUNING } from './lib/notes'
  import { MAX_FRET, type Settings } from './lib/settings'
  import Heard from './Heard.svelte'
  import LevelMeter from './LevelMeter.svelte'

  interface Props {
    settings: Settings
    frame: Frame | null
    listening: boolean
    micError: string | null
    onlisten: () => void
    onstart: () => void
  }

  let { settings = $bindable(), frame, listening, micError, onlisten, onstart }: Props = $props()

  const ACCIDENTALS: { value: Accidentals; label: string }[] = [
    { value: 'sharps', label: '♯ Sharps' },
    { value: 'flats', label: '♭ Flats' },
    { value: 'both', label: 'Both' },
  ]

  const frets = Array.from({ length: MAX_FRET + 1 }, (_, f) => f)

  // Remember the span while "marked frets only" is on, so switching back restores it.
  let span = $state(
    settings.range.kind === 'span' ? { from: settings.range.from, to: settings.range.to } : { from: 0, to: MAX_FRET },
  )

  function setMarkedOnly(markedOnly: boolean) {
    settings.range = markedOnly ? { kind: 'marked' } : { kind: 'span', ...span }
  }

  function setSpan(from: number, to: number) {
    span = { from: Math.min(from, to), to: Math.max(from, to) }
    settings.range = { kind: 'span', ...span }
  }

  const gateDb = $derived(Math.round(20 * Math.log10(settings.gate)))
</script>

<div class="screen">
  <h1>Fretboard drill</h1>

  <section>
    <h2>String</h2>
    <div class="strings">
      {#each [...STANDARD_TUNING].reverse() as string (string.name)}
        <button
          class="toggle"
          aria-pressed={settings.activeString === string.name}
          onclick={() => (settings.activeString = string.name)}
        >
          {string.name}
        </button>
      {/each}
    </div>
  </section>

  <section>
    <h2>Frets</h2>
    <label class="check">
      <input
        type="checkbox"
        checked={settings.range.kind === 'marked'}
        onchange={(e) => setMarkedOnly(e.currentTarget.checked)}
      />
      Marked frets only <span class="muted">(3, 5, 7, 9, 12, 15, 17, 19, 21)</span>
    </label>
    {#if settings.range.kind === 'span'}
      <div class="span">
        <select
          aria-label="Lowest fret"
          value={span.from}
          onchange={(e) => setSpan(Number(e.currentTarget.value), span.to)}
        >
          {#each frets as f (f)}<option value={f}>{f === 0 ? 'Open' : `Fret ${f}`}</option>{/each}
        </select>
        <span>to</span>
        <select
          aria-label="Highest fret"
          value={span.to}
          onchange={(e) => setSpan(span.from, Number(e.currentTarget.value))}
        >
          {#each frets as f (f)}<option value={f}>{f === 0 ? 'Open' : `Fret ${f}`}</option>{/each}
        </select>
      </div>
    {/if}
  </section>

  <section>
    <h2>Accidentals</h2>
    <div class="choices">
      {#each ACCIDENTALS as choice (choice.value)}
        <button
          class="toggle"
          aria-pressed={settings.accidentals === choice.value}
          onclick={() => (settings.accidentals = choice.value)}
        >
          {choice.label}
        </button>
      {/each}
    </div>
  </section>

  <section>
    <h2>Input</h2>
    {#if listening}
      <LevelMeter level={frame?.level ?? 0} gate={settings.gate} />
      <p class="muted">Heard: <Heard {frame} gate={settings.gate} accidentals={settings.accidentals} /></p>
    {:else}
      <button class="secondary" onclick={onlisten}>Check input</button>
    {/if}
    <label class="gate">
      <span>Ignore sounds below <strong>{gateDb} dB</strong></span>
      <input
        type="range"
        min="-70"
        max="-10"
        step="1"
        value={gateDb}
        oninput={(e) => (settings.gate = Math.pow(10, Number(e.currentTarget.value) / 20))}
      />
    </label>
    <p class="muted small">
      Play a note and set this just above the meter's level when you're not playing. Raise it if room noise counts as
      notes; lower it if quiet notes are missed.
    </p>
    {#if micError}
      <p class="error">Couldn't open the microphone: {micError}</p>
    {/if}
  </section>

  <button class="primary" onclick={onstart}>Start drill</button>
</div>

<style>
  .strings,
  .choices {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .toggle {
    min-width: 3.5rem;
    font-size: 1.25rem;
    font-weight: 600;
  }
  .check {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .span {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.75rem;
  }
  .gate {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-top: 1rem;
  }
  .gate input {
    width: 100%;
  }
  .error {
    color: var(--wrong);
  }
  .primary {
    width: 100%;
    margin-top: 1rem;
  }
</style>

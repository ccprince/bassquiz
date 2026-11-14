<script lang="ts">
  import type { Frame } from './lib/attack'
  import { type Accidentals, STANDARD_TUNING } from './lib/notes'
  import { fretsIn, roundOf } from './lib/prompts'
  import { MAX_FRET, ROUND_CHOICES, type Settings } from './lib/settings'
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

  function setSpan(from: number, to: number) {
    settings.range = { ...settings.range, from: Math.min(from, to), to: Math.max(from, to) }
  }

  const noFrets = $derived(fretsIn(settings.range).length === 0)
  const roundSize = $derived(
    roundOf({
      string: STANDARD_TUNING.find((s) => s.name === settings.activeString) ?? STANDARD_TUNING[0],
      range: settings.range,
      accidentals: settings.accidentals,
    }).length,
  )

  const gateDb =$derived(Math.round(20 * Math.log10(settings.gate)))
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
    <div class="span">
      <select
        aria-label="Lowest fret"
        value={settings.range.from}
        onchange={(e) => setSpan(Number(e.currentTarget.value), settings.range.to)}
      >
        {#each frets as f (f)}<option value={f}>{f === 0 ? 'Open' : `Fret ${f}`}</option>{/each}
      </select>
      <span>to</span>
      <select
        aria-label="Highest fret"
        value={settings.range.to}
        onchange={(e) => setSpan(settings.range.from, Number(e.currentTarget.value))}
      >
        {#each frets as f (f)}<option value={f}>{f === 0 ? 'Open' : `Fret ${f}`}</option>{/each}
      </select>
    </div>
    <label class="check">
      <input type="checkbox" bind:checked={settings.range.markedOnly} />
      Marked frets only <span class="muted">(3, 5, 7, 9, 12, 15, 17, 19, 21, 24)</span>
    </label>
    {#if noFrets}
      <p class="error">There are no marked frets in this range.</p>
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
    <h2>Length</h2>
    <div class="choices">
      <button class="toggle" aria-pressed={settings.rounds === null} onclick={() => (settings.rounds = null)}>
        Open-ended
      </button>
      {#each ROUND_CHOICES as rounds (rounds)}
        <button class="toggle" aria-pressed={settings.rounds === rounds} onclick={() => (settings.rounds = rounds)}>
          {rounds}
        </button>
      {/each}
    </div>
    <p class="muted small">
      {#if settings.rounds === null}
        Drill until you stop.
      {:else}
        {settings.rounds} {settings.rounds === 1 ? 'round' : 'rounds'}. Each round asks all {roundSize} notes once;
        missed notes come back as extra prompts.
      {/if}
    </p>
  </section>

  <section>
    <h2>Sound</h2>
    <label class="check">
      <input type="checkbox" bind:checked={settings.spokenPrompts} />
      Spoken prompts
    </label>
    <p class="muted small">
      Hear each note named, and hear whether you got it right, so you can keep your eyes on the bass.
    </p>
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

  <button class="primary" disabled={noFrets} onclick={onstart}>Start drill</button>
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
    margin-bottom: 0.75rem;
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

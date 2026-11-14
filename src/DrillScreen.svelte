<script lang="ts">
  import { onMount, untrack } from 'svelte'
  import type { Answer, Frame } from './lib/attack'
  import { answer, next, reveal, start } from './lib/drill'
  import { STANDARD_TUNING, noteName } from './lib/notes'
  import { fretsIn, positionsOf } from './lib/prompts'
  import type { FinishedDrill } from './lib/results'
  import type { Settings } from './lib/settings'
  import Fretboard from './Fretboard.svelte'
  import Heard from './Heard.svelte'
  import LevelMeter from './LevelMeter.svelte'

  interface Props {
    settings: Settings
    frame: Frame | null
    onAnswer: (handler: (answer: Answer) => void) => () => void
    ignoreCurrent: () => void
    onstop: (drill: FinishedDrill) => void
  }

  let { settings, frame, onAnswer, ignoreCurrent, onstop }: Props = $props()

  const ADVANCE_MS = 1500

  // Settings can't change during a drill, so read them once.
  const options = untrack(() => ({
    string: STANDARD_TUNING.find((s) => s.name === settings.activeString) ?? STANDARD_TUNING[0],
    range: settings.range,
    accidentals: settings.accidentals,
  }))

  const startedAt = performance.now()
  let drill = $state(start(options, Math.random, startedAt))
  let advanceTimer: ReturnType<typeof setTimeout> | undefined

  const positions = $derived(positionsOf(drill.prompt.pitchClass, drill.prompt.string, fretsIn(options.range)))
  const showFretboard = $derived(drill.status === 'correct' || drill.status === 'revealed')

  onMount(() => {
    ignoreCurrent()
    const unsubscribe = onAnswer((heard) => {
      if (drill.status === 'correct') return
      drill = answer(drill, heard, performance.now())
      if (drill.status === 'correct') advanceTimer = setTimeout(advance, ADVANCE_MS)
    })
    return () => {
      unsubscribe()
      clearTimeout(advanceTimer)
    }
  })

  function stop() {
    onstop({ results: drill.results, options, durationMs: performance.now() - startedAt })
  }

  function advance() {
    drill = next(drill, options, Math.random, performance.now())
    ignoreCurrent()
  }
</script>

<div class="screen drill">
  <header>
    <button class="secondary" onclick={stop}>Stop</button>
    <div class="input">
      <LevelMeter level={frame?.level ?? 0} gate={settings.gate} />
      <span class="muted small">Heard: <Heard {frame} gate={settings.gate} accidentals={options.accidentals} /></span>
    </div>
  </header>

  <div class="prompt" aria-live="polite">
    <div class="note">{drill.prompt.spelling}</div>
    <div class="where">on the {drill.prompt.string.name} string</div>
  </div>

  <div class="feedback {drill.status}" aria-live="polite">
    {#if drill.status === 'correct'}
      ✓ Correct
    {:else if drill.heard}
      ✗ You played {noteName(drill.heard.midi, options.accidentals)}
    {:else if drill.status === 'revealed'}
      Play it to continue
    {:else}
      &nbsp;
    {/if}
  </div>

  <div class="board" class:visible={showFretboard}>
    {#if showFretboard}
      <Fretboard
        string={drill.prompt.string}
        dots={positions.map((fret) => ({ fret }))}
        label="{drill.prompt.spelling} on the {drill.prompt.string.name} string is at fret {positions.join(' and ')}"
      />
    {/if}
  </div>

  <button class="secondary reveal" onclick={() => (drill = reveal(drill))} disabled={drill.status !== 'waiting' && drill.status !== 'wrong'}>
    Reveal
  </button>
</div>

<style>
  .drill {
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
  }
  header {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  .input {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .prompt {
    text-align: center;
    margin-top: 2rem;
  }
  .note {
    font-size: clamp(6rem, 30vw, 14rem);
    font-weight: 700;
    line-height: 1;
  }
  .where {
    font-size: clamp(1.5rem, 6vw, 2.5rem);
    color: var(--muted);
  }
  .feedback {
    text-align: center;
    font-size: clamp(1.5rem, 6vw, 2.25rem);
    font-weight: 600;
    margin-top: 1.5rem;
    min-height: 1.5em;
  }
  .feedback.correct {
    color: var(--correct);
  }
  .feedback.wrong,
  .feedback.revealed {
    color: var(--wrong);
  }
  .board {
    margin-top: 1.5rem;
    min-height: 7rem;
  }
  .reveal {
    align-self: center;
    margin-top: auto;
  }
</style>

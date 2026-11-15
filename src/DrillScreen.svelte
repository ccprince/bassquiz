<script lang="ts">
  import { onMount, untrack } from 'svelte'
  import type { Answer, Frame } from './lib/attack'
  import { answer, isFinished, next, reveal, start, totalDealt } from './lib/drill'
  import { STANDARD_TUNING, noteName } from './lib/notes'
  import { fretOf, fretsIn } from './lib/prompts'
  import type { FinishedDrill } from './lib/results'
  import type { Settings } from './lib/settings'
  import type { Shortcut } from './lib/shortcuts'
  import { spokenPrompt, spokenReveal, spokenWrong } from './lib/spoken'
  import { CORRECT_CHIME, FINISHED_CHIME, Voice } from './lib/voice'
  import Fretboard from './Fretboard.svelte'
  import Heard from './Heard.svelte'
  import LevelMeter from './LevelMeter.svelte'
  import Shortcuts from './Shortcuts.svelte'

  interface Props {
    settings: Settings
    frame: Frame | null
    onAnswer: (handler: (answer: Answer) => void) => () => void
    ignoreCurrent: () => void
    /** Holds back answers while the app's own sound reaches the mic. */
    pauseAnswers: () => void
    resumeAnswers: () => void
    onstop: (drill: FinishedDrill) => void
  }

  let { settings, frame, onAnswer, ignoreCurrent, pauseAnswers, resumeAnswers, onstop }: Props = $props()

  const ADVANCE_MS = 1500

  // Settings can't change during a drill, so read them once.
  const options = untrack(() => ({
    string: STANDARD_TUNING.find((s) => s.name === settings.activeString) ?? STANDARD_TUNING[0],
    octave: settings.octave,
    accidentals: settings.accidentals,
    rounds: settings.rounds,
  }))
  const total = totalDealt(options)
  const rounds = options.rounds
  // Where one round ends and the next begins, as fractions of the whole drill.
  const ticks = rounds ? Array.from({ length: rounds - 1 }, (_, i) => (i + 1) / rounds) : []

  const startedAt = performance.now()
  let drill = $state(start(options, Math.random, startedAt))
  let advanceTimer: ReturnType<typeof setTimeout> | undefined
  const voice = untrack(() => settings.spokenPrompts)
    ? new Voice(
        () => pauseAnswers(),
        () => resumeAnswers(),
      )
    : null

  const fret = $derived(fretOf(drill.prompt.pitchClass, drill.prompt.string, fretsIn(options.octave)) as number)
  const showFretboard = $derived(drill.status === 'correct' || drill.status === 'revealed')
  const canReveal = $derived(drill.status === 'waiting' || drill.status === 'wrong')

  onMount(() => {
    ignoreCurrent()
    voice?.say(spokenPrompt(drill.prompt))
    const unsubscribe = onAnswer((heard) => {
      if (drill.status === 'correct') return
      const prompt = drill.prompt
      drill = answer(drill, heard, performance.now())
      if (drill.status === 'correct') {
        const finished = isFinished(drill, options)
        voice?.chime(finished ? FINISHED_CHIME : CORRECT_CHIME)
        advanceTimer = setTimeout(finished ? stop : advance, ADVANCE_MS)
      } else {
        voice?.say(spokenWrong(heard.midi, prompt, options.accidentals))
      }
    })
    return () => {
      unsubscribe()
      clearTimeout(advanceTimer)
      voice?.close()
    }
  })

  function stop() {
    onstop({ results: drill.results, options, dealt: drill.dealt, durationMs: performance.now() - startedAt })
  }

  function advance() {
    drill = next(drill, options, Math.random, performance.now())
    ignoreCurrent()
    voice?.say(spokenPrompt(drill.prompt))
  }

  function showReveal() {
    drill = reveal(drill)
    voice?.say(spokenReveal(fret))
  }

  function repeat() {
    if (drill.status !== 'correct') voice?.say(spokenPrompt(drill.prompt))
  }

  const shortcuts: Shortcut[] = [
    { keys: ['Escape'], does: 'Stop the drill', run: stop },
    { keys: [' '], does: 'Reveal the note', run: () => canReveal && showReveal() },
    ...(voice ? [{ keys: ['r'], does: 'Say the prompt again', run: repeat }] : []),
  ]
</script>

<Shortcuts {shortcuts} />

<div class="screen drill">
  <header>
    <button class="secondary" onclick={stop} aria-keyshortcuts="Escape">Stop<kbd class="hint">Esc</kbd></button>
    <div class="input">
      <LevelMeter level={frame?.level ?? 0} gate={settings.gate} />
      <span class="muted small">Heard: <Heard {frame} gate={settings.gate} accidentals={options.accidentals} /></span>
    </div>
  </header>

  {#if total}
    <div
      class="progress"
      role="progressbar"
      aria-label="Drill progress"
      aria-valuemin="0"
      aria-valuemax={total}
      aria-valuenow={drill.earned}
    >
      <span class="fill" style="width: {(drill.earned / total) * 100}%"></span>
      {#each ticks as at (at)}<span class="tick" style="left: {at * 100}%"></span>{/each}
    </div>
  {/if}

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
        dots={[{ fret }]}
        label="{drill.prompt.spelling} on the {drill.prompt.string.name} string is at fret {fret}"
      />
    {/if}
  </div>

  <button class="secondary reveal" onclick={showReveal} disabled={!canReveal} aria-keyshortcuts="Space">
    Reveal<kbd class="hint">Space</kbd>
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
  .progress {
    position: relative;
    height: 0.5rem;
    margin-top: 1rem;
    background: var(--surface-2);
    border-radius: 0.25rem;
    overflow: hidden;
  }
  .fill {
    display: block;
    height: 100%;
    background: var(--accent);
    transition: width 0.3s ease;
  }
  .tick {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    margin-left: -1px;
    background: var(--bg);
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

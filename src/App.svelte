<script lang="ts">
  import { type Answer, AttackDetector, type Frame } from './lib/attack'
  import { type Listener, listen } from './lib/listener'
  import { encodeWav } from './lib/recording'
  import type { FinishedDrill } from './lib/results'
  import { loadSettings, saveSettings } from './lib/settings'
  import DrillScreen from './DrillScreen.svelte'
  import ResultsScreen from './ResultsScreen.svelte'
  import SettingsScreen from './SettingsScreen.svelte'

  function browserStorage() {
    try {
      return window.localStorage
    } catch {
      return { getItem: () => null, setItem: () => {} }
    }
  }

  const storage = browserStorage()
  let settings = $state(loadSettings(storage))
  $effect(() => saveSettings(storage, $state.snapshot(settings)))

  let screen: 'settings' | 'drill' | 'results' = $state('settings')
  let finished: FinishedDrill | null = $state(null)
  let frame: Frame | null = $state(null)
  let listening = $state(false)
  let micError: string | null = $state(null)

  let listener: Listener | null = null
  const detector = new AttackDetector({ gate: loadSettings(storage).gate })
  $effect(() => {
    detector.gate = settings.gate
  })
  let answerHandler: ((answer: Answer) => void) | null = null

  async function startListening(): Promise<boolean> {
    if (listener) return true
    try {
      listener = await listen((f) => {
        frame = f
        const answer = detector.feed(f)
        if (answer) answerHandler?.(answer)
      })
      listening = true
      micError = null
      return true
    } catch (e) {
      micError = e instanceof Error ? e.message : String(e)
      return false
    }
  }

  /** `?debug` in the URL offers saving the mic input, to study what the pitch tracker heard. */
  const debug = new URLSearchParams(window.location.search).has('debug')

  function saveRecording() {
    if (!listener) return
    const { samples, sampleRate } = listener.recent()
    const url = URL.createObjectURL(new Blob([encodeWav(samples, sampleRate)], { type: 'audio/wav' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `bassquiz-${new Date().toISOString().replace(/[:.]/g, '-')}.wav`
    link.click()
    URL.revokeObjectURL(url)
  }

  async function startDrill() {
    if (await startListening()) screen = 'drill'
  }

  function stopDrill(drill: FinishedDrill) {
    finished = drill
    screen = drill.results.length ? 'results' : 'settings'
  }

  function onAnswer(handler: (answer: Answer) => void) {
    answerHandler = handler
    return () => {
      if (answerHandler === handler) answerHandler = null
    }
  }
</script>

<main>
  {#if screen === 'settings'}
    <SettingsScreen
      bind:settings
      {frame}
      {listening}
      {micError}
      onlisten={startListening}
      onsave={debug ? saveRecording : null}
      onstart={startDrill}
    />
  {:else if screen === 'results' && finished}
    <ResultsScreen
      {...finished}
      onagain={startDrill}
      ondone={() => (screen = 'settings')}
    />
  {:else}
    <DrillScreen
      {settings}
      {frame}
      {onAnswer}
      ignoreCurrent={() => detector.ignoreCurrent()}
      pauseAnswers={() => detector.pause()}
      resumeAnswers={() => detector.resume()}
      onstop={stopDrill}
    />
  {/if}
</main>

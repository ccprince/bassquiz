<script lang="ts">
  import { type Answer, AttackDetector, type Frame } from './lib/attack'
  import { type Listener, listen } from './lib/listener'
  import { loadSettings, saveSettings } from './lib/settings'
  import DrillScreen from './DrillScreen.svelte'
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

  let screen: 'settings' | 'drill' = $state('settings')
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

  async function startDrill() {
    if (await startListening()) screen = 'drill'
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
    <SettingsScreen bind:settings {frame} {listening} {micError} onlisten={startListening} onstart={startDrill} />
  {:else}
    <DrillScreen
      {settings}
      {frame}
      {onAnswer}
      ignoreCurrent={() => detector.ignoreCurrent()}
      onstop={() => (screen = 'settings')}
    />
  {/if}
</main>

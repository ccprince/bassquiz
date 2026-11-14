/** Frequencies of a chime's tones, played in turn; high above the bass so they're easy to tell apart. */
export const CORRECT_CHIME: readonly number[] = [1318.5] // E6
export const FINISHED_CHIME: readonly number[] = [1046.5, 1318.5, 1568] // C6 E6 G6

const TONE_GAP_S = 0.12
const TONE_RING_S = 0.4
/**
 * Room echo after the app falls silent, which the mic may still pick up. Kept short: a stray pitch in the
 * echo would need to hold steady to be an answer.
 */
const TAIL_MS = 50
/** In case a browser never reports that speech ended, so the drill can't get stuck waiting. */
const SPEECH_TIMEOUT_MS = 6000

export function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'AudioContext' in window
}

/**
 * Says spoken prompts and plays chimes, one sound at a time: a new one cuts off the last. The mic hears all
 * of it, so `onLoud` is called when the app starts making sound, and `onQuiet` once it and its echo have died
 * away.
 */
export class Voice {
  private sounding = false

  private generation = 0
  private context: AudioContext | null = null
  private oscillators: OscillatorNode[] = []
  private utterance: SpeechSynthesisUtterance | null = null
  private timers: ReturnType<typeof setTimeout>[] = []

  constructor(
    private readonly onLoud: () => void,
    private readonly onQuiet: () => void,
  ) {}

  say(text: string): void {
    const generation = this.begin()
    // Kept on `this` because some browsers drop events for an utterance that's been garbage collected.
    const utterance = (this.utterance = new SpeechSynthesisUtterance(text))
    const voice = englishVoice()
    if (voice) utterance.voice = voice
    utterance.onend = utterance.onerror = () => this.end(generation)
    this.timers.push(setTimeout(() => this.end(generation), SPEECH_TIMEOUT_MS))
    speechSynthesis.speak(utterance)
  }

  chime(tones: readonly number[]): void {
    const generation = this.begin()
    this.context ??= new AudioContext()
    const context = this.context
    void context.resume()
    const start = context.currentTime + 0.02
    tones.forEach((hz, i) => {
      const at = start + i * TONE_GAP_S
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.frequency.value = hz
      gain.gain.setValueAtTime(0, at)
      gain.gain.linearRampToValueAtTime(0.3, at + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.001, at + TONE_RING_S)
      oscillator.connect(gain).connect(context.destination)
      oscillator.start(at)
      oscillator.stop(at + TONE_RING_S)
      this.oscillators.push(oscillator)
    })
    const lengthMs = ((tones.length - 1) * TONE_GAP_S + TONE_RING_S + 0.02) * 1000
    this.timers.push(setTimeout(() => this.end(generation), lengthMs))
  }

  /** Silences everything for good. */
  close(): void {
    this.silence()
    this.generation++
    if (this.sounding) this.quiet()
    void this.context?.close()
    this.context = null
  }

  private begin(): number {
    this.silence()
    if (!this.sounding) {
      this.sounding = true
      this.onLoud()
    }
    return ++this.generation
  }

  private end(generation: number): void {
    if (generation !== this.generation) return
    this.generation++
    this.timers.forEach(clearTimeout)
    this.timers = [setTimeout(() => this.quiet(), TAIL_MS)]
  }

  private quiet(): void {
    this.sounding = false
    this.onQuiet()
  }

  private silence(): void {
    speechSynthesis.cancel()
    this.utterance = null
    this.oscillators.forEach((o) => o.stop())
    this.oscillators = []
    this.timers.forEach(clearTimeout)
    this.timers = []
  }
}

/** The default voice, unless it isn't English, then the first English one. Null leaves it to the browser. */
function englishVoice(): SpeechSynthesisVoice | null {
  const voices = speechSynthesis.getVoices()
  const fallback = voices.find((v) => v.default)
  if (!fallback || fallback.lang.startsWith('en')) return null
  return voices.find((v) => v.lang.startsWith('en')) ?? null
}

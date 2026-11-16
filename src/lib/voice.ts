import { clipFile, everyPhrase } from './spoken'

/** Frequencies of a chime's tones, played in turn; high above the bass so they're easy to tell apart. */
export const CORRECT_CHIME: readonly number[] = [1318.5] // E6
export const FINISHED_CHIME: readonly number[] = [1046.5, 1318.5, 1568] // C6 E6 G6

const TONE_GAP_S = 0.12
const TONE_RING_S = 0.4
/** A chime starts this far ahead, so its first tone isn't clipped. */
const CHIME_LEAD_S = 0.02
/** How long a chime lasts, from being asked for until answers resume. */
export function chimeMs(tones: readonly number[]): number {
  return (CHIME_LEAD_S + (tones.length - 1) * TONE_GAP_S + TONE_RING_S) * 1000 + TAIL_MS
}

/**
 * How long after the app falls silent before answers resume: long enough for the pitch tracker's buffer
 * (about 85 ms) to hold only what was played since, as a note held steady through the speech is answered on
 * the very next frame.
 */
const TAIL_MS = 100

/**
 * Says spoken prompts, from recordings in public/clips, and plays chimes, one sound at a time: a new one cuts
 * off the last. The mic hears all of it, so `onLoud` is called when the app starts making sound, and `onQuiet`
 * once it and its echo have died away.
 */
export class Voice {
  private sounding = false

  private generation = 0
  private readonly context = new AudioContext()
  /** Every recording, loaded up front so none has to wait to download. */
  private readonly clips = loadClips(this.context)
  private playing: AudioScheduledSourceNode[] = []
  private tail: ReturnType<typeof setTimeout> | undefined

  constructor(
    private readonly onLoud: () => void,
    private readonly onQuiet: () => void,
  ) {}

  say(phrase: string): void {
    const generation = this.begin()
    void this.clips.then((clips) => {
      if (generation !== this.generation) return
      const clip = clips.get(phrase)
      if (!clip) {
        console.warn(`No recording of "${phrase}"`)
        this.end(generation)
        return
      }
      const source = this.context.createBufferSource()
      source.buffer = clip
      source.connect(this.context.destination)
      source.start()
      this.play([source], generation)
    })
  }

  chime(tones: readonly number[]): void {
    const generation = this.begin()
    const start = this.context.currentTime + CHIME_LEAD_S
    const oscillators = tones.map((hz, i) => {
      const at = start + i * TONE_GAP_S
      const oscillator = this.context.createOscillator()
      const gain = this.context.createGain()
      oscillator.frequency.value = hz
      gain.gain.setValueAtTime(0, at)
      gain.gain.linearRampToValueAtTime(0.3, at + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.001, at + TONE_RING_S)
      oscillator.connect(gain).connect(this.context.destination)
      oscillator.start(at)
      oscillator.stop(at + TONE_RING_S)
      return oscillator
    })
    this.play(oscillators, generation)
  }

  /** Silences everything for good. */
  close(): void {
    this.silence()
    this.generation++
    if (this.sounding) this.quiet()
    void this.context.close()
  }

  /** Tracks sound already started or scheduled; the last node to finish ends it. */
  private play(nodes: AudioScheduledSourceNode[], generation: number): void {
    void this.context.resume()
    this.playing = nodes
    nodes[nodes.length - 1].onended = () => this.end(generation)
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
    this.tail = setTimeout(() => this.quiet(), TAIL_MS)
  }

  private quiet(): void {
    this.sounding = false
    this.onQuiet()
  }

  private silence(): void {
    this.playing.forEach((node) => node.stop())
    this.playing = []
    clearTimeout(this.tail)
  }
}

async function loadClips(context: AudioContext): Promise<Map<string, AudioBuffer>> {
  const clips = new Map<string, AudioBuffer>()
  await Promise.all(
    everyPhrase().map(async (phrase) => {
      try {
        const response = await fetch(`clips/${clipFile(phrase)}`)
        if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
        clips.set(phrase, await context.decodeAudioData(await response.arrayBuffer()))
      } catch (e) {
        console.warn(`Couldn't load the recording of "${phrase}":`, e)
      }
    }),
  )
  return clips
}

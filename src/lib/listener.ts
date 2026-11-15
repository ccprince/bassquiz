import type { Frame } from './attack'
import { PitchTracker } from './pitch'
import { SampleRing } from './recording'

/** Long enough to hold several periods of a low E (41 Hz). */
const BUFFER_SIZE = 4096

/** How much of the mic input a listener keeps for `recent`. */
export const RECENT_SECONDS = 10

/** Passes every block of mic samples to the main thread, which the analyser's per-frame snapshots can't. */
const TAP_WORKLET = `
registerProcessor('tap', class extends AudioWorkletProcessor {
  process([input]) {
    if (input[0]) this.port.postMessage(input[0].slice())
    return true
  }
})
`

export interface Listener {
  /** The last RECENT_SECONDS of raw mic input, oldest first. */
  recent(): { samples: Float32Array; sampleRate: number }
  stop(): void
}

/**
 * Opens the microphone and calls `onFrame` with the level and pitch on every
 * animation frame. Must be called from a user gesture so audio can start.
 */
export async function listen(onFrame: (frame: Frame) => void): Promise<Listener> {
  const stream = await navigator.mediaDevices.getUserMedia({
    // Voice processing mangles bass: it filters lows and pumps the level.
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  })
  const context = new AudioContext()
  const source = context.createMediaStreamSource(stream)
  const analyser = context.createAnalyser()
  analyser.fftSize = BUFFER_SIZE
  source.connect(analyser)

  const ring = new SampleRing(RECENT_SECONDS * context.sampleRate)
  const workletUrl = URL.createObjectURL(new Blob([TAP_WORKLET], { type: 'text/javascript' }))
  await context.audioWorklet.addModule(workletUrl)
  URL.revokeObjectURL(workletUrl)
  const tap = new AudioWorkletNode(context, 'tap', { numberOfOutputs: 0 })
  tap.port.onmessage = (e: MessageEvent<Float32Array>) => ring.push(e.data)
  source.connect(tap)

  const tracker = new PitchTracker(BUFFER_SIZE)
  const samples = new Float32Array(BUFFER_SIZE)
  let frameId = 0

  const tick = (time: number) => {
    analyser.getFloatTimeDomainData(samples)
    onFrame({ time, ...tracker.analyse(samples, context.sampleRate) })
    frameId = requestAnimationFrame(tick)
  }
  frameId = requestAnimationFrame(tick)

  return {
    recent: () => ({ samples: ring.snapshot(), sampleRate: context.sampleRate }),
    stop() {
      tap.port.onmessage = null
      cancelAnimationFrame(frameId)
      stream.getTracks().forEach((t) => t.stop())
      void context.close()
    },
  }
}

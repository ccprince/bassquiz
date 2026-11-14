import type { Frame } from './attack'
import { PitchTracker } from './pitch'

/** Long enough to hold several periods of a low E (41 Hz). */
const BUFFER_SIZE = 4096

export interface Listener {
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
    stop() {
      cancelAnimationFrame(frameId)
      stream.getTracks().forEach((t) => t.stop())
      void context.close()
    },
  }
}

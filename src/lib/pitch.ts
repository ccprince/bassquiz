import { PitchDetector } from 'pitchy'
import { frequencyToMidi } from './notes'

/** Below a 5-string's low B and above the 24th fret of the G string, with margin. */
const MIN_HZ = 28
const MAX_HZ = 500
const MIN_CLARITY = 0.85

/** Finds the level and pitch of a buffer of audio samples. */
export class PitchTracker {
  private readonly detector: PitchDetector<Float32Array>

  constructor(bufferSize: number) {
    this.detector = PitchDetector.forFloat32Array(bufferSize)
  }

  analyse(samples: Float32Array, sampleRate: number): { level: number; midi: number | null } {
    let sumSquares = 0
    for (const s of samples) sumSquares += s * s
    const level = Math.sqrt(sumSquares / samples.length)
    if (level === 0) return { level, midi: null }

    const [hz, clarity] = this.detector.findPitch(samples, sampleRate)
    const clear = clarity >= MIN_CLARITY && hz >= MIN_HZ && hz <= MAX_HZ
    return { level, midi: clear ? frequencyToMidi(hz) : null }
  }
}

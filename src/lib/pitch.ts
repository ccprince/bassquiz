import { PitchDetector } from 'pitchy'
import { frequencyToMidi } from './notes'

/** Below a 5-string's low B and above the 24th fret of the G string, with margin. */
const MIN_HZ = 28
const MAX_HZ = 500
const MIN_CLARITY = 0.85
/**
 * How close to the best repeat a shorter one must come to be taken as the pitch. Pitchy's 0.9 lets a loud 3rd
 * harmonic win, reading the note as the fifth above it, as a webcam mic did with fret 3 on the E string.
 */
const PEAK_THRESHOLD = 0.95

/** Finds the level and pitch of a buffer of audio samples. */
export class PitchTracker {
  private readonly detector: PitchDetector<Float32Array>

  constructor(bufferSize: number) {
    this.detector = PitchDetector.forFloat32Array(bufferSize)
    this.detector.clarityThreshold = PEAK_THRESHOLD
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

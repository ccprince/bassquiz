import { describe, expect, it } from 'vitest'
import { STANDARD_TUNING, pitchClassOf } from './notes'
import { PitchTracker } from './pitch'

const SAMPLE_RATE = 48000
const SIZE = 4096

const midiToHz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12)

/** A bass-like tone: a fundamental plus decaying harmonics, at the given harmonic amplitudes. */
function tone(hz: number, harmonics: number[], amplitude = 0.5, phase = 0.3): Float32Array {
  const buffer = new Float32Array(SIZE)
  const total = harmonics.reduce((a, b) => a + b, 0)
  for (let i = 0; i < SIZE; i++) {
    const t = i / SAMPLE_RATE
    let v = 0
    harmonics.forEach((h, k) => {
      v += h * Math.sin(2 * Math.PI * hz * (k + 1) * t + phase * (k + 1))
    })
    buffer[i] = (amplitude * v) / total
  }
  return buffer
}

function noise(amplitude: number): Float32Array {
  let seed = 42
  const buffer = new Float32Array(SIZE)
  for (let i = 0; i < SIZE; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    buffer[i] = amplitude * ((seed / 0x7fffffff) * 2 - 1)
  }
  return buffer
}

const RICH = [1, 0.7, 0.5, 0.35, 0.25, 0.15]
/** What a small mic hears from a bass: little fundamental, strong upper harmonics. */
const WEAK_FUNDAMENTAL = [0.1, 0.8, 1, 0.6, 0.4, 0.2]
const NO_FUNDAMENTAL = [0, 1, 0.9, 0.5, 0.3, 0.2]

describe('PitchTracker', () => {
  const tracker = new PitchTracker(SIZE)

  // Every note on the neck, open string to fret 21.
  const neck = STANDARD_TUNING.flatMap((s) => Array.from({ length: 22 }, (_, f) => s.openMidi + f))

  it.each([
    ['a rich tone', RICH],
    ['a weak fundamental', WEAK_FUNDAMENTAL],
    ['a missing fundamental', NO_FUNDAMENTAL],
  ])('finds the right pitch class for every note on the neck from %s', (_, harmonics) => {
    const wrong = neck.filter((midi) => {
      const { midi: heard } = tracker.analyse(tone(midiToHz(midi), harmonics), SAMPLE_RATE)
      return heard === null || pitchClassOf(Math.round(heard)) !== pitchClassOf(midi)
    })
    expect(wrong).toEqual([])
  })

  it('is accurate to within a few cents', () => {
    const { midi } = tracker.analyse(tone(midiToHz(33.2), RICH), SAMPLE_RATE)
    expect(midi).toBeCloseTo(33.2, 1)
  })

  it('reports the RMS level', () => {
    const { level } = tracker.analyse(tone(110, [1], 0.5), SAMPLE_RATE)
    expect(level).toBeCloseTo(0.5 / Math.SQRT2, 2)
  })

  it('reports no pitch for silence', () => {
    expect(tracker.analyse(new Float32Array(SIZE), SAMPLE_RATE)).toEqual({ level: 0, midi: null })
  })

  it('reports no pitch for noise', () => {
    expect(tracker.analyse(noise(0.3), SAMPLE_RATE).midi).toBeNull()
  })
})

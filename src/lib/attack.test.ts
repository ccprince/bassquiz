import { describe, expect, it } from 'vitest'
import { type Answer, AttackDetector, type Frame } from './attack'

const FRAME_MS = 20
const GATE = 0.01

/** Builds a run of frames at FRAME_MS intervals starting at `start`. */
function frames(start: number, count: number, level: number | ((i: number) => number), midi: number | null): Frame[] {
  return Array.from({ length: count }, (_, i) => ({
    time: start + i * FRAME_MS,
    level: typeof level === 'function' ? level(i) : level,
    midi,
  }))
}

function feedAll(detector: AttackDetector, input: Frame[]): Answer[] {
  return input.flatMap((f) => {
    const answer = detector.feed(f)
    return answer ? [answer] : []
  })
}

/** A plucked note: a loud attack decaying slowly. */
const decaying = (peak: number) => (i: number) => peak * Math.pow(0.98, i)

describe('AttackDetector', () => {
  it('answers once a plucked note has held steady for the stability window', () => {
    const d = new AttackDetector({ gate: GATE })
    const answers = feedAll(d, [...frames(0, 5, 0, null), ...frames(100, 50, decaying(0.5), 45.1)])
    expect(answers).toEqual([{ midi: 45, cents: expect.closeTo(10) }])
  })

  it('does not answer before the stability window has passed', () => {
    const d = new AttackDetector({ gate: GATE, stableMs: 150 })
    const answers = feedAll(d, [...frames(0, 5, 0, null), ...frames(100, 7, decaying(0.5), 45)]) // 120 ms
    expect(answers).toEqual([])
  })

  it('answers only once for a sustained note', () => {
    const d = new AttackDetector({ gate: GATE })
    const answers = feedAll(d, [...frames(0, 5, 0, null), ...frames(100, 200, decaying(0.5), 45)])
    expect(answers).toHaveLength(1)
  })

  it('ignores pitches passed through briefly while sliding to a note', () => {
    const d = new AttackDetector({ gate: GATE })
    const answers = feedAll(d, [
      ...frames(0, 5, 0, null),
      ...frames(100, 3, 0.5, 43),
      ...frames(160, 3, 0.48, 44),
      ...frames(220, 20, 0.46, 45),
    ])
    expect(answers.map((a) => a.midi)).toEqual([45])
  })

  it('answers again when the held pitch changes to another note without a new pluck', () => {
    const d = new AttackDetector({ gate: GATE })
    const answers = feedAll(d, [
      ...frames(0, 5, 0, null),
      ...frames(100, 20, 0.5, 45),
      ...frames(500, 20, 0.45, 47), // hammer-on
    ])
    expect(answers.map((a) => a.midi)).toEqual([45, 47])
  })

  it('answers again when the same note is plucked again over its own ringing', () => {
    const d = new AttackDetector({ gate: GATE })
    const answers = feedAll(d, [
      ...frames(0, 5, 0, null),
      ...frames(100, 50, decaying(0.3), 45), // decays to ~0.11
      ...frames(1100, 30, decaying(0.4), 45), // re-pluck well above the decayed level
    ])
    expect(answers.map((a) => a.midi)).toEqual([45, 45])
  })

  it('answers again when the same note is played after silence', () => {
    const d = new AttackDetector({ gate: GATE })
    const answers = feedAll(d, [
      ...frames(0, 20, decaying(0.5), 45),
      ...frames(400, 5, 0, null),
      ...frames(500, 20, decaying(0.5), 45),
    ])
    expect(answers.map((a) => a.midi)).toEqual([45, 45])
  })

  it('treats sound below the gate as silence', () => {
    const d = new AttackDetector({ gate: GATE })
    const answers = feedAll(d, frames(0, 50, GATE / 2, 45))
    expect(answers).toEqual([])
  })

  it('does not answer for a note already ringing when a new prompt begins', () => {
    const d = new AttackDetector({ gate: GATE })
    feedAll(d, [...frames(0, 5, 0, null), ...frames(100, 20, decaying(0.5), 45)])
    d.ignoreCurrent()
    const answers = feedAll(d, frames(500, 50, decaying(0.3), 45))
    expect(answers).toEqual([])
  })

  it('does not answer for an unsettled note already ringing when a new prompt begins', () => {
    const d = new AttackDetector({ gate: GATE })
    feedAll(d, [...frames(0, 5, 0, null), ...frames(100, 3, 0.5, 45)])
    d.ignoreCurrent()
    const answers = feedAll(d, frames(160, 50, decaying(0.45), 45))
    expect(answers).toEqual([])
  })

  it('answers a fresh pluck after a new prompt begins', () => {
    const d = new AttackDetector({ gate: GATE })
    feedAll(d, [...frames(0, 5, 0, null), ...frames(100, 50, decaying(0.3), 45)])
    d.ignoreCurrent()
    const answers = feedAll(d, frames(1100, 30, decaying(0.4), 47))
    expect(answers.map((a) => a.midi)).toEqual([47])
  })

  it('answers normally after a new prompt begins in silence', () => {
    const d = new AttackDetector({ gate: GATE })
    feedAll(d, frames(0, 5, 0, null))
    d.ignoreCurrent()
    const answers = feedAll(d, frames(100, 20, decaying(0.5), 45))
    expect(answers.map((a) => a.midi)).toEqual([45])
  })

  it('gives no answers while paused', () => {
    const d = new AttackDetector({ gate: GATE })
    d.pause()
    const answers = feedAll(d, [...frames(0, 5, 0, null), ...frames(100, 20, decaying(0.5), 45)])
    expect(answers).toEqual([])
  })

  it('on resuming, answers a note plucked while paused', () => {
    const d = new AttackDetector({ gate: GATE })
    feedAll(d, frames(0, 5, 0, null))
    d.pause()
    feedAll(d, [...frames(100, 10, 0.2, 60), ...frames(300, 10, decaying(0.5), 45)]) // speech, then a pluck
    d.resume()
    const answers = feedAll(d, frames(500, 20, (i) => decaying(0.5)(i + 10), 45))
    expect(answers.map((a) => a.midi)).toEqual([45])
  })

  it('on resuming, still ignores the note ringing when the pause began', () => {
    const d = new AttackDetector({ gate: GATE })
    feedAll(d, [...frames(0, 5, 0, null), ...frames(100, 20, decaying(0.5), 45)])
    d.pause()
    feedAll(d, frames(500, 10, (i) => decaying(0.5)(i + 20) + 0.3, 45)) // speech over the ringing note
    d.resume()
    const answers = feedAll(d, frames(700, 30, (i) => decaying(0.5)(i + 30), 45))
    expect(answers).toEqual([])
  })

  it('on resuming, answers a new note plucked over the one ringing when the pause began', () => {
    const d = new AttackDetector({ gate: GATE })
    feedAll(d, [...frames(0, 5, 0, null), ...frames(100, 20, decaying(0.5), 45)])
    d.pause()
    feedAll(d, frames(500, 10, decaying(0.6), 47))
    d.resume()
    const answers = feedAll(d, frames(700, 20, (i) => decaying(0.6)(i + 10), 47))
    expect(answers.map((a) => a.midi)).toEqual([47])
  })

  it('lets the gate be changed while running', () => {
    const d = new AttackDetector({ gate: GATE })
    d.gate = 0.6
    const answers = feedAll(d, [...frames(0, 5, 0, null), ...frames(100, 20, 0.5, 45)])
    expect(answers).toEqual([])
  })
})

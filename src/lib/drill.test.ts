import { describe, expect, it } from 'vitest'
import { STANDARD_TUNING } from './notes'
import { type DrillState, answer, next, reveal, start } from './drill'
import type { PromptOptions } from './prompts'

const [E] = STANDARD_TUNING
const options: PromptOptions = { string: E, range: { from: 0, to: 21, markedOnly: true } }

/** A drill prompting for A on the E string. */
const promptingA: DrillState = {
  prompt: { string: E, pitchClass: 9, spelling: 'A' },
  status: 'waiting',
  heard: null,
  missed: false,
  count: 0,
  reviews: [],
}

describe('drill', () => {
  it('starts waiting on a prompt', () => {
    const state = start(options, Math.random)
    expect(state.status).toBe('waiting')
    expect(state.heard).toBeNull()
    expect(state.prompt.string).toBe(E)
  })

  it('marks a correct answer and records what was heard', () => {
    const state = answer(promptingA, { midi: 45, cents: -3 })
    expect(state.status).toBe('correct')
    expect(state.heard).toEqual({ midi: 45, cents: -3 })
  })

  it('marks a wrong answer, keeping the same prompt', () => {
    const state = answer(promptingA, { midi: 44, cents: 0 })
    expect(state.status).toBe('wrong')
    expect(state.prompt).toBe(promptingA.prompt)
  })

  it('accepts a correct retry after a wrong answer', () => {
    const state = answer(answer(promptingA, { midi: 44, cents: 0 }), { midi: 33, cents: 0 })
    expect(state.status).toBe('correct')
  })

  it('ignores answers once the prompt is answered correctly', () => {
    const correct = answer(promptingA, { midi: 45, cents: 0 })
    expect(answer(correct, { midi: 44, cents: 0 })).toBe(correct)
  })

  it('still requires the note to be played after a reveal', () => {
    const revealed = reveal(promptingA)
    expect(revealed.status).toBe('revealed')
    const wrong = answer(revealed, { midi: 44, cents: 0 })
    expect(wrong.status).toBe('revealed')
    expect(wrong.heard).toEqual({ midi: 44, cents: 0 })
    expect(answer(wrong, { midi: 45, cents: 0 }).status).toBe('correct')
  })

  it('moves on to a different prompt', () => {
    const correct = answer(promptingA, { midi: 45, cents: 0 })
    const state = next(correct, options, Math.random)
    expect(state.status).toBe('waiting')
    expect(state.heard).toBeNull()
    expect(state.prompt.pitchClass).not.toBe(9)
  })
})

/** A seeded PRNG (mulberry32), so a drill's random prompts are reproducible. */
function seeded(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

describe('reviews', () => {
  // E string, full neck: all twelve pitch classes, both spellings of each accidental.
  const fullNeck: PromptOptions = { string: E, range: { from: 0, to: 24, markedOnly: false } }

  const right = (state: DrillState) => answer(state, { midi: 36 + state.prompt.pitchClass, cents: 0 })
  const wrong = (state: DrillState) => answer(state, { midi: 37 + state.prompt.pitchClass, cents: 0 })
  const miss = (state: DrillState) => right(wrong(state))

  /** Plays a drill from `state`, answering each prompt with `play`; returns the spellings asked. */
  function run(
    state: DrillState,
    plays: ((state: DrillState) => DrillState)[],
    random: () => number,
    options = fullNeck,
  ) {
    const asked: string[] = []
    for (const play of plays) {
      asked.push(state.prompt.spelling)
      state = next(play(state), options, random)
    }
    return { asked, state }
  }

  it('reviews a missed spelling after two other prompts', () => {
    const random = seeded(1)
    const first = start(fullNeck, random)
    const { asked, state } = run(first, [miss, right, right], random)
    expect(asked[1]).not.toBe(first.prompt.spelling)
    expect(asked[2]).not.toBe(first.prompt.spelling)
    expect(state.prompt.spelling).toBe(first.prompt.spelling)
  })

  it('counts a reveal as a miss', () => {
    const random = seeded(2)
    const first = start(fullNeck, random)
    const { state } = run(first, [(s) => right(reveal(s)), right, right], random)
    expect(state.prompt.spelling).toBe(first.prompt.spelling)
  })

  it('reviews again five prompts after a clean review', () => {
    const random = seeded(3)
    const first = start(fullNeck, random)
    const { asked, state } = run(first, [miss, right, right, right, right, right, right, right, right], random)
    expect(asked[3]).toBe(first.prompt.spelling)
    expect(asked.slice(4)).not.toContain(first.prompt.spelling)
    expect(state.prompt.spelling).toBe(first.prompt.spelling)
  })

  it('returns a spelling to random selection after two clean reviews', () => {
    // Always picking the lowest candidate: C, then C♯ and D alternate while C is under review.
    const lowest = () => 0
    const first = start(fullNeck, lowest)
    const plays = [miss, ...Array<typeof right>(10).fill(right)]
    const { asked, state } = run(first, plays, lowest)
    expect(asked).toEqual(['C', 'C♯', 'D', 'C', 'C♯', 'D', 'C♯', 'D', 'C♯', 'C', 'C♯'])
    expect(state.prompt.spelling).toBe('C')
  })

  it('starts the schedule over when a review is missed', () => {
    const random = seeded(4)
    const first = start(fullNeck, random)
    const { asked, state } = run(first, [miss, right, right, miss, right, right], random)
    expect(asked[3]).toBe(first.prompt.spelling)
    expect(asked.slice(4)).not.toContain(first.prompt.spelling)
    expect(state.prompt.spelling).toBe(first.prompt.spelling)
  })

  it('asks the soonest review early when every prompt is under review', () => {
    // Frets 0–1 on the E string: only E and F.
    const twoNotes: PromptOptions = { string: E, range: { from: 0, to: 1, markedOnly: false } }
    const lowest = () => 0
    const { asked } = run(start(twoNotes, lowest), [miss, miss, right, right], lowest, twoNotes)
    expect(asked).toEqual(['E', 'F', 'E', 'F'])
  })

  it('holds back a review of the pitch class just asked', () => {
    // G♯ is missed first and A♭ later; their reviews fall due on consecutive prompts.
    const random = seeded(3)
    const plays = [miss, right, right, right, right, right, right, miss, right, right, right]
    const { asked, state } = run(start(fullNeck, random), plays, random)
    expect([asked[0], asked[7], asked[9]]).toEqual(['G♯', 'A♭', 'G♯'])
    expect(asked[10]).not.toBe('A♭')
    expect(state.prompt.spelling).toBe('A♭')
  })
})

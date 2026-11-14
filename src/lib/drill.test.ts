import { describe, expect, it } from 'vitest'
import { STANDARD_TUNING } from './notes'
import { type DrillOptions, type DrillState, answer, isFinished, next, reveal, start, totalDealt } from './drill'
import type { PromptOptions } from './prompts'

const [E] = STANDARD_TUNING
const options: PromptOptions = { string: E, range: { from: 0, to: 21, markedOnly: true } }

/** A drill prompting for A on the E string. */
const promptingA: DrillState = {
  prompt: { string: E, pitchClass: 9, spelling: 'A' },
  status: 'waiting',
  heard: null,
  missed: false,
  wrong: 0,
  shownAt: 1000,
  count: 0,
  reviewing: false,
  deck: [],
  dealt: 0,
  earned: 0,
  reviews: [],
  results: [],
}

describe('drill', () => {
  it('starts waiting on a prompt', () => {
    const state = start(options, Math.random, 0)
    expect(state.status).toBe('waiting')
    expect(state.heard).toBeNull()
    expect(state.prompt.string).toBe(E)
  })

  it('marks a correct answer and records what was heard', () => {
    const state = answer(promptingA, { midi: 45, cents: -3 }, 0)
    expect(state.status).toBe('correct')
    expect(state.heard).toEqual({ midi: 45, cents: -3 })
  })

  it('marks a wrong answer, keeping the same prompt', () => {
    const state = answer(promptingA, { midi: 44, cents: 0 }, 0)
    expect(state.status).toBe('wrong')
    expect(state.prompt).toBe(promptingA.prompt)
  })

  it('accepts a correct retry after a wrong answer', () => {
    const state = answer(answer(promptingA, { midi: 44, cents: 0 }, 0), { midi: 33, cents: 0 }, 0)
    expect(state.status).toBe('correct')
  })

  it('ignores answers once the prompt is answered correctly', () => {
    const correct = answer(promptingA, { midi: 45, cents: 0 }, 0)
    expect(answer(correct, { midi: 44, cents: 0 }, 0)).toBe(correct)
  })

  it('still requires the note to be played after a reveal', () => {
    const revealed = reveal(promptingA)
    expect(revealed.status).toBe('revealed')
    const wrong = answer(revealed, { midi: 44, cents: 0 }, 0)
    expect(wrong.status).toBe('revealed')
    expect(wrong.heard).toEqual({ midi: 44, cents: 0 })
    expect(answer(wrong, { midi: 45, cents: 0 }, 0).status).toBe('correct')
  })

  it('moves on to a different prompt', () => {
    const correct = answer(promptingA, { midi: 45, cents: 0 }, 0)
    const state = next(correct, options, Math.random, 0)
    expect(state.status).toBe('waiting')
    expect(state.heard).toBeNull()
    expect(state.prompt.pitchClass).not.toBe(9)
  })
})

// E string, full neck: all twelve pitch classes, both spellings of each accidental.
const fullNeck: PromptOptions = { string: E, range: { from: 0, to: 24, markedOnly: false } }
// Frets 0–1 on the E string: only E and F.
const twoNotes: PromptOptions = { string: E, range: { from: 0, to: 1, markedOnly: false } }
// Always dealing the lowest candidate, so a drill runs C, C♯, D, D♭, D♯, E, E♭, …
const lowest = () => 0

const right = (state: DrillState) => answer(state, { midi: 36 + state.prompt.pitchClass, cents: 0 }, 0)
const wrong = (state: DrillState) => answer(state, { midi: 37 + state.prompt.pitchClass, cents: 0 }, 0)
const miss = (state: DrillState) => right(wrong(state))
const rights = (n: number) => Array<typeof right>(n).fill(right)

/** Plays a drill, answering each prompt with `play`; returns the spellings asked. */
function run(plays: ((state: DrillState) => DrillState)[], options = fullNeck) {
  let state = start(options, lowest, 0)
  const asked: string[] = []
  for (const play of plays) {
    asked.push(state.prompt.spelling)
    state = next(play(state), options, lowest, 0)
  }
  return { asked, state }
}

describe('rounds', () => {
  it('deals every spelling once per round', () => {
    const { asked } = run(rights(34))
    expect(new Set(asked.slice(0, 17)).size).toBe(17)
    expect(new Set(asked.slice(17)).size).toBe(17)
  })

  it('counts the dealt prompts answered', () => {
    expect(run(rights(5)).state.dealt).toBe(5)
  })

  it('counts a dealt prompt however it was answered', () => {
    expect(run([miss, (s) => right(reveal(s))]).state.dealt).toBe(2)
  })

  it('totals the dealt prompts in a limited drill', () => {
    expect(totalDealt({ ...fullNeck, rounds: 3 })).toBe(51)
    expect(totalDealt({ ...fullNeck, rounds: null })).toBeNull()
  })

  it('finishes a limited drill when its last dealt prompt is answered, dropping pending reviews', () => {
    const options: DrillOptions = { ...twoNotes, rounds: 1 }
    const first = miss(start(options, lowest, 0))
    expect(isFinished(first, options)).toBe(false)
    const last = right(next(first, options, lowest, 0))
    expect(last.reviews).toHaveLength(1)
    expect(isFinished(last, options)).toBe(true)
  })

  it('never finishes an open-ended drill', () => {
    const options: DrillOptions = { ...twoNotes, rounds: null }
    expect(isFinished(run(rights(10), options).state, options)).toBe(false)
  })
})

describe('progress', () => {
  it('earns a whole step for a dealt prompt answered right first time', () => {
    expect(run(rights(3)).state.earned).toBe(3)
  })

  it('earns nothing for a miss, even once corrected', () => {
    expect(run([miss, (s) => right(reveal(s))]).state.earned).toBe(0)
  })

  it('earns back a missed step in halves, one per clean review', () => {
    // C is missed, then reviewed cleanly at prompts 3 and 9.
    expect(run([miss, ...rights(3)]).state.earned).toBe(2.5)
    expect(run([miss, ...rights(9)]).state.earned).toBe(8)
  })

  it('splits what is left between the reviews after a missed review', () => {
    // C's second review, at prompt 9, is missed; its next two reviews earn a quarter each.
    const plays = [miss, ...rights(8), miss, ...rights(3)]
    expect(run(plays).state.earned).toBe(9.75)
    const { state } = run([...plays, ...rights(6)])
    expect(state.reviews).toEqual([])
    expect(state.earned).toBe(state.dealt)
  })

  it('earns a whole step for dealing a spelling under review, leaving its reviews owed', () => {
    // E is missed, dealt cleanly in the next round, then reviewed.
    expect(run([miss, ...rights(4)], twoNotes).state.earned).toBe(3.5)
  })

  it('never earns more than the dealt prompts, and earns them all once reviews are done', () => {
    // Missing every third prompt, reviews included.
    const plays = Array.from({ length: 80 }, (_, i) => (i % 3 ? right : miss))
    let state = start(fullNeck, lowest, 0)
    for (const play of plays) {
      state = next(play(state), fullNeck, lowest, 0)
      const owed = state.reviews.reduce((n, r) => n + r.owed, 0)
      expect(state.earned + owed).toBe(state.dealt)
    }
  })
})

describe('reviews', () => {
  it('reviews a missed spelling after two other prompts', () => {
    const { asked, state } = run([miss, right, right])
    expect(asked).toEqual(['C', 'C♯', 'D'])
    expect(state.prompt.spelling).toBe('C')
    expect(state.reviewing).toBe(true)
  })

  it('counts a reveal as a miss', () => {
    const { state } = run([(s) => right(reveal(s)), right, right])
    expect(state.prompt.spelling).toBe('C')
  })

  it('reviews again five prompts after a clean review', () => {
    const { asked, state } = run([miss, ...rights(8)])
    expect(asked[3]).toBe('C')
    expect(asked.slice(4)).not.toContain('C')
    expect(state.prompt.spelling).toBe('C')
  })

  it('asks reviews in addition to the round, ending them after two clean reviews', () => {
    // A round of 17 dealt prompts, plus C's two reviews.
    const { asked, state } = run([miss, ...rights(18)])
    expect(asked.filter((s) => s === 'C')).toHaveLength(3)
    expect(new Set(asked).size).toBe(17)
    expect(state.dealt).toBe(17)
    expect(state.reviews).toEqual([])
  })

  it('starts the schedule over when a review is missed', () => {
    const { asked, state } = run([miss, right, right, miss, right, right])
    expect(asked[3]).toBe('C')
    expect(asked.slice(4)).not.toContain('C')
    expect(state.prompt.spelling).toBe('C')
  })

  it('holds back a review of the pitch class just asked', () => {
    // C♯'s review falls due straight after D♭ is dealt.
    const { asked, state } = run([right, miss, right, right, right])
    expect(asked).toEqual(['C', 'C♯', 'D', 'D♭', 'D♯'])
    expect(state.prompt.spelling).toBe('C♯')
  })

  it('may deal a spelling under review, leaving its reviews be', () => {
    // E is missed, then dealt again in the next round; its review still comes after.
    const { asked, state } = run([miss, right, right, right], twoNotes)
    expect(asked).toEqual(['E', 'F', 'E', 'F'])
    expect(state.prompt.spelling).toBe('E')
    expect(state.reviewing).toBe(true)
    expect(state.dealt).toBe(4)
  })
})

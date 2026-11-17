import { describe, expect, it } from 'vitest'
import { STANDARD_TUNING } from './notes'
import { type DrillOptions, type DrillState, answer, isFinished, next, reveal, start, totalDealt } from './drill'
import type { PromptOptions } from './prompts'

const [E] = STANDARD_TUNING
const options: PromptOptions = { string: E, octave: { start: 0, markedOnly: true } }

/** A drill prompting for A on the E string. */
const promptingA: DrillState = {
  prompt: { string: E, pitchClass: 9, spelling: 'A', midi: 33 },
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
    const state = answer(promptingA, { midi: 33, cents: -3 }, 0)
    expect(state.status).toBe('correct')
    expect(state.heard).toEqual({ midi: 33, cents: -3 })
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

  it('keeps the prompt open after a wrong octave, without counting it against it', () => {
    const state = answer(promptingA, { midi: 45, cents: 0 }, 0)
    expect(state.status).toBe('wrong')
    expect(state.heard).toEqual({ midi: 45, cents: 0 })
    expect(state.missed).toBe(false)
    expect(state.wrong).toBe(0)
  })

  it('counts a wrong octave then the right pitch as right first time, timed to the right pitch', () => {
    const state = answer(answer(promptingA, { midi: 45, cents: 0 }, 2000), { midi: 33, cents: 0 }, 4000)
    expect(state.status).toBe('correct')
    expect(state.earned).toBe(1)
    expect(state.results).toEqual([{ spelling: 'A', pitchClass: 9, wrong: 0, revealed: false, ms: 3000 }])
  })

  it('still misses a prompt answered with a wrong note after a wrong octave', () => {
    const state = answer(answer(promptingA, { midi: 45, cents: 0 }, 0), { midi: 44, cents: 0 }, 0)
    expect(state.missed).toBe(true)
    expect(state.wrong).toBe(1)
  })

  it('stays revealed after a wrong octave', () => {
    expect(answer(reveal(promptingA), { midi: 45, cents: 0 }, 0).status).toBe('revealed')
  })

  it('ignores answers once the prompt is answered correctly', () => {
    const correct = answer(promptingA, { midi: 33, cents: 0 }, 0)
    expect(answer(correct, { midi: 44, cents: 0 }, 0)).toBe(correct)
  })

  it('still requires the note to be played after a reveal', () => {
    const revealed = reveal(promptingA)
    expect(revealed.status).toBe('revealed')
    const wrong = answer(revealed, { midi: 44, cents: 0 }, 0)
    expect(wrong.status).toBe('revealed')
    expect(wrong.heard).toEqual({ midi: 44, cents: 0 })
    expect(answer(wrong, { midi: 33, cents: 0 }, 0).status).toBe('correct')
  })

  it('moves on to a different prompt', () => {
    const correct = answer(promptingA, { midi: 33, cents: 0 }, 0)
    const state = next(correct, options, Math.random, 0)
    expect(state.status).toBe('waiting')
    expect(state.heard).toBeNull()
    expect(state.prompt.pitchClass).not.toBe(9)
  })
})

// E string, open to fret 11: all twelve pitch classes, both spellings of each accidental.
const fullNeck: PromptOptions = { string: E, octave: { start: 0, markedOnly: false } }
// Marked frets 3–9 on the E string, in sharps: C♯, G, A and B.
const fourNotes: PromptOptions = { string: E, octave: { start: 0, markedOnly: true }, accidentals: 'sharps' }
// Always dealing the lowest candidate, so a drill runs C, C♯, D, D♭, D♯, E, E♭, …
const lowest = () => 0

const right = (state: DrillState) => answer(state, { midi: state.prompt.midi, cents: 0 }, 0)
const wrong = (state: DrillState) => answer(state, { midi: state.prompt.midi + 1, cents: 0 }, 0)
const miss = (state: DrillState) => right(wrong(state))
const octaveSlip = (state: DrillState) => right(answer(state, { midi: state.prompt.midi + 12, cents: 0 }, 0))
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
    // C♯ is missed and reviewed once; B, the last dealt prompt, leaves its second review pending.
    const options: DrillOptions = { ...fourNotes, rounds: 1 }
    expect(isFinished(run([miss, ...rights(2)], options).state, options)).toBe(false)
    let state = start(options, lowest, 0)
    for (const play of [miss, ...rights(3)]) state = next(play(state), options, lowest, 0)
    const last = right(state)
    expect(last.reviews).toHaveLength(1)
    expect(isFinished(last, options)).toBe(true)
  })

  it('never finishes an open-ended drill', () => {
    const options: DrillOptions = { ...fourNotes, rounds: null }
    expect(isFinished(run(rights(10), options).state, options)).toBe(false)
  })
})

describe('progress', () => {
  it('earns a whole step for a dealt prompt answered right first time', () => {
    expect(run(rights(3)).state.earned).toBe(3)
  })

  it('treats a wrong octave, once corrected, as right first time', () => {
    const { state } = run([octaveSlip, ...rights(2)])
    expect(state.earned).toBe(3)
    expect(state.reviews).toEqual([])
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
    // C♯ is missed, reviewed once, then dealt cleanly in the next round.
    expect(run([miss, ...rights(5)], fourNotes).state.earned).toBe(4.5)
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
    // C♯ is missed, reviewed once, then dealt again in the next round; its second review still comes after.
    const { asked, state } = run([miss, ...rights(9)], fourNotes)
    expect(asked).toEqual(['C♯', 'G', 'A', 'C♯', 'B', 'C♯', 'G', 'A', 'B', 'C♯'])
    expect(state.reviewing).toBe(false)
    expect(state.reviews).toEqual([])
  })
})

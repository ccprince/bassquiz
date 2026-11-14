import { describe, expect, it } from 'vitest'
import { STANDARD_TUNING, spellingsOf } from './notes'
import {
  MARKED_FRETS,
  type Prompt,
  type PromptOptions,
  canFollow,
  deal,
  fretsIn,
  isCorrect,
  pitchClassesOnString,
  positionsOf,
  roundOf,
} from './prompts'

const [E, A, D, G] = STANDARD_TUNING

/** A seeded PRNG (mulberry32) for statistical tests. */
function seeded(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

describe('fretsIn', () => {
  it('lists a span of frets inclusively', () => {
    expect(fretsIn({ from: 0, to: 3, markedOnly: false })).toEqual([0, 1, 2, 3])
  })

  it('lists the marked frets, without the open string', () => {
    expect(fretsIn({ from: 0, to: 24, markedOnly: true })).toEqual([3, 5, 7, 9, 12, 15, 17, 19, 21, 24])
    expect(MARKED_FRETS).not.toContain(0)
  })

  it('narrows a span to the marked frets within it', () => {
    expect(fretsIn({ from: 5, to: 12, markedOnly: true })).toEqual([5, 7, 9, 12])
    expect(fretsIn({ from: 10, to: 11, markedOnly: true })).toEqual([])
  })
})

describe('pitchClassesOnString', () => {
  it('lists each distinct pitch class once', () => {
    // E string marked frets: G A B C♯ E G A B C♯
    expect(pitchClassesOnString(E, fretsIn({ from: 0, to: 21, markedOnly: true }))).toEqual([1, 4, 7, 9, 11])
  })

  it('covers all twelve pitch classes over a full span', () => {
    expect(pitchClassesOnString(A, fretsIn({ from: 0, to: 21, markedOnly: false }))).toHaveLength(12)
  })
})

describe('positionsOf', () => {
  it('finds every fret on the string where the pitch class lies', () => {
    expect(positionsOf(7, E, fretsIn({ from: 0, to: 21, markedOnly: false }))).toEqual([3, 15]) // G
    expect(positionsOf(2, D, fretsIn({ from: 0, to: 21, markedOnly: false }))).toEqual([0, 12]) // D
  })

  it('respects the fret range', () => {
    expect(positionsOf(7, E, fretsIn({ from: 5, to: 21, markedOnly: false }))).toEqual([15])
  })
})

describe('roundOf', () => {
  it('has one prompt per spelling reachable in the fret range', () => {
    // E string marked frets: G A B C♯ E
    const round = roundOf({ string: E, range: { from: 0, to: 21, markedOnly: true } })
    expect(round.map((p) => p.spelling)).toEqual(['C♯', 'D♭', 'E', 'G', 'A', 'B'])
    expect(round.every((p) => p.string === E)).toBe(true)
  })

  it.each([
    ['sharps', ['C♯', 'E', 'G', 'A', 'B']],
    ['flats', ['D♭', 'E', 'G', 'A', 'B']],
  ] as const)('spells accidentals with %s only when asked', (accidentals, spellings) => {
    const round = roundOf({ string: E, range: { from: 0, to: 21, markedOnly: true }, accidentals })
    expect(round.map((p) => p.spelling)).toEqual(spellings)
  })

  it('spells every prompt with its pitch class', () => {
    for (const p of roundOf({ string: A, range: { from: 0, to: 24, markedOnly: false } })) {
      expect(spellingsOf(p.pitchClass)).toContain(p.spelling)
    }
  })
})

describe('deal', () => {
  const fullNeck: PromptOptions = { string: G, range: { from: 0, to: 24, markedOnly: false } }

  /** Deals whole rounds back to back, as a drill does. */
  function dealRounds(options: PromptOptions, rounds: number, random: () => number): Prompt[] {
    const dealt: Prompt[] = []
    for (let r = 0; r < rounds; r++) {
      let deck = roundOf(options)
      while (deck.length) {
        const p = deal(deck, random, dealt.at(-1))
        dealt.push(p)
        deck = deck.filter((q) => q !== p)
      }
    }
    return dealt
  }

  it('deals only from the deck', () => {
    const deck = roundOf(fullNeck)
    for (let i = 0; i < 100; i++) expect(deck).toContain(deal(deck, Math.random))
  })

  it('never repeats a pitch class, within or across rounds', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      for (const range of [fullNeck.range, { from: 0, to: 2, markedOnly: false }, { from: 5, to: 9, markedOnly: true }]) {
        const dealt = dealRounds({ ...fullNeck, range }, 20, seeded(seed))
        dealt.slice(1).forEach((p, i) => expect(p.pitchClass).not.toBe(dealt[i].pitchClass))
      }
    }
  })

  it('never strands a sharp next to its flat', () => {
    // Frets 6–7: A♯, B♭ and B. Dealing B first would leave A♯ and B♭ to follow each other.
    const deck = roundOf({ string: E, range: { from: 6, to: 7, markedOnly: false } })
    const previous: Prompt = { string: E, pitchClass: 9, spelling: 'A' }
    for (const r of [0, 0.5, 0.99]) expect(deal(deck, () => r, previous).spelling).not.toBe('B')
  })

  it('repeats only when no other prompt is possible', () => {
    // Frets 5–6: A, A♯ and B♭. After A♯ ends a round, the next round can't avoid a repeat.
    const options: PromptOptions = { string: E, range: { from: 5, to: 6, markedOnly: false } }
    const previous: Prompt = { string: E, pitchClass: 10, spelling: 'A♯' }
    expect(deal(roundOf(options), () => 0, previous).spelling).toBe('A')
    const lone = roundOf({ string: E, range: { from: 5, to: 5, markedOnly: false } })
    expect(deal(lone, () => 0, lone[0])).toBe(lone[0])
  })
})

describe('canFollow', () => {
  const [Bb, B] = roundOf({ string: E, range: { from: 6, to: 7, markedOnly: false } }).slice(1)
  const [As] = roundOf({ string: E, range: { from: 6, to: 6, markedOnly: false } })

  it('is stuck when two spellings of one pitch class are all that is left', () => {
    expect(canFollow([As, Bb], 11)).toBe(false)
  })

  it('is stuck when the one prompt left repeats the last', () => {
    expect(canFollow([B], 11)).toBe(false)
  })

  it('finds an order that keeps them apart', () => {
    expect(canFollow([As, Bb, B], 9)).toBe(true)
    expect(canFollow([], 9)).toBe(true)
  })
})

describe('isCorrect', () => {
  const prompt: Prompt = { string: E, pitchClass: 9, spelling: 'A' }

  it('accepts the prompted pitch class in any octave', () => {
    expect(isCorrect(prompt, 33)).toBe(true) // A1
    expect(isCorrect(prompt, 45)).toBe(true) // A2
  })

  it('rejects any other pitch class', () => {
    expect(isCorrect(prompt, 34)).toBe(false)
  })
})

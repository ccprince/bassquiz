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
  fretOf,
  pitchClassesOnString,
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
  it('lists the twelve frets of an octave', () => {
    expect(fretsIn({ start: 0, markedOnly: false })).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
    expect(fretsIn({ start: 13, markedOnly: false })).toEqual([13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24])
  })

  it('narrows an octave to the marked frets within it', () => {
    expect(fretsIn({ start: 0, markedOnly: true })).toEqual([3, 5, 7, 9])
    expect(fretsIn({ start: 5, markedOnly: true })).toEqual([5, 7, 9, 12, 15])
    expect(MARKED_FRETS).not.toContain(0)
  })

  it('always finds at least four marked frets', () => {
    for (let start = 0; start <= 13; start++) {
      expect(fretsIn({ start, markedOnly: true }).length).toBeGreaterThanOrEqual(4)
    }
  })
})

describe('pitchClassesOnString', () => {
  it('lists each distinct pitch class once', () => {
    // E string marked frets 3–9: G A B C♯
    expect(pitchClassesOnString(E, fretsIn({ start: 0, markedOnly: true }))).toEqual([1, 7, 9, 11])
  })

  it('covers all twelve pitch classes over an octave', () => {
    expect(pitchClassesOnString(A, fretsIn({ start: 7, markedOnly: false }))).toHaveLength(12)
  })
})

describe('fretOf', () => {
  it('finds the fret within the octave where the pitch class lies', () => {
    expect(fretOf(7, E, fretsIn({ start: 0, markedOnly: false }))).toBe(3) // G
    expect(fretOf(7, E, fretsIn({ start: 5, markedOnly: false }))).toBe(15) // G
    expect(fretOf(2, D, fretsIn({ start: 0, markedOnly: false }))).toBe(0) // D
  })

  it('finds nothing for a pitch class the frets leave out', () => {
    expect(fretOf(4, E, fretsIn({ start: 0, markedOnly: true }))).toBeUndefined() // E
  })
})

describe('roundOf', () => {
  it('has one prompt per spelling in the octave', () => {
    // E string marked frets 3–9: G A B C♯
    const round = roundOf({ string: E, octave: { start: 0, markedOnly: true } })
    expect(round.map((p) => p.spelling)).toEqual(['C♯', 'D♭', 'G', 'A', 'B'])
    expect(round.every((p) => p.string === E)).toBe(true)
  })

  it.each([
    ['sharps', ['C♯', 'G', 'A', 'B']],
    ['flats', ['D♭', 'G', 'A', 'B']],
  ] as const)('spells accidentals with %s only when asked', (accidentals, spellings) => {
    const round = roundOf({ string: E, octave: { start: 0, markedOnly: true }, accidentals })
    expect(round.map((p) => p.spelling)).toEqual(spellings)
  })

  it('spells every prompt with its pitch class', () => {
    for (const p of roundOf({ string: A, octave: { start: 0, markedOnly: false } })) {
      expect(spellingsOf(p.pitchClass)).toContain(p.spelling)
    }
  })
})

const prompt = (spelling: string, pitchClass: number): Prompt => ({ string: E, pitchClass, spelling })
const A_ = prompt('A', 9)
const As = prompt('A♯', 10)
const Bb = prompt('B♭', 10)
const B = prompt('B', 11)

describe('deal', () => {
  const octave: PromptOptions = { string: G, octave: { start: 0, markedOnly: false } }

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
    const deck = roundOf(octave)
    for (let i = 0; i < 100; i++) expect(deck).toContain(deal(deck, Math.random))
  })

  it('never repeats a pitch class, within or across rounds', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      for (const options of [octave, { ...octave, octave: { start: 5, markedOnly: true } }, { ...octave, accidentals: 'sharps' as const }]) {
        const dealt = dealRounds(options, 20, seeded(seed))
        dealt.slice(1).forEach((p, i) => expect(p.pitchClass).not.toBe(dealt[i].pitchClass))
      }
    }
  })

  it('never strands a sharp next to its flat', () => {
    // A♯, B♭ and B. Dealing B first would leave A♯ and B♭ to follow each other.
    const deck = [As, Bb, B]
    const previous: Prompt = { string: E, pitchClass: 9, spelling: 'A' }
    for (const r of [0, 0.5, 0.99]) expect(deal(deck, () => r, previous).spelling).not.toBe('B')
  })

  it('repeats only when no other prompt is possible', () => {
    // A, A♯ and B♭. After A♯ ends a round, the next round can't avoid a repeat.
    expect(deal([A_, As, Bb], () => 0, As).spelling).toBe('A')
    expect(deal([A_], () => 0, A_)).toBe(A_)
  })
})

describe('canFollow', () => {
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

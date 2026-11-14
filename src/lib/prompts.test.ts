import { describe, expect, it } from 'vitest'
import { STANDARD_TUNING, spellingsOf } from './notes'
import {
  MARKED_FRETS,
  type Prompt,
  fretsIn,
  isCorrect,
  nextPrompt,
  pitchClassesOnString,
  positionsOf,
} from './prompts'

const [E, A, D, G] = STANDARD_TUNING

/** A deterministic random source cycling through the given values. */
function sequence(...values: number[]): () => number {
  let i = 0
  return () => values[i++ % values.length]
}

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
    expect(fretsIn({ kind: 'span', from: 0, to: 3 })).toEqual([0, 1, 2, 3])
  })

  it('lists the marked frets, without the open string', () => {
    expect(fretsIn({ kind: 'marked' })).toEqual([3, 5, 7, 9, 12, 15, 17, 19, 21])
    expect(MARKED_FRETS).not.toContain(0)
  })
})

describe('pitchClassesOnString', () => {
  it('lists each distinct pitch class once', () => {
    // E string marked frets: G A B C♯ E G A B C♯
    expect(pitchClassesOnString(E, fretsIn({ kind: 'marked' }))).toEqual([1, 4, 7, 9, 11])
  })

  it('covers all twelve pitch classes over a full span', () => {
    expect(pitchClassesOnString(A, fretsIn({ kind: 'span', from: 0, to: 21 }))).toHaveLength(12)
  })
})

describe('positionsOf', () => {
  it('finds every fret on the string where the pitch class lies', () => {
    expect(positionsOf(7, E, fretsIn({ kind: 'span', from: 0, to: 21 }))).toEqual([3, 15]) // G
    expect(positionsOf(2, D, fretsIn({ kind: 'span', from: 0, to: 21 }))).toEqual([0, 12]) // D
  })

  it('respects the fret range', () => {
    expect(positionsOf(7, E, fretsIn({ kind: 'span', from: 5, to: 21 }))).toEqual([15])
  })
})

describe('nextPrompt', () => {
  const fullNeck = { kind: 'span', from: 0, to: 21 } as const

  it('prompts on the given string', () => {
    const p = nextPrompt({ string: G, range: fullNeck }, seeded(1))
    expect(p.string).toBe(G)
  })

  it('draws only pitch classes reachable within the fret range', () => {
    const random = seeded(2)
    const reachable = pitchClassesOnString(E, fretsIn({ kind: 'marked' }))
    for (let i = 0; i < 200; i++) {
      const p = nextPrompt({ string: E, range: { kind: 'marked' } }, random)
      expect(reachable).toContain(p.pitchClass)
    }
  })

  it('makes every reachable pitch class equally likely, regardless of how often it occurs', () => {
    // On the E string's marked frets, G/A/B/C♯ occur twice and E once.
    const random = seeded(3)
    const counts = new Map<number, number>()
    const n = 10000
    for (let i = 0; i < n; i++) {
      const p = nextPrompt({ string: E, range: { kind: 'marked' } }, random)
      counts.set(p.pitchClass, (counts.get(p.pitchClass) ?? 0) + 1)
    }
    // The no-repeat rule doesn't favour any pitch class; each should be near n/5.
    for (const count of counts.values()) {
      expect(count).toBeGreaterThan(n / 5 - 300)
      expect(count).toBeLessThan(n / 5 + 300)
    }
  })

  it('spells the prompt with one of its pitch class spellings', () => {
    const random = seeded(4)
    for (let i = 0; i < 200; i++) {
      const p = nextPrompt({ string: A, range: fullNeck }, random)
      expect(spellingsOf(p.pitchClass)).toContain(p.spelling)
    }
  })

  it('uses both spellings for accidentals', () => {
    // pitch class index 0 (C♯ on the E string's marked frets), then spelling 0 or 1
    const sharp = nextPrompt({ string: E, range: { kind: 'marked' } }, sequence(0, 0))
    const flat = nextPrompt({ string: E, range: { kind: 'marked' } }, sequence(0, 0.9))
    expect(sharp.spelling).toBe('C♯')
    expect(flat.spelling).toBe('D♭')
  })

  it.each([
    ['sharps', '♯'],
    ['flats', '♭'],
  ] as const)('spells accidentals with %s only when asked', (accidentals, symbol) => {
    const random = seeded(7)
    for (let i = 0; i < 200; i++) {
      const p = nextPrompt({ string: A, range: fullNeck, accidentals }, random)
      if (p.spelling.length > 1) expect(p.spelling).toContain(symbol)
    }
  })

  it('never repeats the previous prompt', () => {
    const random = seeded(5)
    const options = { string: E, range: { kind: 'span', from: 0, to: 2 } } as const
    let previous: Prompt | undefined
    for (let i = 0; i < 500; i++) {
      const p = nextPrompt(options, random, previous)
      if (previous) expect(p.pitchClass).not.toBe(previous.pitchClass)
      previous = p
    }
  })

  it('repeats when only one prompt is possible', () => {
    const options = { string: E, range: { kind: 'span', from: 5, to: 5 } } as const
    const first = nextPrompt(options, Math.random)
    const second = nextPrompt(options, Math.random, first)
    expect(second.pitchClass).toBe(9)
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

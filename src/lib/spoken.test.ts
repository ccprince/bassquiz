import { describe, expect, it } from 'vitest'
import { STANDARD_TUNING } from './notes'
import type { Prompt } from './prompts'
import { clipFile, everyPhrase, spokenPrompt, spokenReveal, spokenSpelling, spokenWrong } from './spoken'

const [E] = STANDARD_TUNING

const prompt = (spelling: string, pitchClass: number): Prompt => ({ string: E, pitchClass, spelling, midi: 28 + ((pitchClass + 8) % 12) })

describe('spokenSpelling', () => {
  it('writes accidentals out as words', () => {
    expect(spokenSpelling('A')).toBe('A')
    expect(spokenSpelling('A♯')).toBe('A sharp')
    expect(spokenSpelling('B♭')).toBe('B flat')
  })
})

describe('spokenPrompt', () => {
  it('names the spelling but not the string', () => {
    expect(spokenPrompt(prompt('C♯', 1))).toBe('C sharp.')
  })
})

describe('spokenWrong', () => {
  it('names a natural', () => {
    expect(spokenWrong(31, prompt('A', 9), 'both')).toBe('That was G.')
  })

  it('uses the chosen accidentals', () => {
    expect(spokenWrong(30, prompt('A', 9), 'sharps')).toBe('That was F sharp.')
    expect(spokenWrong(30, prompt('A', 9), 'flats')).toBe('That was G flat.')
  })

  it('with both spellings, follows the prompt', () => {
    expect(spokenWrong(30, prompt('B♭', 10), 'both')).toBe('That was G flat.')
    expect(spokenWrong(30, prompt('A♯', 10), 'both')).toBe('That was F sharp.')
    expect(spokenWrong(30, prompt('A', 9), 'both')).toBe('That was F sharp.')
  })
})

describe('spokenReveal', () => {
  it('names the fret', () => {
    expect(spokenReveal(6)).toBe('Fret 6.')
  })

  it('names the open string', () => {
    expect(spokenReveal(0)).toBe('Open.')
  })
})

describe('clipFile', () => {
  it('names a clip after its phrase', () => {
    expect(clipFile('That was G flat.')).toBe('that-was-g-flat.mp3')
    expect(clipFile('Fret 12.')).toBe('fret-12.mp3')
  })
})

describe('everyPhrase', () => {
  const phrases = everyPhrase()

  it('covers every prompt, wrong answer, wrong octave and reveal', () => {
    expect(phrases).toContain('A sharp.')
    expect(phrases.filter((p) => p.startsWith('That was'))).toHaveLength(17)
    expect(phrases.filter((p) => p.startsWith('Fret') || p.startsWith('Open'))).toHaveLength(25)
    expect(phrases).toContain('Wrong octave.')
    expect(phrases).toHaveLength(17 + 17 + 1 + 25)
  })

  it('gives every phrase its own clip', () => {
    expect(new Set(phrases.map(clipFile)).size).toBe(phrases.length)
  })

  it('has a recording of every phrase; run `npm run clips` if not', () => {
    const recorded = Object.keys(import.meta.glob('../../public/clips/*.mp3')).map((path) => path.split('/').pop())
    expect(phrases.map(clipFile).filter((file) => !recorded.includes(file))).toEqual([])
  })
})

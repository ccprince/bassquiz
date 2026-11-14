import { describe, expect, it } from 'vitest'
import { STANDARD_TUNING } from './notes'
import type { Prompt } from './prompts'
import { spokenPrompt, spokenReveal, spokenSpelling, spokenWrong } from './spoken'

const [E] = STANDARD_TUNING

const prompt = (spelling: string, pitchClass: number): Prompt => ({ string: E, pitchClass, spelling })

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
  it('names one fret', () => {
    expect(spokenReveal([6])).toBe('Fret 6.')
  })

  it('names every fret', () => {
    expect(spokenReveal([6, 18])).toBe('Fret 6 or 18.')
  })

  it('names the open string', () => {
    expect(spokenReveal([0])).toBe('Open.')
    expect(spokenReveal([0, 12, 24])).toBe('Open or fret 12 or 24.')
  })
})

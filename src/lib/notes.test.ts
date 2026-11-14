import { describe, expect, it } from 'vitest'
import {
  STANDARD_TUNING,
  frequencyToMidi,
  nearestNote,
  noteName,
  pitchClassOf,
  spellingsOf,
} from './notes'

describe('pitchClassOf', () => {
  it('maps MIDI numbers to pitch classes with C = 0', () => {
    expect(pitchClassOf(60)).toBe(0) // C4
    expect(pitchClassOf(28)).toBe(4) // E1
    expect(pitchClassOf(33)).toBe(9) // A1
    expect(pitchClassOf(71)).toBe(11) // B4
  })
})

describe('spellingsOf', () => {
  it('gives a natural a single spelling', () => {
    expect(spellingsOf(9)).toEqual(['A'])
  })

  it('gives an accidental both enharmonic spellings, sharp first', () => {
    expect(spellingsOf(10)).toEqual(['A♯', 'B♭'])
    expect(spellingsOf(1)).toEqual(['C♯', 'D♭'])
  })

  it('can limit accidentals to sharps or flats', () => {
    expect(spellingsOf(10, 'sharps')).toEqual(['A♯'])
    expect(spellingsOf(10, 'flats')).toEqual(['B♭'])
    expect(spellingsOf(10, 'both')).toEqual(['A♯', 'B♭'])
  })

  it('leaves naturals alone whatever the accidentals', () => {
    expect(spellingsOf(9, 'sharps')).toEqual(['A'])
    expect(spellingsOf(9, 'flats')).toEqual(['A'])
  })
})

describe('noteName', () => {
  it('names a MIDI note by pitch class using both spellings for accidentals', () => {
    expect(noteName(33)).toBe('A')
    expect(noteName(34)).toBe('A♯/B♭')
  })

  it('follows the chosen accidentals', () => {
    expect(noteName(34, 'sharps')).toBe('A♯')
    expect(noteName(34, 'flats')).toBe('B♭')
  })
})

describe('frequencyToMidi', () => {
  it('uses A4 = 440 Hz', () => {
    expect(frequencyToMidi(440)).toBeCloseTo(69)
    expect(frequencyToMidi(41.2034)).toBeCloseTo(28, 3) // low E
    expect(frequencyToMidi(880)).toBeCloseTo(81)
  })
})

describe('nearestNote', () => {
  it('rounds to the nearest semitone and reports the deviation in cents', () => {
    const flatA = 110 * Math.pow(2, -12 / 1200)
    expect(nearestNote(flatA).midi).toBe(45)
    expect(nearestNote(flatA).cents).toBeCloseTo(-12)
  })

  it('rounds a note just past the halfway point to the upper semitone', () => {
    const sharpA = 110 * Math.pow(2, 55 / 1200)
    expect(nearestNote(sharpA).midi).toBe(46)
    expect(nearestNote(sharpA).cents).toBeCloseTo(-45)
  })
})

describe('STANDARD_TUNING', () => {
  it('is E A D G, lowest string first', () => {
    expect(STANDARD_TUNING.map((s) => s.name)).toEqual(['E', 'A', 'D', 'G'])
    expect(STANDARD_TUNING.map((s) => s.openMidi)).toEqual([28, 33, 38, 43])
  })
})

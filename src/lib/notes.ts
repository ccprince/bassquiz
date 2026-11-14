/** A pitch class, 0–11 with C = 0. */
export type PitchClass = number

/** Which spellings to use for accidentals. */
export type Accidentals = 'sharps' | 'flats' | 'both'

export interface BassString {
  /** The note name of the open string, which is also how the string is named. */
  name: string
  openMidi: number
}

export type Tuning = readonly BassString[]

export const STANDARD_TUNING: Tuning = [
  { name: 'E', openMidi: 28 },
  { name: 'A', openMidi: 33 },
  { name: 'D', openMidi: 38 },
  { name: 'G', openMidi: 43 },
]

const SPELLINGS: readonly (readonly string[])[] = [
  ['C'],
  ['C♯', 'D♭'],
  ['D'],
  ['D♯', 'E♭'],
  ['E'],
  ['F'],
  ['F♯', 'G♭'],
  ['G'],
  ['G♯', 'A♭'],
  ['A'],
  ['A♯', 'B♭'],
  ['B'],
]

const A4_MIDI = 69
const A4_HZ = 440

export function pitchClassOf(midi: number): PitchClass {
  return ((midi % 12) + 12) % 12
}

/** Spellings of a pitch class; an accidental has a sharp spelling first, then a flat one. */
export function spellingsOf(pc: PitchClass, accidentals: Accidentals = 'both'): readonly string[] {
  const spellings = SPELLINGS[pc]
  if (spellings.length === 1 || accidentals === 'both') return spellings
  return [accidentals === 'sharps' ? spellings[0] : spellings[1]]
}

export function noteName(midi: number, accidentals: Accidentals = 'both'): string {
  return spellingsOf(pitchClassOf(midi), accidentals).join('/')
}

export function frequencyToMidi(hz: number): number {
  return A4_MIDI + 12 * Math.log2(hz / A4_HZ)
}

export function nearestNote(hz: number): { midi: number; cents: number } {
  const exact = frequencyToMidi(hz)
  const midi = Math.round(exact)
  return { midi, cents: (exact - midi) * 100 }
}

/** A pitch class, 0–11 with C = 0. */
export type PitchClass = number

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

export function spellingsOf(pc: PitchClass): readonly string[] {
  return SPELLINGS[pc]
}

export function noteName(midi: number): string {
  return spellingsOf(pitchClassOf(midi)).join('/')
}

export function frequencyToMidi(hz: number): number {
  return A4_MIDI + 12 * Math.log2(hz / A4_HZ)
}

export function nearestNote(hz: number): { midi: number; cents: number } {
  const exact = frequencyToMidi(hz)
  const midi = Math.round(exact)
  return { midi, cents: (exact - midi) * 100 }
}

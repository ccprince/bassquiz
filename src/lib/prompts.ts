import { type Accidentals, type BassString, type PitchClass, pitchClassOf, spellingsOf } from './notes'

export const MARKED_FRETS: readonly number[] = [3, 5, 7, 9, 12, 15, 17, 19, 21, 24]

/** How many frets an octave spans: each pitch class lies at exactly one of them. */
export const OCTAVE_FRETS = 12

/** Twelve consecutive frets from `start`, optionally narrowed to the marked frets within them. */
export interface Octave {
  start: number
  markedOnly: boolean
}

export interface Prompt {
  string: BassString
  pitchClass: PitchClass
  spelling: string
}

export interface PromptOptions {
  string: BassString
  octave: Octave
  /** Defaults to both spellings. */
  accidentals?: Accidentals
}

export type Random = () => number

export function fretsIn(octave: Octave): number[] {
  const frets = Array.from({ length: OCTAVE_FRETS }, (_, i) => octave.start + i)
  return octave.markedOnly ? frets.filter((f) => MARKED_FRETS.includes(f)) : frets
}

export function pitchClassesOnString(string: BassString, frets: readonly number[]): PitchClass[] {
  const pcs = new Set(frets.map((f) => pitchClassOf(string.openMidi + f)))
  return [...pcs].sort((a, b) => a - b)
}

/** The fret where a pitch class lies among `frets`, which never hold it twice when they're within one octave. */
export function fretOf(pc: PitchClass, string: BassString, frets: readonly number[]): number | undefined {
  return frets.find((f) => pitchClassOf(string.openMidi + f) === pc)
}

function pick<T>(items: readonly T[], random: Random): T {
  return items[Math.floor(random() * items.length)]
}

/** Every prompt a round asks: one per spelling in the octave, lowest pitch class first. */
export function roundOf(options: PromptOptions): Prompt[] {
  const { string } = options
  return pitchClassesOnString(string, fretsIn(options.octave)).flatMap((pitchClass) =>
    spellingsOf(pitchClass, options.accidentals).map((spelling) => ({ string, pitchClass, spelling })),
  )
}

/**
 * Picks the next prompt from what's left of a round. Never repeats the pitch class of `previous`, and never
 * leaves the rest of the round unable to avoid a repeat, unless no other prompt is possible.
 */
export function deal(deck: readonly Prompt[], random: Random, previous?: Prompt): Prompt {
  const fresh = deck.filter((p) => p.pitchClass !== previous?.pitchClass)
  const safe = fresh.filter((p) => canFollow(without(deck, p), p.pitchClass))
  return pick(safe.length ? safe : fresh.length ? fresh : deck, random)
}

/** Whether `deck` can be asked in some order with no pitch class twice in a row, starting after `last`. */
export function canFollow(deck: readonly Prompt[], last: PitchClass): boolean {
  // With at most two spellings per pitch class, only a deck of two or three can be stuck,
  // so this search never backtracks far.
  return deck.length === 0 || deck.some((p) => p.pitchClass !== last && canFollow(without(deck, p), p.pitchClass))
}

function without(deck: readonly Prompt[], prompt: Prompt): Prompt[] {
  return deck.filter((p) => p !== prompt)
}

/** An answer is correct when its pitch class matches; the string is taken on trust. */
export function isCorrect(prompt: Prompt, midi: number): boolean {
  return pitchClassOf(midi) === prompt.pitchClass
}

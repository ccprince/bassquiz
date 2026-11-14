import { type Accidentals, type BassString, type PitchClass, pitchClassOf, spellingsOf } from './notes'

export const MARKED_FRETS: readonly number[] = [3, 5, 7, 9, 12, 15, 17, 19, 21, 24]

/** A span of frets, optionally narrowed to the marked frets within it. */
export interface FretRange {
  from: number
  to: number
  markedOnly: boolean
}

export interface Prompt {
  string: BassString
  pitchClass: PitchClass
  spelling: string
}

export interface PromptOptions {
  string: BassString
  range: FretRange
  /** Defaults to both spellings. */
  accidentals?: Accidentals
}

export type Random = () => number

export function fretsIn(range: FretRange): number[] {
  const frets: number[] = []
  for (let f = range.from; f <= range.to; f++) frets.push(f)
  return range.markedOnly ? frets.filter((f) => MARKED_FRETS.includes(f)) : frets
}

export function pitchClassesOnString(string: BassString, frets: readonly number[]): PitchClass[] {
  const pcs = new Set(frets.map((f) => pitchClassOf(string.openMidi + f)))
  return [...pcs].sort((a, b) => a - b)
}

export function positionsOf(pc: PitchClass, string: BassString, frets: readonly number[]): number[] {
  return frets.filter((f) => pitchClassOf(string.openMidi + f) === pc)
}

function pick<T>(items: readonly T[], random: Random): T {
  return items[Math.floor(random() * items.length)]
}

/** Every prompt a round asks: one per spelling reachable in the fret range, lowest pitch class first. */
export function roundOf(options: PromptOptions): Prompt[] {
  const { string } = options
  return pitchClassesOnString(string, fretsIn(options.range)).flatMap((pitchClass) =>
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

import { type Accidentals, type BassString, type PitchClass, pitchClassOf, spellingsOf } from './notes'

export const MARKED_FRETS: readonly number[] = [3, 5, 7, 9, 12, 15, 17, 19, 21]

export type FretRange = { kind: 'span'; from: number; to: number } | { kind: 'marked' }

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
  if (range.kind === 'marked') return [...MARKED_FRETS]
  const frets: number[] = []
  for (let f = range.from; f <= range.to; f++) frets.push(f)
  return frets
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

/**
 * Picks a random pitch class reachable on the string, so every note name is
 * equally likely however often it occurs on the neck.
 * Never repeats `previous` unless no other prompt is possible.
 */
export function nextPrompt(options: PromptOptions, random: Random, previous?: Prompt): Prompt {
  const { string } = options
  const pitchClasses = pitchClassesOnString(string, fretsIn(options.range))
  const candidates =
    pitchClasses.length > 1 ? pitchClasses.filter((pc) => pc !== previous?.pitchClass) : pitchClasses
  const pitchClass = pick(candidates, random)
  const spelling = pick(spellingsOf(pitchClass, options.accidentals), random)
  return { string, pitchClass, spelling }
}

/** An answer is correct when its pitch class matches; the string is taken on trust. */
export function isCorrect(prompt: Prompt, midi: number): boolean {
  return pitchClassOf(midi) === prompt.pitchClass
}

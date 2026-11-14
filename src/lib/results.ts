import { type PitchClass, spellingsOf } from './notes'
import { type PromptOptions, fretsIn, pitchClassesOnString, positionsOf } from './prompts'

/** How one prompt went, recorded when it was answered correctly. */
export interface PromptResult {
  spelling: string
  pitchClass: PitchClass
  /** Wrong answers before the right one. */
  wrong: number
  revealed: boolean
  /** From the prompt being shown to the right answer. */
  ms: number
}

/** A drill that has stopped, as shown on the results screen. */
export interface FinishedDrill {
  results: readonly PromptResult[]
  options: PromptOptions
  durationMs: number
}

export const isMiss = (r: PromptResult) => r.wrong > 0 || r.revealed

/** How often a note was missed when it was asked. */
export type Grade = 'never' | 'sometimes' | 'always' | 'unasked'

export interface SpellingResults {
  spelling: string
  asked: number
  missed: number
}

export interface NoteResults {
  pitchClass: PitchClass
  /** Its spellings joined, e.g. "A♯/B♭". */
  name: string
  /** Where it lies within the drill's fret range. */
  frets: number[]
  asked: number
  missed: number
  wrong: number
  revealed: number
  medianMs: number | null
  grade: Grade
  spellings: SpellingResults[]
}

export interface Summary {
  answered: number
  missed: number
  /** Share of prompts answered right first time, 0–1. */
  firstTime: number
  wrong: number
  revealed: number
  medianMs: number | null
  /** Most prompts in a row answered right first time. */
  bestStreak: number
}

export function median(xs: readonly number[]): number | null {
  if (xs.length === 0) return null
  const sorted = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export function summarize(results: readonly PromptResult[]): Summary {
  const missed = results.filter(isMiss).length
  let streak = 0
  let bestStreak = 0
  for (const r of results) {
    streak = isMiss(r) ? 0 : streak + 1
    bestStreak = Math.max(bestStreak, streak)
  }
  return {
    answered: results.length,
    missed,
    firstTime: results.length ? (results.length - missed) / results.length : 0,
    wrong: results.reduce((n, r) => n + r.wrong, 0),
    revealed: results.filter((r) => r.revealed).length,
    medianMs: median(results.map((r) => r.ms)),
    bestStreak,
  }
}

function grade(asked: number, missed: number): Grade {
  if (asked === 0) return 'unasked'
  if (missed === 0) return 'never'
  return missed === asked ? 'always' : 'sometimes'
}

/** Results for every note the drill could have asked, lowest pitch class first. */
export function byNote(results: readonly PromptResult[], options: PromptOptions): NoteResults[] {
  const frets = fretsIn(options.range)
  return pitchClassesOnString(options.string, frets).map((pitchClass) => {
    const asked = results.filter((r) => r.pitchClass === pitchClass)
    const missed = asked.filter(isMiss).length
    const spellings = spellingsOf(pitchClass, options.accidentals)
    return {
      pitchClass,
      name: spellings.join('/'),
      frets: positionsOf(pitchClass, options.string, frets),
      asked: asked.length,
      missed,
      wrong: asked.reduce((n, r) => n + r.wrong, 0),
      revealed: asked.filter((r) => r.revealed).length,
      medianMs: median(asked.map((r) => r.ms)),
      grade: grade(asked.length, missed),
      spellings: spellings.map((spelling) => {
        const of = asked.filter((r) => r.spelling === spelling)
        return { spelling, asked: of.length, missed: of.filter(isMiss).length }
      }),
    }
  })
}

/** Missed spellings, most often missed (as a share of times asked) first. */
export function toWorkOn(notes: readonly NoteResults[]): SpellingResults[] {
  return notes
    .flatMap((n) => n.spellings)
    .filter((s) => s.missed > 0)
    .sort((a, b) => b.missed / b.asked - a.missed / a.asked || b.missed - a.missed)
}

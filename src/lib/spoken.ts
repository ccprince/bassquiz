import { type Accidentals, pitchClassOf, spellingsOf } from './notes'
import type { Prompt } from './prompts'

/** A spelling as words a speech engine reads reliably: "A♯" becomes "A sharp". */
export function spokenSpelling(spelling: string): string {
  return spelling.replace('♯', ' sharp').replace('♭', ' flat')
}

/** A spoken prompt names only the spelling; the player already knows the active string. */
export function spokenPrompt(prompt: Prompt): string {
  return `${spokenSpelling(prompt.spelling)}.`
}

/**
 * Names a wrong answer. With both spellings on offer, it's spelled the way the prompt was, so a flat
 * prompt hears flats back.
 */
export function spokenWrong(midi: number, prompt: Prompt, accidentals: Accidentals): string {
  const spellings = spellingsOf(pitchClassOf(midi), accidentals)
  const spelling = spellings.length > 1 && prompt.spelling.includes('♭') ? spellings[1] : spellings[0]
  return `That was ${spokenSpelling(spelling)}.`
}

/** Where a revealed prompt lies: "Fret 6 or 18", or "Open or fret 12" when it includes the open string. */
export function spokenReveal(frets: readonly number[]): string {
  const fretted = frets.filter((f) => f > 0)
  const list = fretted.join(' or ')
  if (fretted.length === frets.length) return `Fret ${list}.`
  return fretted.length ? `Open or fret ${list}.` : 'Open.'
}

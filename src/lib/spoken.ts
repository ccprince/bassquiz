import { type Accidentals, STANDARD_TUNING, pitchClassOf, spellingsOf } from './notes'
import { type Prompt, roundOf } from './prompts'
import { MAX_FRET } from './settings'

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

/** Said for an answer with the prompt's pitch class but not its pitch. */
export const SPOKEN_WRONG_OCTAVE = 'Wrong octave.'

/** Where a revealed prompt lies: "Fret 6", or "Open" for the open string. */
export function spokenReveal(fret: number): string {
  return fret === 0 ? 'Open.' : `Fret ${fret}.`
}

/** The file holding a phrase's recording: "That was G flat." is that-was-g-flat.mp3. */
export function clipFile(phrase: string): string {
  return `${phrase
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}.mp3`
}

/** Everything a drill can say, each once: every prompt, every wrong answer, wrong octave, and every reveal. */
export function everyPhrase(): string[] {
  const phrases = new Set<string>()
  const string = STANDARD_TUNING[0]
  const prompts: Prompt[] = roundOf({ string, octave: { start: 0, markedOnly: false } })
  for (const prompt of prompts) phrases.add(spokenPrompt(prompt))
  for (const accidentals of ['sharps', 'flats', 'both'] as const) {
    for (const prompt of prompts) {
      for (let midi = 0; midi < 12; midi++) phrases.add(spokenWrong(midi, prompt, accidentals))
    }
  }
  phrases.add(SPOKEN_WRONG_OCTAVE)
  for (let fret = 0; fret <= MAX_FRET; fret++) phrases.add(spokenReveal(fret))
  return [...phrases]
}

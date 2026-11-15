import { type Accidentals, STANDARD_TUNING } from './notes'
import { type Octave, OCTAVE_FRETS } from './prompts'

export const MAX_FRET = 24
/** The highest fret an octave can start at and still fit on the neck. */
export const LAST_START = MAX_FRET - OCTAVE_FRETS + 1

/** The drill lengths on offer, in rounds. */
export const ROUND_CHOICES: readonly number[] = [1, 2, 3, 5]

export interface Settings {
  /** Name of the string the drill prompts on. */
  activeString: string
  octave: Octave
  accidentals: Accidentals
  /** How many rounds a drill runs for; null for open-ended. */
  rounds: number | null
  /** Input level below which sound counts as silence. */
  gate: number
  /** Whether drills speak their prompts and give feedback as sound. */
  spokenPrompts: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  activeString: STANDARD_TUNING[0].name,
  octave: { start: 0, markedOnly: false },
  accidentals: 'both',
  rounds: null,
  gate: 0.01,
  spokenPrompts: false,
}

const KEY = 'bassquiz.settings'

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>

const STRING_NAMES = new Set(STANDARD_TUNING.map((s) => s.name))

function isActiveString(value: unknown): value is string {
  return typeof value === 'string' && STRING_NAMES.has(value)
}

function isOctave(value: unknown): value is Octave {
  if (typeof value !== 'object' || value === null) return false
  const { start, markedOnly } = value as Record<string, unknown>
  return (
    typeof markedOnly === 'boolean' &&
    Number.isInteger(start) &&
    (start as number) >= 0 &&
    (start as number) <= LAST_START
  )
}

function isAccidentals(value: unknown): value is Accidentals {
  return value === 'sharps' || value === 'flats' || value === 'both'
}

function isRounds(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && ROUND_CHOICES.includes(value))
}

function isGate(value: unknown): value is number {
  return typeof value === 'number' && value > 0 && value < 1
}

export function loadSettings(storage: Storage): Settings {
  let stored: Record<string, unknown>
  try {
    stored = JSON.parse(storage.getItem(KEY) ?? '{}')
  } catch {
    return DEFAULT_SETTINGS
  }
  return {
    activeString: isActiveString(stored.activeString) ? stored.activeString : DEFAULT_SETTINGS.activeString,
    octave: isOctave(stored.octave) ? stored.octave : DEFAULT_SETTINGS.octave,
    accidentals: isAccidentals(stored.accidentals) ? stored.accidentals : DEFAULT_SETTINGS.accidentals,
    rounds: isRounds(stored.rounds) ? stored.rounds : DEFAULT_SETTINGS.rounds,
    gate: isGate(stored.gate) ? stored.gate : DEFAULT_SETTINGS.gate,
    spokenPrompts: typeof stored.spokenPrompts === 'boolean' ? stored.spokenPrompts : DEFAULT_SETTINGS.spokenPrompts,
  }
}

export function saveSettings(storage: Storage, settings: Settings): void {
  try {
    storage.setItem(KEY, JSON.stringify(settings))
  } catch {
    // Storage may be unavailable (private mode, blocked site data); settings just won't persist.
  }
}

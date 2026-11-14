import { type Accidentals, STANDARD_TUNING } from './notes'
import type { FretRange } from './prompts'

export const MAX_FRET = 24

/** The drill lengths on offer, in rounds. */
export const ROUND_CHOICES: readonly number[] = [1, 2, 3, 5]

export interface Settings {
  /** Name of the string the drill prompts on. */
  activeString: string
  range: FretRange
  accidentals: Accidentals
  /** How many rounds a drill runs for; null for open-ended. */
  rounds: number | null
  /** Input level below which sound counts as silence. */
  gate: number
}

export const DEFAULT_SETTINGS: Settings = {
  activeString: STANDARD_TUNING[0].name,
  range: { from: 0, to: MAX_FRET, markedOnly: false },
  accidentals: 'both',
  rounds: null,
  gate: 0.01,
}

const KEY = 'bassquiz.settings'

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>

const STRING_NAMES = new Set(STANDARD_TUNING.map((s) => s.name))

function isActiveString(value: unknown): value is string {
  return typeof value === 'string' && STRING_NAMES.has(value)
}

function isFretRange(value: unknown): value is FretRange {
  if (typeof value !== 'object' || value === null) return false
  const range = value as Record<string, unknown>
  const { from, to } = range
  return (
    typeof range.markedOnly === 'boolean' &&
    Number.isInteger(from) &&
    Number.isInteger(to) &&
    (from as number) >= 0 &&
    (from as number) <= (to as number) &&
    (to as number) <= MAX_FRET
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
    range: isFretRange(stored.range) ? stored.range : DEFAULT_SETTINGS.range,
    accidentals: isAccidentals(stored.accidentals) ? stored.accidentals : DEFAULT_SETTINGS.accidentals,
    rounds: isRounds(stored.rounds) ? stored.rounds : DEFAULT_SETTINGS.rounds,
    gate: isGate(stored.gate) ? stored.gate : DEFAULT_SETTINGS.gate,
  }
}

export function saveSettings(storage: Storage, settings: Settings): void {
  try {
    storage.setItem(KEY, JSON.stringify(settings))
  } catch {
    // Storage may be unavailable (private mode, blocked site data); settings just won't persist.
  }
}

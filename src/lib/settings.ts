import { STANDARD_TUNING } from './notes'
import type { FretRange } from './prompts'

export const MAX_FRET = 21

export interface Settings {
  /** Names of the active strings. */
  activeStrings: string[]
  range: FretRange
  /** Input level below which sound counts as silence. */
  gate: number
}

export const DEFAULT_SETTINGS: Settings = {
  activeStrings: STANDARD_TUNING.map((s) => s.name),
  range: { kind: 'span', from: 0, to: MAX_FRET },
  gate: 0.01,
}

const KEY = 'bassquiz.settings'

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>

const STRING_NAMES = new Set(STANDARD_TUNING.map((s) => s.name))

function isActiveStrings(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.length > 0 && value.every((v) => typeof v === 'string' && STRING_NAMES.has(v))
  )
}

function isFretRange(value: unknown): value is FretRange {
  if (typeof value !== 'object' || value === null) return false
  const range = value as Record<string, unknown>
  if (range.kind === 'marked') return true
  const { from, to } = range
  return (
    range.kind === 'span' &&
    Number.isInteger(from) &&
    Number.isInteger(to) &&
    (from as number) >= 0 &&
    (from as number) <= (to as number) &&
    (to as number) <= MAX_FRET
  )
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
    activeStrings: isActiveStrings(stored.activeStrings) ? stored.activeStrings : DEFAULT_SETTINGS.activeStrings,
    range: isFretRange(stored.range) ? stored.range : DEFAULT_SETTINGS.range,
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

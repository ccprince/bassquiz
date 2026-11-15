import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, type Settings, loadSettings, saveSettings } from './settings'

function memoryStorage(initial: Record<string, string> = {}) {
  const data = { ...initial }
  return {
    data,
    getItem: (key: string) => data[key] ?? null,
    setItem: (key: string, value: string) => {
      data[key] = value
    },
  }
}

const custom: Settings = {
  activeString: 'A',
  octave: { start: 5, markedOnly: true },
  accidentals: 'flats',
  rounds: 3,
  gate: 0.03,
  spokenPrompts: true,
}

describe('settings', () => {
  it('defaults to the E string, the octave from the open string', () => {
    expect(DEFAULT_SETTINGS.activeString).toBe('E')
    expect(DEFAULT_SETTINGS.octave).toEqual({ start: 0, markedOnly: false })
    expect(DEFAULT_SETTINGS.accidentals).toBe('both')
    expect(DEFAULT_SETTINGS.rounds).toBeNull()
    expect(DEFAULT_SETTINGS.spokenPrompts).toBe(false)
  })

  it('round-trips through storage', () => {
    const storage = memoryStorage()
    saveSettings(storage, custom)
    expect(loadSettings(storage)).toEqual(custom)
  })

  it('round-trips an open-ended drill', () => {
    const storage = memoryStorage()
    saveSettings(storage, { ...custom, rounds: null })
    expect(loadSettings(storage).rounds).toBeNull()
  })

  it('falls back to defaults when nothing is stored', () => {
    expect(loadSettings(memoryStorage())).toEqual(DEFAULT_SETTINGS)
  })

  it('falls back to defaults for unreadable data', () => {
    expect(loadSettings(memoryStorage({ 'bassquiz.settings': '{nope' }))).toEqual(DEFAULT_SETTINGS)
  })

  it('keeps valid fields and replaces invalid ones', () => {
    const stored = JSON.stringify({
      activeString: 'X',
      octave: { start: 5, markedOnly: true },
      accidentals: 'naturals',
      rounds: 4,
      gate: 'loud',
      spokenPrompts: 'yes',
    })
    expect(loadSettings(memoryStorage({ 'bassquiz.settings': stored }))).toEqual({
      ...DEFAULT_SETTINGS,
      octave: { start: 5, markedOnly: true },
    })
  })

  it('rejects a malformed octave', () => {
    for (const octave of [
      { start: -1, markedOnly: false },
      { start: 14, markedOnly: false },
      { start: 2.5, markedOnly: false },
      { start: 5 },
      { kind: 'marked' },
    ]) {
      const stored = JSON.stringify({ ...custom, octave })
      expect(loadSettings(memoryStorage({ 'bassquiz.settings': stored })).octave).toEqual(DEFAULT_SETTINGS.octave)
    }
  })

  it('starts from the open string when an old fret range is stored', () => {
    const { octave, ...rest } = custom
    const stored = JSON.stringify({ ...rest, range: { from: 5, to: 12, markedOnly: true } })
    expect(loadSettings(memoryStorage({ 'bassquiz.settings': stored })).octave).toEqual(DEFAULT_SETTINGS.octave)
  })

  it('survives storage that throws', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    }
    expect(loadSettings(broken)).toEqual(DEFAULT_SETTINGS)
    expect(() => saveSettings(broken, custom)).not.toThrow()
  })
})

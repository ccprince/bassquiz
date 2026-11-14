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
  activeStrings: ['E'],
  range: { kind: 'marked' },
  gate: 0.03,
}

describe('settings', () => {
  it('defaults to every string, the full neck', () => {
    expect(DEFAULT_SETTINGS.activeStrings).toEqual(['E', 'A', 'D', 'G'])
    expect(DEFAULT_SETTINGS.range).toEqual({ kind: 'span', from: 0, to: 21 })
  })

  it('round-trips through storage', () => {
    const storage = memoryStorage()
    saveSettings(storage, custom)
    expect(loadSettings(storage)).toEqual(custom)
  })

  it('falls back to defaults when nothing is stored', () => {
    expect(loadSettings(memoryStorage())).toEqual(DEFAULT_SETTINGS)
  })

  it('falls back to defaults for unreadable data', () => {
    expect(loadSettings(memoryStorage({ 'bassquiz.settings': '{nope' }))).toEqual(DEFAULT_SETTINGS)
  })

  it('keeps valid fields and replaces invalid ones', () => {
    const stored = JSON.stringify({ activeStrings: ['X'], range: { kind: 'marked' }, gate: 'loud' })
    expect(loadSettings(memoryStorage({ 'bassquiz.settings': stored }))).toEqual({
      ...DEFAULT_SETTINGS,
      range: { kind: 'marked' },
    })
  })

  it('rejects a span outside the neck or running backwards', () => {
    for (const range of [
      { kind: 'span', from: -1, to: 5 },
      { kind: 'span', from: 5, to: 22 },
      { kind: 'span', from: 7, to: 3 },
    ]) {
      const stored = JSON.stringify({ ...custom, range })
      expect(loadSettings(memoryStorage({ 'bassquiz.settings': stored })).range).toEqual(DEFAULT_SETTINGS.range)
    }
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

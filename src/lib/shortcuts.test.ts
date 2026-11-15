import { describe, expect, it } from 'vitest'
import { type Shortcut, keyLabel, shortcutFor } from './shortcuts'

const press = (key: string, more: Partial<KeyboardEvent> = {}) => ({
  key,
  repeat: false,
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  ...more,
})

const strings: Shortcut = { keys: ['E', 'A'], does: 'Pick the string', run: () => {} }
const start: Shortcut = { keys: ['Enter'], does: 'Start', run: () => {} }
const shortcuts = [strings, start]

describe('shortcuts', () => {
  it('finds the shortcut for a key, and which of its keys was pressed', () => {
    expect(shortcutFor(shortcuts, press('Enter'))).toEqual({ shortcut: start, key: 'Enter' })
    expect(shortcutFor(shortcuts, press('A'))).toEqual({ shortcut: strings, key: 'A' })
  })

  it('matches letters in either case', () => {
    expect(shortcutFor(shortcuts, press('a'))).toEqual({ shortcut: strings, key: 'A' })
  })

  it('ignores other keys, held keys, and presses with modifiers', () => {
    expect(shortcutFor(shortcuts, press('x'))).toBeNull()
    expect(shortcutFor(shortcuts, press('Enter', { repeat: true }))).toBeNull()
    expect(shortcutFor(shortcuts, press('a', { ctrlKey: true }))).toBeNull()
    expect(shortcutFor(shortcuts, press('a', { metaKey: true }))).toBeNull()
    expect(shortcutFor(shortcuts, press('a', { altKey: true }))).toBeNull()
  })

  it('writes keys as they appear on the keyboard', () => {
    expect(keyLabel(' ')).toBe('Space')
    expect(keyLabel('Enter')).toBe('Enter')
    expect(keyLabel('Escape')).toBe('Esc')
    expect(keyLabel('ArrowLeft')).toBe('←')
    expect(keyLabel('r')).toBe('R')
    expect(keyLabel('?')).toBe('?')
  })
})

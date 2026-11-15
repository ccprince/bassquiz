/** A key, or several keys doing one kind of thing, and what pressing it does. */
export interface Shortcut {
  /** Values of `KeyboardEvent.key`; a letter matches in either case. */
  keys: readonly string[]
  /** What it does, for the list of shortcuts. */
  does: string
  /** Called with whichever of `keys` was pressed. */
  run: (key: string) => void
}

type Press = Pick<KeyboardEvent, 'key' | 'repeat' | 'metaKey' | 'ctrlKey' | 'altKey'>

const fold = (key: string) => (key.length === 1 ? key.toLowerCase() : key)

/**
 * The shortcut a key press triggers, and which of its keys it was. Holding a key down triggers nothing more,
 * and presses with Ctrl, Alt or Cmd are left to the browser.
 */
export function shortcutFor(
  shortcuts: readonly Shortcut[],
  press: Press,
): { shortcut: Shortcut; key: string } | null {
  if (press.repeat || press.metaKey || press.ctrlKey || press.altKey) return null
  for (const shortcut of shortcuts) {
    const key = shortcut.keys.find((k) => fold(k) === fold(press.key))
    if (key !== undefined) return { shortcut, key }
  }
  return null
}

const LABELS: Record<string, string> = {
  ' ': 'Space',
  Escape: 'Esc',
  Backspace: '⌫',
  ArrowLeft: '←',
  ArrowRight: '→',
}

/** How a key is written on screen. */
export function keyLabel(key: string): string {
  return LABELS[key] ?? (key.length === 1 ? key.toUpperCase() : key)
}

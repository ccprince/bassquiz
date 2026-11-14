import { describe, expect, it } from 'vitest'
import { answer, next, reveal, start } from './drill'
import { STANDARD_TUNING } from './notes'
import type { PromptOptions } from './prompts'
import { type PromptResult, byNote, median, summarize, toWorkOn } from './results'

const [E] = STANDARD_TUNING

const result = (spelling: string, pitchClass: number, more: Partial<PromptResult> = {}): PromptResult => ({
  spelling,
  pitchClass,
  wrong: 0,
  revealed: false,
  ms: 1000,
  ...more,
})

describe('recording results', () => {
  const options: PromptOptions = { string: E, range: { from: 0, to: 24, markedOnly: false } }
  const lowest = () => 0
  const heard = (pc: number) => ({ midi: 36 + pc, cents: 0 })

  it('records a prompt when it is answered correctly', () => {
    let state = start(options, lowest, 1000)
    state = answer(state, heard(state.prompt.pitchClass), 3500)
    expect(state.results).toEqual([result('C', 0, { ms: 2500 })])
  })

  it('records wrong answers and reveals, timed from when the prompt was shown', () => {
    let state = next(answer(start(options, lowest, 0), heard(0), 500), options, lowest, 2000)
    state = answer(state, heard(5), 2500)
    state = reveal(state)
    state = answer(state, heard(6), 3000)
    state = answer(state, heard(state.prompt.pitchClass), 6000)
    expect(state.results[1]).toEqual(result('C♯', 1, { wrong: 2, revealed: true, ms: 4000 }))
  })
})

describe('summarize', () => {
  it('counts first-time answers, misses, and the best streak', () => {
    const s = summarize([
      result('C', 0),
      result('D', 2, { wrong: 1 }),
      result('E', 4),
      result('F', 5),
      result('G', 7),
      result('A', 9, { revealed: true }),
    ])
    expect(s).toMatchObject({ answered: 6, missed: 2, wrong: 1, revealed: 1, bestStreak: 3 })
    expect(s.firstTime).toBeCloseTo(4 / 6)
  })

  it('summarizes an empty drill', () => {
    expect(summarize([])).toMatchObject({ answered: 0, firstTime: 0, medianMs: null, bestStreak: 0 })
  })
})

describe('median', () => {
  it('takes the middle value, or the mean of the middle two', () => {
    expect(median([3, 1, 2])).toBe(2)
    expect(median([4, 1, 3, 2])).toBe(2.5)
  })
})

describe('byNote', () => {
  // Frets 0–7 on the E string: E F F♯/G♭ G G♯/A♭ A A♯/B♭ B.
  const options: PromptOptions = { string: E, range: { from: 0, to: 7, markedOnly: false } }

  it('grades every reachable note by how often it was missed', () => {
    const notes = byNote(
      [result('F', 5), result('F', 5), result('G', 7), result('G', 7, { wrong: 1 }), result('A', 9, { revealed: true })],
      options,
    )
    const grades = Object.fromEntries(notes.map((n) => [n.name, n.grade]))
    expect(grades).toMatchObject({ F: 'never', G: 'sometimes', A: 'always', B: 'unasked' })
  })

  it('places each note at its frets within the range', () => {
    const notes = byNote([], { string: E, range: { from: 0, to: 24, markedOnly: false } })
    expect(notes.find((n) => n.name === 'E')?.frets).toEqual([0, 12, 24])
  })

  it('keeps enharmonic spellings apart', () => {
    const note = byNote([result('A♯', 10, { wrong: 1 }), result('B♭', 10)], options).find((n) => n.pitchClass === 10)
    expect(note?.name).toBe('A♯/B♭')
    expect(note?.grade).toBe('sometimes')
    expect(note?.spellings).toEqual([
      { spelling: 'A♯', asked: 1, missed: 1 },
      { spelling: 'B♭', asked: 1, missed: 0 },
    ])
  })
})

describe('toWorkOn', () => {
  it('lists missed spellings, most often missed first', () => {
    const notes = byNote(
      [result('F', 5, { wrong: 1 }), result('F', 5), result('G', 7), result('A', 9, { revealed: true })],
      { string: E, range: { from: 0, to: 7, markedOnly: false } },
    )
    expect(toWorkOn(notes).map((s) => s.spelling)).toEqual(['A', 'F'])
  })
})

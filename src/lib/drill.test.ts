import { describe, expect, it } from 'vitest'
import { STANDARD_TUNING } from './notes'
import { type DrillState, answer, next, reveal, start } from './drill'
import type { PromptOptions } from './prompts'

const [E] = STANDARD_TUNING
const options: PromptOptions = { strings: [E], range: { kind: 'marked' } }

/** A drill prompting for A on the E string. */
const promptingA: DrillState = {
  prompt: { string: E, pitchClass: 9, spelling: 'A' },
  status: 'waiting',
  heard: null,
}

describe('drill', () => {
  it('starts waiting on a prompt', () => {
    const state = start(options, Math.random)
    expect(state.status).toBe('waiting')
    expect(state.heard).toBeNull()
    expect(state.prompt.string).toBe(E)
  })

  it('marks a correct answer and records what was heard', () => {
    const state = answer(promptingA, { midi: 45, cents: -3 })
    expect(state.status).toBe('correct')
    expect(state.heard).toEqual({ midi: 45, cents: -3 })
  })

  it('marks a wrong answer, keeping the same prompt', () => {
    const state = answer(promptingA, { midi: 44, cents: 0 })
    expect(state.status).toBe('wrong')
    expect(state.prompt).toBe(promptingA.prompt)
  })

  it('accepts a correct retry after a wrong answer', () => {
    const state = answer(answer(promptingA, { midi: 44, cents: 0 }), { midi: 33, cents: 0 })
    expect(state.status).toBe('correct')
  })

  it('ignores answers once the prompt is answered correctly', () => {
    const correct = answer(promptingA, { midi: 45, cents: 0 })
    expect(answer(correct, { midi: 44, cents: 0 })).toBe(correct)
  })

  it('still requires the note to be played after a reveal', () => {
    const revealed = reveal(promptingA)
    expect(revealed.status).toBe('revealed')
    const wrong = answer(revealed, { midi: 44, cents: 0 })
    expect(wrong.status).toBe('revealed')
    expect(wrong.heard).toEqual({ midi: 44, cents: 0 })
    expect(answer(wrong, { midi: 45, cents: 0 }).status).toBe('correct')
  })

  it('moves on to a different prompt', () => {
    const correct = answer(promptingA, { midi: 45, cents: 0 })
    const state = next(correct, options, Math.random)
    expect(state.status).toBe('waiting')
    expect(state.heard).toBeNull()
    expect(state.prompt.pitchClass).not.toBe(9)
  })
})

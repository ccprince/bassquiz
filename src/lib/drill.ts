import type { Answer } from './attack'
import { type Prompt, type PromptOptions, type Random, isCorrect, nextPrompt } from './prompts'

/**
 * - waiting: the prompt is open
 * - wrong: the last answer was wrong; the prompt stays open
 * - revealed: the position is shown; the prompt stays open until played
 * - correct: answered; waiting to move on
 */
export type DrillStatus = 'waiting' | 'wrong' | 'revealed' | 'correct'

export interface DrillState {
  prompt: Prompt
  status: DrillStatus
  /** The most recent answer to this prompt. */
  heard: Answer | null
}

export function start(options: PromptOptions, random: Random): DrillState {
  return { prompt: nextPrompt(options, random), status: 'waiting', heard: null }
}

export function answer(state: DrillState, heard: Answer): DrillState {
  if (state.status === 'correct') return state
  if (isCorrect(state.prompt, heard.midi)) return { ...state, status: 'correct', heard }
  return { ...state, status: state.status === 'revealed' ? 'revealed' : 'wrong', heard }
}

export function reveal(state: DrillState): DrillState {
  return state.status === 'correct' ? state : { ...state, status: 'revealed' }
}

export function next(state: DrillState, options: PromptOptions, random: Random): DrillState {
  return { prompt: nextPrompt(options, random, state.prompt), status: 'waiting', heard: null }
}

import type { Answer } from './attack'
import { type Prompt, type PromptOptions, type Random, isCorrect, nextPrompt } from './prompts'

/**
 * - waiting: the prompt is open
 * - wrong: the last answer was wrong; the prompt stays open
 * - revealed: the position is shown; the prompt stays open until played
 * - correct: answered; waiting to move on
 */
export type DrillStatus = 'waiting' | 'wrong' | 'revealed' | 'correct'

/** A missed spelling waiting to be asked again. */
interface Review {
  prompt: Prompt
  /** The prompt number at which it is next asked. */
  due: number
  /** How many of its reviews have been answered right first time. */
  passed: number
}

export interface DrillState {
  prompt: Prompt
  status: DrillStatus
  /** The most recent answer to this prompt. */
  heard: Answer | null
  /** Whether this prompt has been missed: answered wrong first, or revealed. */
  missed: boolean
  /** How many prompts came before this one. */
  count: number
  reviews: readonly Review[]
}

/** Prompts between a miss and its first review, then between each clean review and the next. */
const REVIEW_GAPS = [2, 5]

export function start(options: PromptOptions, random: Random): DrillState {
  return { prompt: nextPrompt(options, random), status: 'waiting', heard: null, missed: false, count: 0, reviews: [] }
}

export function answer(state: DrillState, heard: Answer): DrillState {
  if (state.status === 'correct') return state
  if (isCorrect(state.prompt, heard.midi)) return { ...state, status: 'correct', heard }
  return { ...state, status: state.status === 'revealed' ? 'revealed' : 'wrong', heard, missed: true }
}

export function reveal(state: DrillState): DrillState {
  return state.status === 'correct' ? state : { ...state, status: 'revealed', missed: true }
}

export function next(state: DrillState, options: PromptOptions, random: Random): DrillState {
  const count = state.count + 1
  const current = state.reviews.find((r) => r.prompt.spelling === state.prompt.spelling)
  const reviews = state.reviews.filter((r) => r !== current)
  const passed = state.missed ? 0 : (current?.passed ?? 0) + 1
  if ((current || state.missed) && passed < REVIEW_GAPS.length) {
    reviews.push({ prompt: state.prompt, due: count + REVIEW_GAPS[passed], passed })
  }
  const byDue = [...reviews].sort((a, b) => a.due - b.due)
  // Like a random prompt, a review never repeats the pitch class just asked.
  const due = byDue.find((r) => r.due <= count && r.prompt.pitchClass !== state.prompt.pitchClass)
  const prompt = due?.prompt ?? pickUnreviewed(byDue, state.prompt, options, random)
  return { prompt, status: 'waiting', heard: null, missed: false, count, reviews }
}

/** A random prompt not under review; with every prompt under review, the soonest review is asked early. */
function pickUnreviewed(
  byDue: readonly Review[],
  previous: Prompt,
  options: PromptOptions,
  random: Random,
): Prompt {
  const excluded = byDue.map((r) => r.prompt.spelling)
  const picked = nextPrompt(options, random, previous, excluded)
  return excluded.includes(picked.spelling) ? byDue[0].prompt : picked
}

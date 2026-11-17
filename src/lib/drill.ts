import type { Answer } from './attack'
import { type Prompt, type PromptOptions, type Random, canFollow, deal, judge, roundOf } from './prompts'
import type { PromptResult } from './results'

/**
 * - waiting: the prompt is open
 * - wrong: the last answer was a wrong note or a wrong octave; the prompt stays open
 * - revealed: the position is shown; the prompt stays open until played
 * - correct: answered; waiting to move on
 */
export type DrillStatus = 'waiting' | 'wrong' | 'revealed' | 'correct'

export interface DrillOptions extends PromptOptions {
  /** How many rounds before the drill stops; null for an open-ended drill. */
  rounds: number | null
}

/** A missed spelling waiting to be asked again. */
interface Review {
  prompt: Prompt
  /** The prompt number at which it is next asked. */
  due: number
  /** How many of its reviews have been answered right first time. */
  passed: number
  /** What's left of the progress its missed dealt prompts are worth, earned back by clean reviews. */
  owed: number
}

export interface DrillState {
  prompt: Prompt
  status: DrillStatus
  /** The most recent answer to this prompt. */
  heard: Answer | null
  /** Whether this prompt has been missed: answered with a wrong pitch class, or revealed. */
  missed: boolean
  /** Wrong answers to this prompt so far, not counting wrong octaves. */
  wrong: number
  /** When this prompt was shown, in milliseconds. */
  shownAt: number
  /** How many prompts came before this one. */
  count: number
  /** Whether this prompt is a review rather than dealt from the round. */
  reviewing: boolean
  /** What's left of the current round, not counting this prompt. */
  deck: readonly Prompt[]
  /** How many dealt prompts have been answered, across all rounds. */
  dealt: number
  /**
   * Progress earned, in dealt prompts: a whole one for each answered right first time, and for each
   * missed one, shares earned back by its clean reviews.
   */
  earned: number
  reviews: readonly Review[]
  /** Every prompt answered so far, in order. */
  results: readonly PromptResult[]
}

/** Prompts between a miss and its first review, then between each clean review and the next. */
const REVIEW_GAPS = [2, 5]

export function start(options: PromptOptions, random: Random, now: number): DrillState {
  const round = roundOf(options)
  const prompt = deal(round, random)
  return {
    prompt,
    status: 'waiting',
    heard: null,
    missed: false,
    wrong: 0,
    shownAt: now,
    count: 0,
    reviewing: false,
    deck: round.filter((p) => p !== prompt),
    dealt: 0,
    earned: 0,
    reviews: [],
    results: [],
  }
}

export function answer(state: DrillState, heard: Answer, now: number): DrillState {
  if (state.status === 'correct') return state
  const verdict = judge(state.prompt, heard.midi)
  if (verdict === 'correct') {
    const result: PromptResult = {
      spelling: state.prompt.spelling,
      pitchClass: state.prompt.pitchClass,
      wrong: state.wrong,
      revealed: state.status === 'revealed',
      ms: now - state.shownAt,
    }
    const dealt = state.reviewing ? state.dealt : state.dealt + 1
    const earned = state.missed ? state.earned : state.earned + (state.reviewing ? share(currentReview(state)) : 1)
    return { ...state, status: 'correct', heard, dealt, earned, results: [...state.results, result] }
  }
  const status = state.status === 'revealed' ? 'revealed' : 'wrong'
  // A wrong octave is retried like a wrong note, but isn't held against the prompt.
  if (verdict === 'wrongOctave') return { ...state, status, heard }
  return { ...state, status, heard, missed: true, wrong: state.wrong + 1 }
}

export function reveal(state: DrillState): DrillState {
  return state.status === 'correct' ? state : { ...state, status: 'revealed', missed: true }
}

function currentReview(state: DrillState): Review | undefined {
  return state.reviews.find((r) => r.prompt.spelling === state.prompt.spelling)
}

/** What a clean review earns: an equal share of what's owed between the reviews still to come. */
function share(review: Review | undefined): number {
  return review ? review.owed / (REVIEW_GAPS.length - review.passed) : 0
}

/** Dealt prompts in all of a limited drill's rounds; null for an open-ended drill. */
export function totalDealt(options: DrillOptions): number | null {
  return options.rounds === null ? null : options.rounds * roundOf(options).length
}

/** A limited drill is finished once its last dealt prompt is answered; pending reviews are dropped. */
export function isFinished(state: DrillState, options: DrillOptions): boolean {
  return state.dealt === totalDealt(options)
}

export function next(state: DrillState, options: PromptOptions, random: Random, now: number): DrillState {
  const count = state.count + 1
  // Only a miss or a review changes a spelling's reviews; dealing a spelling under review leaves them be.
  const changed = state.missed || state.reviewing
  const current = currentReview(state)
  const reviews = changed ? state.reviews.filter((r) => r !== current) : [...state.reviews]
  const passed = state.missed ? 0 : (current?.passed ?? 0) + 1
  // A missed dealt prompt adds its whole worth to what's owed; a clean review pays its share off.
  const owed = (current?.owed ?? 0) + (state.reviewing ? 0 : 1) - (state.missed ? 0 : share(current))
  if (changed && passed < REVIEW_GAPS.length) {
    reviews.push({ prompt: state.prompt, due: count + REVIEW_GAPS[passed], passed, owed })
  }
  const fresh = { status: 'waiting', heard: null, missed: false, wrong: 0, shownAt: now, count, reviews } as const
  // Like a dealt prompt, a review never repeats the pitch class just asked, nor leaves the round stuck.
  const due = [...reviews]
    .sort((a, b) => a.due - b.due)
    .find(
      (r) =>
        r.due <= count &&
        r.prompt.pitchClass !== state.prompt.pitchClass &&
        canFollow(state.deck, r.prompt.pitchClass),
    )
  if (due) return { ...state, ...fresh, prompt: due.prompt, reviewing: true }
  const deck = state.deck.length ? state.deck : roundOf(options)
  const prompt = deal(deck, random, state.prompt)
  return { ...state, ...fresh, prompt, reviewing: false, deck: deck.filter((p) => p !== prompt) }
}

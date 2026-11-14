/** One analysis frame from the pitch tracker. */
export interface Frame {
  /** Milliseconds, monotonically increasing. */
  time: number
  /** Signal level (RMS), 0–1. */
  level: number
  /** Detected pitch as a fractional MIDI number, or null when no clear pitch was found. */
  midi: number | null
}

export interface Answer {
  midi: number
  cents: number
}

export interface AttackDetectorOptions {
  /** Level below which input counts as silence. */
  gate: number
  /** How long a pitch must hold on one semitone before it is judged. */
  stableMs?: number
  /** How far the level must jump above its recent minimum to count as a new attack. */
  onsetRatio?: number
  /** How far back the recent minimum level looks. */
  onsetWindowMs?: number
  /** Minimum time between attacks, so one pluck's rising edge counts once. */
  refractoryMs?: number
}

/**
 * Turns a stream of pitch frames into answers: at most one per attack, given
 * once its pitch has settled on a semitone. A change of held semitone without a
 * new pluck (a slide or hammer-on landing on another note) also yields an answer.
 */
export class AttackDetector {
  gate: number
  private readonly stableMs: number
  private readonly onsetRatio: number
  private readonly onsetWindowMs: number
  private readonly refractoryMs: number

  private recentLevels: { time: number; level: number }[] = []
  private sounding = false
  private lastOnset = -Infinity
  private candidate: { semitone: number; since: number } | null = null
  private lastSemitone: number | null = null
  /** The semitone already judged for the current attack, if any. */
  private judged: number | null = null
  /** While paused, the semitone that was ringing when the pause began, if any. */
  private held: number | null = null
  private paused = false

  constructor(options: AttackDetectorOptions) {
    this.gate = options.gate
    this.stableMs = options.stableMs ?? 150
    this.onsetRatio = options.onsetRatio ?? 2
    this.onsetWindowMs = options.onsetWindowMs ?? 80
    this.refractoryMs = options.refractoryMs ?? 150
  }

  feed(frame: Frame): Answer | null {
    const recentMin = this.recentMinLevel(frame.time)
    this.recentLevels.push({ time: frame.time, level: frame.level })

    if (frame.level < this.gate) {
      this.sounding = false
      this.candidate = null
      this.lastSemitone = null
      this.judged = null
      return null
    }

    const jumped = frame.level >= recentMin * this.onsetRatio
    if ((!this.sounding || jumped) && frame.time - this.lastOnset >= this.refractoryMs) {
      this.lastOnset = frame.time
      this.candidate = null
      this.judged = null
    }
    this.sounding = true

    if (frame.midi === null) {
      this.candidate = null
      return null
    }

    const semitone = Math.round(frame.midi)
    this.lastSemitone = semitone
    if (this.candidate?.semitone !== semitone) {
      this.candidate = { semitone, since: frame.time }
    }
    if (frame.time - this.candidate.since < this.stableMs || this.judged === semitone) return null

    this.judged = semitone
    return this.paused ? null : { midi: semitone, cents: (frame.midi - semitone) * 100 }
  }

  /** Treats whatever is currently sounding as already judged, e.g. when a new prompt appears. */
  ignoreCurrent(): void {
    this.judged = this.ringing()
  }

  /**
   * Gives no answers until `resume`, e.g. while the app's own sound reaches the mic. Pausing again before
   * resuming changes nothing.
   */
  pause(): void {
    if (this.paused) return
    this.paused = true
    this.held = this.ringing()
  }

  /**
   * Answers again, judging afresh whatever is sounding now: a note plucked while paused counts once it holds
   * steady. Only the note that was already ringing when the pause began stays judged.
   */
  resume(): void {
    if (!this.paused) return
    this.paused = false
    this.candidate = null
    this.judged = this.held
    this.held = null
  }

  private ringing(): number | null {
    return this.sounding ? (this.candidate?.semitone ?? this.lastSemitone) : null
  }

  private recentMinLevel(now: number): number {
    while (this.recentLevels.length > 0 && now - this.recentLevels[0].time > this.onsetWindowMs) {
      this.recentLevels.shift()
    }
    return Math.min(...this.recentLevels.map((l) => l.level))
  }
}

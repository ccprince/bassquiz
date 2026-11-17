# Bass Fretboard Trainer

A browser app for learning the notes of the bass fretboard: it names a note, listens to the player play it, and says whether it was right.

## Instrument

**Tuning**:
The open-string pitches of the bass, lowest string first. Standard tuning is E A D G.

**String**:
One string of the bass, identified by the note name of its open pitch (the E string, the A string, …).

**Fret**:
A numbered position on a string; fret 0 is the open string.

**Marked fret**:
A fret carrying an inlay marker: 3, 5, 7, 9, 12, 15, 17, 19, 21, 24.
_Avoid_: Dot fret, inlay

## Notes

**Pitch class**:
A note name independent of octave; all As share one pitch class.

**Pitch**:
A note at a specific height. The A at fret 5 of the E string and the A at fret 17 share a pitch class but not a pitch.

**Spelling**:
The written name used for a pitch class. Enharmonic spellings (A♯ / B♭) name the same pitch class and are equally correct.

## Practice

**Prompt**:
A request to play a named pitch class on a named string, e.g. "A on the E string".
_Avoid_: Question, challenge

**Spoken prompt**:
A prompt said aloud, so the player needn't watch the screen. It names only the spelling ("A sharp"); the player already knows the active string. A drill with spoken prompts also gives its feedback as sound: a chime when right, the note played when wrong, "wrong octave" for a wrong octave, the fret when revealed, and a closing chime when a limited drill finishes. Sound the app makes is never taken as an answer.
_Avoid_: Audio prompt, TTS, narration

**Answer**:
The note the player plays in response to a prompt; correct when its pitch matches the prompt's pitch: its pitch class where it lies in the drill's octave. The string is taken on trust, so the same pitch played on another string is correct.

**Wrong octave**:
An answer with the prompt's pitch class but not its pitch. It is retried, and is neither correct nor a miss.

**Drill**:
An untimed run of prompts with immediate right/wrong feedback, either open-ended or limited to a number of rounds; a wrong answer is retried until correct. A drill remembers its misses until it stops, then shows its results; nothing is saved.
_Avoid_: Practice session, exercise

**Miss**:
A prompt that drew an answer with the wrong pitch class, or that was revealed; a wrong octave alone is not a miss. A miss counts against the prompt's spelling, not its whole pitch class: missing A♯ says nothing about B♭.
_Avoid_: Mistake, error

**Results**:
What a drill shows when it stops: how many prompts were answered right first time, how long answers took, and each note's misses, graded on the fretboard as never, sometimes, or always missed; for a limited drill, also whether every round was finished. Shown once and discarded.
_Avoid_: Score, report

**Review**:
A prompt asked again because its spelling was missed: once after two other prompts, then again after five more. Two reviews answered right first time end its reviews; a missed review starts the schedule over. Reviews are asked in addition to rounds and never count toward them.
_Avoid_: Retry, repeat, comeback

**Round**:
A pass in which a drill asks every spelling in its octave once. A limited drill stops after a chosen number of rounds.
_Avoid_: Lap, cycle, set

**Active string**:
The one string a drill draws prompts from, chosen by the player. Only one, because the app can't tell which string a note was played on.

**Octave**:
The twelve consecutive frets a drill draws prompts from, beginning at a chosen starting fret (open to 13), optionally narrowed to the marked frets within it. Each pitch class lies at exactly one fret of an octave.
_Avoid_: Fret range, position, window

**Attack**:
The onset of a newly played note. Each attack yields at most one answer; sound still ringing from before a prompt is not an answer.
_Avoid_: Note-on, pluck

**Damp**:
Silencing the string after a correct answer, to say you're ready for the next prompt. The drill moves on once the string falls silent (but never before the chime has finished), or after a short pause if it keeps ringing.
_Avoid_: Mute, stop, skip

**Reveal**:
Showing the player where the prompted note lies, after which they must still play it to move on.
_Avoid_: Give up, skip

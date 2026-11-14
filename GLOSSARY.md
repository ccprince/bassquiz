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
A fret carrying an inlay marker: 3, 5, 7, 9, 12, 15, 17, 19, 21.
_Avoid_: Dot fret, inlay

## Notes

**Pitch class**:
A note name independent of octave; all As share one pitch class.

**Spelling**:
The written name used for a pitch class. Enharmonic spellings (A♯ / B♭) name the same pitch class and are equally correct.

## Practice

**Prompt**:
A request to play a named pitch class on a named string, e.g. "A on the E string".
_Avoid_: Question, challenge

**Answer**:
The note the player plays in response to a prompt; correct when its pitch class matches the prompt's. The string is taken on trust.

**Drill**:
An untimed, open-ended run of prompts with immediate right/wrong feedback; a wrong answer is retried until correct. Nothing is scored or saved.
_Avoid_: Practice session, exercise

**Quiz**:
A fixed-length, scored run of prompts. (Future.)
_Avoid_: Test, exam

**Active string**:
The one string a drill draws prompts from, chosen by the player. Only one, because the app can't tell which string a note was played on.

**Fret range**:
The frets a drill draws prompts from: either a contiguous span (default 0–21) or the marked frets only.

**Attack**:
The onset of a newly played note. Each attack yields at most one answer; sound still ringing from before a prompt is not an answer.
_Avoid_: Note-on, pluck

**Reveal**:
Showing the player where the prompted note lies, after which they must still play it to move on.
_Avoid_: Give up, skip

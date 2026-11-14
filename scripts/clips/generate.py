# /// script
# requires-python = ">=3.10,<3.13"
# dependencies = [
#   "kokoro>=0.9.4",
#   "torch",
#   "numpy",
#   "lameenc",
#   "pip",
#   "en_core_web_sm @ https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.8.0/en_core_web_sm-3.8.0-py3-none-any.whl",
# ]
# [tool.uv.sources]
# torch = { index = "pytorch-cpu" }
# [[tool.uv.index]]
# name = "pytorch-cpu"
# url = "https://download.pytorch.org/whl/cpu"
# explicit = true
# ///
"""
Records every phrase a drill can say with the Kokoro text-to-speech model (Apache-2.0), trimmed to the speech
and encoded as MP3. Reads the phrases as JSON on stdin (from phrases.mjs) and writes them to the directory
given, removing clips no longer needed. Run it through `npm run clips`.
"""
import json
import sys
from pathlib import Path

import lameenc
import numpy as np
from kokoro import KPipeline

VOICE = "af_heart"
SPEED = 1.15
RATE = 24000

# The speech is everything louder than this far below the clip's peak. A fixed level cuts off the soft start
# and fading tail of a lone vowel like "A".
BELOW_PEAK_DB = 45
LEAD_MS = 20
TAIL_MS = 80
# Fading the cut edges stops them clicking.
FADE_MS = 15


def trim(audio: np.ndarray) -> np.ndarray:
    threshold = np.abs(audio).max() * 10 ** (-BELOW_PEAK_DB / 20)
    loud = np.flatnonzero(np.abs(audio) > threshold)
    start = max(0, loud[0] - RATE * LEAD_MS // 1000)
    end = min(len(audio), loud[-1] + RATE * TAIL_MS // 1000)
    clip = audio[start:end].copy()
    fade = RATE * FADE_MS // 1000
    clip[:fade] *= np.linspace(0, 1, fade)
    clip[-fade:] *= np.linspace(1, 0, fade)
    return clip


def mp3(audio: np.ndarray) -> bytes:
    encoder = lameenc.Encoder()
    encoder.set_bit_rate(64)
    encoder.set_in_sample_rate(RATE)
    encoder.set_channels(1)
    encoder.set_quality(2)
    pcm = (np.clip(audio, -1, 1) * 32767).astype(np.int16).tobytes()
    return encoder.encode(pcm) + encoder.flush()


def main() -> None:
    out = Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)
    phrases = json.load(sys.stdin)
    pipeline = KPipeline(lang_code="a", repo_id="hexgrad/Kokoro-82M")
    for entry in phrases:
        audio = np.concatenate([r.audio.numpy() for r in pipeline(entry["phrase"], voice=VOICE, speed=SPEED)])
        (out / entry["file"]).write_bytes(mp3(trim(audio)))
        print(entry["file"], flush=True)
    wanted = {entry["file"] for entry in phrases}
    for stale in out.glob("*.mp3"):
        if stale.name not in wanted:
            stale.unlink()
            print("removed", stale.name)


if __name__ == "__main__":
    main()

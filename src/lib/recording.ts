/** Keeps the most recent samples of a stream, up to a fixed length. */
export class SampleRing {
  private readonly buffer: Float32Array
  private written = 0

  constructor(length: number) {
    this.buffer = new Float32Array(length)
  }

  push(samples: Float32Array): void {
    for (const s of samples) {
      this.buffer[this.written % this.buffer.length] = s
      this.written++
    }
  }

  /** The samples held, oldest first. */
  snapshot(): Float32Array {
    const n = this.buffer.length
    if (this.written <= n) return this.buffer.slice(0, this.written)
    const start = this.written % n
    const out = new Float32Array(n)
    out.set(this.buffer.subarray(start))
    out.set(this.buffer.subarray(0, start), n - start)
    return out
  }
}

/** Mono 32-bit float WAV, so the samples come back exactly as the app heard them. */
export function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const dataBytes = samples.length * 4
  const view = new DataView(new ArrayBuffer(58 + dataBytes))
  const text = (offset: number, s: string) => [...s].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)))

  text(0, 'RIFF')
  view.setUint32(4, 50 + dataBytes, true)
  text(8, 'WAVE')
  text(12, 'fmt ')
  view.setUint32(16, 18, true)
  view.setUint16(20, 3, true) // IEEE float
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 4, true)
  view.setUint16(32, 4, true)
  view.setUint16(34, 32, true)
  view.setUint16(36, 0, true)
  text(38, 'fact')
  view.setUint32(42, 4, true)
  view.setUint32(46, samples.length, true)
  text(50, 'data')
  view.setUint32(54, dataBytes, true)
  samples.forEach((s, i) => view.setFloat32(58 + i * 4, s, true))
  return view.buffer
}

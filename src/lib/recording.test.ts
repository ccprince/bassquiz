import { describe, expect, it } from 'vitest'
import { SampleRing, encodeWav } from './recording'

describe('SampleRing', () => {
  it('holds everything pushed while it fits', () => {
    const ring = new SampleRing(5)
    ring.push(new Float32Array([1, 2]))
    ring.push(new Float32Array([3]))
    expect([...ring.snapshot()]).toEqual([1, 2, 3])
  })

  it('keeps only the most recent samples, oldest first', () => {
    const ring = new SampleRing(4)
    ring.push(new Float32Array([1, 2, 3]))
    ring.push(new Float32Array([4, 5, 6]))
    expect([...ring.snapshot()]).toEqual([3, 4, 5, 6])
  })
})

describe('encodeWav', () => {
  const samples = new Float32Array([0, 0.5, -0.25])
  const view = new DataView(encodeWav(samples, 48000))
  const text = (offset: number, length: number) =>
    String.fromCharCode(...Array.from({ length }, (_, i) => view.getUint8(offset + i)))

  it('writes a float WAV header', () => {
    expect(text(0, 4)).toBe('RIFF')
    expect(view.getUint32(4, true)).toBe(view.byteLength - 8)
    expect(text(8, 4)).toBe('WAVE')
    expect(view.getUint16(20, true)).toBe(3)
    expect(view.getUint32(24, true)).toBe(48000)
    expect(text(50, 4)).toBe('data')
    expect(view.getUint32(54, true)).toBe(12)
  })

  it('stores the samples exactly', () => {
    expect([0, 1, 2].map((i) => view.getFloat32(58 + i * 4, true))).toEqual([0, 0.5, -0.25])
  })
})

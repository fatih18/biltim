import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fitBox, readPhoto } from './photos'

/** A PNG signature and IHDR saying 640 × 480, padded to `size` bytes. */
function png(size: number): Buffer {
  const buf = Buffer.alloc(size)
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buf, 0)
  buf.writeUInt32BE(13, 8)
  buf.write('IHDR', 12, 'ascii')
  buf.writeUInt32BE(640, 16)
  buf.writeUInt32BE(480, 20)
  return buf
}

let dir = ''
const at = (name: string) => ({ id: name, abs: path.join(dir, name) })

beforeAll(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'biltim-photos-'))
  await writeFile(path.join(dir, 'small.png'), png(2_000))
  await writeFile(path.join(dir, 'big.png'), png(50_000))
  const webp = Buffer.alloc(40_000)
  webp.write('RIFF', 0, 'ascii')
  webp.write('WEBP', 8, 'ascii')
  await writeFile(path.join(dir, 'photo.webp'), webp)
})

afterAll(async () => {
  if (dir) await rm(dir, { recursive: true, force: true })
})

describe('readPhoto', () => {
  it('reads a photo that fits the budget, with its pixel size', async () => {
    const photo = await readPhoto(at('small.png'), 10_000)
    expect(photo).not.toBeNull()
    if (!photo || typeof photo === 'string') throw new Error('expected a photo')
    expect(photo.extension).toBe('png')
    expect(photo.buffer.length).toBe(2_000)
    expect({ width: photo.width, height: photo.height }).toEqual({ width: 640, height: 480 })
  })

  it('does not read a photo past the budget', async () => {
    // The report's byte cap: what is left is smaller than this file.
    expect(await readPhoto(at('big.png'), 10_000)).toBe('over-budget')
    expect(await readPhoto(at('big.png'), 0)).toBe('over-budget')
  })

  it('tells a format Excel cannot embed from its first bytes, whatever the budget', async () => {
    expect(await readPhoto(at('photo.webp'), 0)).toBe('unsupported')
    expect(await readPhoto(at('photo.webp'), 1_000_000)).toBe('unsupported')
  })

  it('answers null for a file that is not there', async () => {
    expect(await readPhoto(at('gone.jpg'), 1_000_000)).toBeNull()
  })
})

describe('fitBox', () => {
  it('keeps the proportions inside the cell', () => {
    expect(fitBox({ width: 640, height: 480 }, 178, 116)).toEqual({ width: 155, height: 116 })
    expect(fitBox({ width: 0, height: 0 }, 178, 116)).toEqual({ width: 155, height: 116 })
  })
})

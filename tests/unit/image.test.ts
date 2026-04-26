import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { compressImage } from '../../src/lib/image'

function makeFile(name = 'photo.jpg', type = 'image/jpeg'): File {
  return new File(['fake-image'], name, { type })
}

function makeBlob(type = 'image/jpeg'): Blob {
  return new Blob(['fake-jpeg'], { type })
}

/** Stub canvas that calls toBlob with the given result. */
function fakeCanvas(blob: Blob | null, dims = { width: 0, height: 0 }) {
  return {
    width: dims.width,
    height: dims.height,
    getContext: () => ({ drawImage: vi.fn() }),
    toBlob: (cb: (b: Blob | null) => void) => cb(blob),
  } as unknown as HTMLCanvasElement
}

// Capture the real createElement before any spy is installed so nested calls don't loop.
const realCreateElement = document.createElement.bind(document)

describe('compressImage', () => {
  beforeEach(() => {
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:fake'),
      revokeObjectURL: vi.fn(),
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  describe('createImageBitmap path', () => {
    it('resolves with a Blob when createImageBitmap succeeds', async () => {
      const bitmap = { width: 200, height: 100, close: vi.fn() }
      vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(bitmap))
      vi.spyOn(document, 'createElement').mockImplementation((tag) =>
        tag === 'canvas' ? fakeCanvas(makeBlob()) : realCreateElement(tag),
      )

      const result = await compressImage(makeFile(), { maxDim: 600 })
      expect(result).toBeInstanceOf(Blob)
      expect(bitmap.close).toHaveBeenCalled()
    })

    it('closes the bitmap even when drawBlob rejects', async () => {
      const bitmap = { width: 100, height: 100, close: vi.fn() }
      vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(bitmap))
      vi.spyOn(document, 'createElement').mockImplementation((tag) =>
        tag === 'canvas' ? fakeCanvas(null) : realCreateElement(tag), // null → "Compression failed"
      )

      await expect(compressImage(makeFile())).rejects.toThrow('Compression failed')
      expect(bitmap.close).toHaveBeenCalled()
    })

    it('scales down oversized images to maxDim', async () => {
      const bitmap = { width: 2400, height: 1200, close: vi.fn() }
      vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(bitmap))

      let capturedW = 0
      let capturedH = 0
      const canvas = {
        get width() { return capturedW },
        set width(v) { capturedW = v },
        get height() { return capturedH },
        set height(v) { capturedH = v },
        getContext: () => ({ drawImage: vi.fn() }),
        toBlob: (cb: (b: Blob | null) => void) => cb(makeBlob()),
      } as unknown as HTMLCanvasElement
      vi.spyOn(document, 'createElement').mockImplementation((tag) =>
        tag === 'canvas' ? canvas : realCreateElement(tag),
      )

      await compressImage(makeFile(), { maxDim: 600 })
      // 2400×1200 scaled to maxDim=600 → 600×300
      expect(capturedW).toBe(600)
      expect(capturedH).toBe(300)
    })

    it('does not scale images smaller than maxDim', async () => {
      const bitmap = { width: 400, height: 200, close: vi.fn() }
      vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(bitmap))

      let capturedW = 0
      let capturedH = 0
      const canvas = {
        get width() { return capturedW },
        set width(v) { capturedW = v },
        get height() { return capturedH },
        set height(v) { capturedH = v },
        getContext: () => ({ drawImage: vi.fn() }),
        toBlob: (cb: (b: Blob | null) => void) => cb(makeBlob()),
      } as unknown as HTMLCanvasElement
      vi.spyOn(document, 'createElement').mockImplementation((tag) =>
        tag === 'canvas' ? canvas : realCreateElement(tag),
      )

      await compressImage(makeFile(), { maxDim: 600 })
      expect(capturedW).toBe(400)
      expect(capturedH).toBe(200)
    })

    it('falls back to HTMLImageElement when createImageBitmap rejects', async () => {
      vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('unsupported')))

      // Build a fake img element that fires onload asynchronously
      const fakeImg = realCreateElement('img') as HTMLImageElement
      Object.defineProperty(fakeImg, 'src', {
        set(_v) {
          Object.assign(fakeImg, { width: 100, height: 100 })
          Promise.resolve().then(() => fakeImg.onload?.(new Event('load')))
        },
      })

      vi.spyOn(document, 'createElement').mockImplementation((tag) => {
        if (tag === 'canvas') return fakeCanvas(makeBlob())
        if (tag === 'img') return fakeImg
        return realCreateElement(tag)
      })

      const result = await compressImage(makeFile())
      expect(result).toBeInstanceOf(Blob)
    })
  })

  describe('HTMLImageElement fallback (no createImageBitmap)', () => {
    beforeEach(() => {
      vi.stubGlobal('createImageBitmap', undefined)
    })

    it('resolves when img loads successfully', async () => {
      const fakeImg = realCreateElement('img') as HTMLImageElement
      Object.defineProperty(fakeImg, 'src', {
        set(_v) {
          Object.assign(fakeImg, { width: 80, height: 60 })
          Promise.resolve().then(() => fakeImg.onload?.(new Event('load')))
        },
      })

      vi.spyOn(document, 'createElement').mockImplementation((tag) => {
        if (tag === 'canvas') return fakeCanvas(makeBlob())
        if (tag === 'img') return fakeImg
        return realCreateElement(tag)
      })

      const result = await compressImage(makeFile())
      expect(result).toBeInstanceOf(Blob)
    })

    it('rejects with "Failed to load image" when img.onerror fires', async () => {
      const fakeImg = realCreateElement('img') as HTMLImageElement
      Object.defineProperty(fakeImg, 'src', {
        set(_v) {
          Promise.resolve().then(() => fakeImg.onerror?.(new Event('error')))
        },
      })

      vi.spyOn(document, 'createElement').mockImplementation((tag) => {
        if (tag === 'canvas') return fakeCanvas(makeBlob())
        if (tag === 'img') return fakeImg
        return realCreateElement(tag)
      })

      await expect(compressImage(makeFile('bad.bin', 'application/octet-stream')))
        .rejects.toThrow('Failed to load image')
    })
  })
})

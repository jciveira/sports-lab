/** Compress an image file to JPEG with max dimension, configurable quality.
 *
 *  Strategy:
 *  1. Try createImageBitmap(file) — handles more formats (HEIC when iOS converts
 *     on image/* inputs, WebP, etc.) and doesn't block the DOM.
 *  2. Fall back to HTMLImageElement if createImageBitmap is unavailable or rejects
 *     (older browsers, unsupported formats).
 */
export function compressImage(
  file: File,
  opts: { maxDim?: number; quality?: number } = {},
): Promise<Blob> {
  const { maxDim = 1200, quality = 0.7 } = opts

  function drawBlob(source: CanvasImageSource, w: number, h: number): Promise<Blob> {
    if (w > maxDim || h > maxDim) {
      const scale = maxDim / Math.max(w, h)
      w = Math.round(w * scale)
      h = Math.round(h * scale)
    }
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    canvas.getContext('2d')!.drawImage(source, 0, 0, w, h)
    return new Promise((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Compression failed'))),
        'image/jpeg',
        quality,
      ),
    )
  }

  function loadViaImg(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(url)
        drawBlob(img, img.width, img.height).then(resolve).catch(reject)
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Failed to load image'))
      }
      img.src = url
    })
  }

  if (typeof createImageBitmap !== 'undefined') {
    return createImageBitmap(file).then(
      async (bitmap) => {
        try {
          return await drawBlob(bitmap, bitmap.width, bitmap.height)
        } finally {
          bitmap.close()
        }
      },
      () => loadViaImg(),
    )
  }

  return loadViaImg()
}

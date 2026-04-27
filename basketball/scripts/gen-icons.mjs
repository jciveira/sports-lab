/**
 * Generates placeholder basketball-themed PNG icons without external dependencies.
 * Uses raw PNG binary format (zlib deflate via Node's built-in zlib).
 *
 * Run with: node basketball/scripts/gen-icons.mjs
 */
import { createDeflateRaw } from 'zlib'
import { writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { promisify } from 'util'

const __dirname = dirname(fileURLToPath(import.meta.url))
const deflateRaw = promisify(createDeflateRaw)

const deflate = (buf) =>
  new Promise((res, rej) => {
    const chunks = []
    const d = createDeflateRaw({ level: 9 })
    d.on('data', c => chunks.push(c))
    d.on('end', () => res(Buffer.concat(chunks)))
    d.on('error', rej)
    d.end(buf)
  })

function crc32(buf) {
  const table = (() => {
    const t = new Uint32Array(256)
    for (let i = 0; i < 256; i++) {
      let c = i
      for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      t[i] = c
    }
    return t
  })()
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function uint32be(n) {
  const b = Buffer.allocUnsafe(4)
  b.writeUInt32BE(n, 0)
  return b
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii')
  const crcData = Buffer.concat([typeBytes, data])
  return Buffer.concat([uint32be(data.length), typeBytes, data, uint32be(crc32(crcData))])
}

/**
 * Build an RGBA pixel buffer for a basketball icon of given size.
 * Dark background with an orange circle and simple seam lines.
 */
function drawBasketball(size) {
  const pixels = Buffer.alloc(size * size * 4, 0)

  const cx = size / 2
  const cy = size / 2
  const r = size * 0.45

  // Background color: #0f1117 (dark)
  const bgR = 0x0f, bgG = 0x11, bgB = 0x17

  // Orange fill: #f97316
  const ballR = 0xf9, ballG = 0x73, ballB = 0x16

  // Seam color: #0f1117 (dark lines on orange)
  const seamR = 0x0f, seamG = 0x11, seamB = 0x17

  const seamW = Math.max(2, size * 0.035) // seam width in px

  function setPixel(x, y, pr, pg, pb, pa) {
    if (x < 0 || x >= size || y < 0 || y >= size) return
    const i = (y * size + x) * 4
    pixels[i] = pr
    pixels[i + 1] = pg
    pixels[i + 2] = pb
    pixels[i + 3] = pa
  }

  // Fill background
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      setPixel(x, y, bgR, bgG, bgB, 255)
    }
  }

  // Draw filled orange circle
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx + 0.5
      const dy = y - cy + 0.5
      if (dx * dx + dy * dy <= r * r) {
        setPixel(x, y, ballR, ballG, ballB, 255)
      }
    }
  }

  // Draw circle border
  const borderW = Math.max(1, size * 0.015)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx + 0.5
      const dy = y - cy + 0.5
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist >= r - borderW && dist <= r + borderW * 0.5) {
        setPixel(x, y, seamR, seamG, seamB, 255)
      }
    }
  }

  // Horizontal seam (two curves above and below center)
  for (let x = 0; x < size; x++) {
    const nx = (x - cx) / r // normalised -1..1
    if (Math.abs(nx) > 1) continue
    // Upper arc: parabola dip toward center
    const yTop = cy - r * 0.25 * (1 - nx * nx)
    // Lower arc: parabola rise toward center
    const yBot = cy + r * 0.25 * (1 - nx * nx)
    for (let dy2 = -seamW; dy2 <= seamW; dy2++) {
      const px = x
      const pyTop = Math.round(yTop + dy2)
      const pyBot = Math.round(yBot + dy2)
      const dxc = px - cx, dyTop = pyTop - cy, dyBot = pyBot - cy
      if (dxc * dxc + dyTop * dyTop < r * r * 0.92) setPixel(px, pyTop, seamR, seamG, seamB, 255)
      if (dxc * dxc + dyBot * dyBot < r * r * 0.92) setPixel(px, pyBot, seamR, seamG, seamB, 255)
    }
  }

  // Vertical seam (two curves left and right of center)
  for (let y = 0; y < size; y++) {
    const ny = (y - cy) / r
    if (Math.abs(ny) > 1) continue
    const xLeft = cx - r * 0.25 * (1 - ny * ny)
    const xRight = cx + r * 0.25 * (1 - ny * ny)
    for (let dx2 = -seamW; dx2 <= seamW; dx2++) {
      const py = y
      const pxLeft = Math.round(xLeft + dx2)
      const pxRight = Math.round(xRight + dx2)
      const dyc = py - cy, dxLeft = pxLeft - cx, dxRight = pxRight - cx
      if (dxLeft * dxLeft + dyc * dyc < r * r * 0.92) setPixel(pxLeft, py, seamR, seamG, seamB, 255)
      if (dxRight * dxRight + dyc * dyc < r * r * 0.92) setPixel(pxRight, py, seamR, seamG, seamB, 255)
    }
  }

  return pixels
}

async function buildPNG(size) {
  const pixels = drawBasketball(size)

  // PNG signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  // IHDR
  const ihdrData = Buffer.concat([
    uint32be(size), uint32be(size),
    Buffer.from([8, 6, 0, 0, 0]), // 8-bit RGBA
  ])
  const ihdr = chunk('IHDR', ihdrData)

  // IDAT: filter byte 0 (None) before each row, then deflate
  const scanlines = []
  for (let y = 0; y < size; y++) {
    scanlines.push(0) // filter type None
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      scanlines.push(pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3])
    }
  }
  const raw = Buffer.from(scanlines)
  const compressed = await deflate(raw)
  const idat = chunk('IDAT', compressed)

  // IEND
  const iend = chunk('IEND', Buffer.alloc(0))

  return Buffer.concat([sig, ihdr, idat, iend])
}

async function main() {
  const outDir = resolve(__dirname, '../public/icons')

  for (const size of [192, 512]) {
    const png = await buildPNG(size)
    const path = `${outDir}/icon-${size}.png`
    writeFileSync(path, png)
    console.log(`Written ${path} (${png.length} bytes)`)
  }

  // Maskable: same image — safe zone is the inner 80% of the canvas
  const png512 = await buildPNG(512)
  const maskPath = `${outDir}/icon-maskable-512.png`
  writeFileSync(maskPath, png512)
  console.log(`Written ${maskPath}`)
}

main().catch(e => { console.error(e); process.exit(1) })

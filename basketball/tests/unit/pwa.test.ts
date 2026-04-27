import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

describe('PWA setup', () => {
  it('vite.config.ts exports a valid config with PWA plugin', async () => {
    // Verify the config source contains the expected manifest fields.
    // We read the source rather than dynamic-importing to avoid Vite plugin
    // resolution at test time.
    const configSrc = readFileSync(
      resolve(__dirname, '../../vite.config.ts'),
      'utf-8',
    )
    expect(configSrc).toContain("VitePWA(")
    expect(configSrc).toContain("short_name: 'BasketLab'")
    expect(configSrc).toContain("display: 'standalone'")
  })

  it('manifest short_name is exactly "BasketLab"', () => {
    const configSrc = readFileSync(
      resolve(__dirname, '../../vite.config.ts'),
      'utf-8',
    )
    const match = configSrc.match(/short_name:\s*['"](.+?)['"]/)
    expect(match).not.toBeNull()
    expect(match![1]).toBe('BasketLab')
  })

  it('icon-192.png exists and is a valid PNG', () => {
    const iconPath = resolve(__dirname, '../../public/icons/icon-192.png')
    const buf = readFileSync(iconPath)
    // PNG signature: 8 bytes \x89PNG\r\n\x1a\n
    expect(buf[0]).toBe(0x89)
    expect(buf.slice(1, 4).toString('ascii')).toBe('PNG')
  })

  it('icon-512.png exists and is a valid PNG', () => {
    const iconPath = resolve(__dirname, '../../public/icons/icon-512.png')
    const buf = readFileSync(iconPath)
    expect(buf[0]).toBe(0x89)
    expect(buf.slice(1, 4).toString('ascii')).toBe('PNG')
  })

  it('icon-maskable-512.png exists and is a valid PNG', () => {
    const iconPath = resolve(__dirname, '../../public/icons/icon-maskable-512.png')
    const buf = readFileSync(iconPath)
    expect(buf[0]).toBe(0x89)
    expect(buf.slice(1, 4).toString('ascii')).toBe('PNG')
  })

  it('favicon.svg exists', () => {
    const svgPath = resolve(__dirname, '../../public/favicon.svg')
    const content = readFileSync(svgPath, 'utf-8')
    expect(content).toContain('<svg')
    expect(content).toContain('</svg>')
  })
})

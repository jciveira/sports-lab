import { useEffect, useState } from 'react'

export type FontSize = 'small' | 'normal' | 'large'

const STORAGE_KEY = 'hbl-font-size'

const SCALE_MAP: Record<FontSize, string> = {
  small: '0.75',
  normal: '1',
  large: '1.25',
}

function applyFontSize(size: FontSize) {
  document.documentElement.style.setProperty('--hbl-score-scale', SCALE_MAP[size])
}

export function useFontSize(): { fontSize: FontSize; setFontSize: (size: FontSize) => void } {
  const [fontSize, setFontSizeState] = useState<FontSize>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return (stored === 'small' || stored === 'large') ? stored : 'normal'
  })

  useEffect(() => {
    applyFontSize(fontSize)
  }, [fontSize])

  function setFontSize(size: FontSize) {
    localStorage.setItem(STORAGE_KEY, size)
    setFontSizeState(size)
  }

  return { fontSize, setFontSize }
}

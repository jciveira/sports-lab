export type AppLang = 'en' | 'es'

/** Detect language from device. Falls back to 'en'. */
export function detectLang(): AppLang {
  const nav = navigator.language || navigator.languages?.[0] || 'en'
  return nav.startsWith('es') ? 'es' : 'en'
}

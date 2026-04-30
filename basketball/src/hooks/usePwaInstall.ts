import { useEffect, useRef, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type InstallState =
  | 'hidden'
  | 'android-prompt'
  | 'android-tip'
  | 'ios-tip'
  | 'desktop-tip'

export function usePwaInstall() {
  const [state, setState] = useState<InstallState>('hidden')
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) return
    if ((navigator as Navigator & { standalone?: boolean }).standalone) return

    const ua = navigator.userAgent
    const isIos = /iphone|ipad|ipod/i.test(ua)
    const isAndroid = /android/i.test(ua)

    if (isIos) { setState('ios-tip'); return }
    setState(isAndroid ? 'android-tip' : 'desktop-tip')

    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault()
      deferredPrompt.current = e as BeforeInstallPromptEvent
      setState('android-prompt')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  }, [])

  async function triggerInstall() {
    if (!deferredPrompt.current) return
    await deferredPrompt.current.prompt()
    const { outcome } = await deferredPrompt.current.userChoice
    deferredPrompt.current = null
    setState(outcome === 'accepted' ? 'hidden' : 'android-tip')
  }

  return { state, triggerInstall }
}

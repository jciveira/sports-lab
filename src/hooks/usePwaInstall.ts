import { useEffect, useRef, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type InstallState =
  | 'hidden'         // already installed (standalone mode)
  | 'android-prompt' // beforeinstallprompt available — can trigger native dialog
  | 'android-tip'    // Android but no prompt event (or was dismissed) — show manual instructions
  | 'ios-tip'        // iOS Safari — show step-by-step modal
  | 'desktop-tip'    // Desktop browser — show generic instructions

export function usePwaInstall() {
  const [state, setState] = useState<InstallState>('hidden')
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null)
  const isAndroidRef = useRef(false)

  useEffect(() => {
    // Already installed in standalone mode — nothing to show
    if (window.matchMedia('(display-mode: standalone)').matches) return
    if ((navigator as Navigator & { standalone?: boolean }).standalone) return

    const ua = navigator.userAgent
    const isIos = /iphone|ipad|ipod/i.test(ua)
    const isAndroid = /android/i.test(ua)
    isAndroidRef.current = isAndroid

    if (isIos) {
      setState('ios-tip')
      return
    }

    // On Android, start with manual tip — upgrade to native prompt if event fires
    if (isAndroid) {
      setState('android-tip')
    } else {
      setState('desktop-tip')
    }

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
    // If dismissed, fall back to manual tip so the entry point stays useful
    setState(outcome === 'accepted' ? 'hidden' : 'android-tip')
  }

  return { state, triggerInstall }
}

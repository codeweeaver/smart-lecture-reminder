import { useState, useEffect } from 'react'

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [canInstall, setCanInstall] = useState(false)

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setDeferredPrompt(e); setCanInstall(true) }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function install() {
    if (!deferredPrompt) return false
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    setDeferredPrompt(null); setCanInstall(false)
    return outcome === 'accepted'
  }

  return { canInstall, install }
}

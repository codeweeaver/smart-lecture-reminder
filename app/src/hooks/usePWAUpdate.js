import { useState, useEffect } from 'react'

export function usePWAUpdate() {
  const [needUpdate, setNeedUpdate] = useState(false)
  const [registration, setRegistration] = useState(null)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    let intervalId

    navigator.serviceWorker.getRegistration().then(reg => {
      if (!reg) return
      setRegistration(reg)

      reg.addEventListener('updatefound', () => {
        const worker = reg.installing
        if (!worker) return
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            setNeedUpdate(true)
          }
        })
      })

      // Check for update immediately, then every 60 seconds
      reg.update()
      intervalId = setInterval(() => reg.update(), 60000)
    })

    return () => clearInterval(intervalId)
  }, [])

  function update() {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })
    }
    window.location.reload()
  }

  return { needUpdate, update }
}

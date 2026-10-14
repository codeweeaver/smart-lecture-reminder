import { supabase } from './supabase.js'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

export async function subscribeToPush(userId) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { success: false, reason: 'not-supported' }
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    return { success: false, reason: 'denied' }
  }

  try {
    const registration = await navigator.serviceWorker.ready
    let subscription = await registration.pushManager.getSubscription()

    if (!subscription) {
      if (!VAPID_PUBLIC_KEY) return { success: false, reason: 'no-vapid-key' }
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
    }

    const subJson = subscription.toJSON()

    // Store in Supabase
    const { data: user } = await supabase.from('users').select('push_subscriptions').eq('id', userId).single()
    const existing = user?.push_subscriptions || []
    const endpoint = subJson.endpoint
    const filtered = existing.filter(s => s.endpoint !== endpoint)

    await supabase.from('users').update({
      push_subscriptions: [...filtered, subJson]
    }).eq('id', userId)

    return { success: true, subscription }
  } catch (err) {
    console.error('Push subscription error:', err)
    return { success: false, reason: err.message }
  }
}

export async function unsubscribeFromPush(userId) {
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (subscription) {
    await subscription.unsubscribe()
    const { data: user } = await supabase.from('users').select('push_subscriptions').eq('id', userId).single()
    const filtered = (user?.push_subscriptions || []).filter(s => s.endpoint !== subscription.endpoint)
    await supabase.from('users').update({ push_subscriptions: filtered }).eq('id', userId)
  }
}

export async function isPushSubscribed() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    return !!subscription
  } catch {
    return false
  }
}

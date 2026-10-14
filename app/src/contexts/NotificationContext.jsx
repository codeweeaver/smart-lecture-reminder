import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../services/supabase.js'
import { useAuth } from './AuthContext.jsx'

const NotificationContext = createContext(null)

export function NotificationProvider({ children }) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [isPanelOpen, setIsPanelOpen] = useState(false)

  const unreadCount = notifications.filter(n => !n.read).length

  useEffect(() => {
    if (!user) { setNotifications([]); return }

    async function loadNotifications() {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)
      setNotifications(data || [])
    }

    loadNotifications()

    const channel = supabase
      .channel('notifications-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        payload => setNotifications(prev => [payload.new, ...prev])
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [user])

  async function markRead(notificationId) {
    await supabase.from('notifications').update({ read: true }).eq('id', notificationId)
    setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n))
  }

  async function markAllRead() {
    if (!user) return
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, isPanelOpen, setIsPanelOpen, markRead, markAllRead }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications must be used inside NotificationProvider')
  return ctx
}

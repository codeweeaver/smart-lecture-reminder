import { useEffect } from 'react'
import useNotifications from '../../hooks/useNotifications.js'

// Invisible component  just runs the notification init effect
export default function NotificationsInitializer() {
  useNotifications()
  return null
}

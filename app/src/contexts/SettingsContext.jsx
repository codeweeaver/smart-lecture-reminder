import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../services/supabase.js'
import { useAuth } from './AuthContext.jsx'
import { isWithinInterval, parseISO } from 'date-fns'

const SettingsContext = createContext(null)

const DEFAULTS = {
  active_academic_session: '2025_2',
  active_semester: 'second',
  facilitation_start: '2026-02-02',
  facilitation_end: '2026-08-30',
}

export function SettingsProvider({ children }) {
  const { user } = useAuth()
  const [settings, setSettings] = useState({ ...DEFAULTS })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setLoading(false); return }

    setLoading(true)
    supabase.from('app_settings').select('*').then(({ data }) => {
      if (data?.length) {
        const map = Object.fromEntries(data.map(s => [s.key, s.value]))
        setSettings(s => ({ ...s, ...map }))
      }
      setLoading(false)
    })

    const channel = supabase
      .channel('app-settings-realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'app_settings' },
        payload => setSettings(s => ({ ...s, [payload.new.key]: payload.new.value }))
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [user])

  const facilitationStart = settings.facilitation_start ? parseISO(settings.facilitation_start) : null
  const facilitationEnd   = settings.facilitation_end   ? parseISO(settings.facilitation_end)   : null

  const isInFacilitationPeriod = facilitationStart && facilitationEnd
    ? isWithinInterval(new Date(), { start: facilitationStart, end: facilitationEnd })
    : true

  return (
    <SettingsContext.Provider value={{
      settings,
      loading,
      activeSession:          settings.active_academic_session,
      activeSemester:         settings.active_semester,
      facilitationStart,
      facilitationEnd,
      isInFacilitationPeriod,
    }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider')
  return ctx
}

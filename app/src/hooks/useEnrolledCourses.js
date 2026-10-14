import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../services/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'

export function useEnrolledCourses() {
  const { user } = useAuth()
  const [enrollments, setEnrollments] = useState([])
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    if (!user) { setEnrollments([]); setLoading(false); return }
    async function load() {
      const { data: settings } = await supabase.from('app_settings').select('value').eq('key', 'active_academic_session').single()
      const session = settings?.value || '2025_2'
      const { data } = await supabase.from('enrollments').select('*, course:courses(*)').eq('user_id', user.id).eq('academic_session', session).eq('expired', false)
      setEnrollments(data || [])
      setLoading(false)
    }
    load()
  }, [user, tick])

  return { enrollments, loading, refresh }
}

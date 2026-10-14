import { useState, useEffect } from 'react'
import { startOfMonth, endOfMonth } from 'date-fns'
import { supabase } from '../services/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useSettings } from '../contexts/SettingsContext.jsx'

export function useLecturerCourses() {
  const { user } = useAuth()
  const { activeSession } = useSettings()
  const [courses, setCourses] = useState([])
  const [lecturesThisMonth, setLecturesThisMonth] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setCourses([]); setLecturesThisMonth(0); setLoading(false); return }
    async function load() {
      const now = new Date()
      const [{ data: lecturerCourses }, { count }] = await Promise.all([
        supabase.from('lecturer_courses').select('*, course:courses(*)')
          .eq('lecturer_id', user.id)
          .eq('academic_session', activeSession),
        supabase.from('lectures').select('*', { count: 'exact', head: true })
          .eq('facilitator_id', user.id)
          .gte('start_time', startOfMonth(now).toISOString())
          .lte('start_time', endOfMonth(now).toISOString()),
      ])
      setCourses(lecturerCourses || [])
      setLecturesThisMonth(count || 0)
      setLoading(false)
    }
    load()
  }, [user, activeSession])

  return { courses, lecturesThisMonth, loading }
}

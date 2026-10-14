import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase, fetchAllRows } from '../services/supabase.js'
import { useAuth } from './AuthContext.jsx'
import { useSettings } from './SettingsContext.jsx'

const LecturesContext = createContext(null)

export function LecturesProvider({ children }) {
  const { user, profile } = useAuth()
  const { activeSession, loading: settingsLoading } = useSettings()
  const [lectures, setLectures] = useState([])
  const [tmaDeadlines, setTmaDeadlines] = useState([])
  const [enrolledCourseIds, setEnrolledCourseIds] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  // The realtime subscription below is set up once per effect run and reads
  // scope from this ref (not the state above) — state captured in the .on()
  // closure would stay frozen at its value when the closure was created,
  // never seeing the courseIds loadData() sets moments later.
  const scopeRef = useRef({ role: null, userId: null, courseIds: [] })

  useEffect(() => {
    if (!user || !profile) { setLoading(false); return }
    if (settingsLoading) return  // wait for active session to be known

    async function loadData() {
      setLoading(true)
      try {
        const role = profile.role

        if (role === 'admin') {
          const [lecturesData, tmaRes] = await Promise.all([
            fetchAllRows(() => supabase.from('lectures').select('*').eq('academic_session', activeSession).order('start_time')),
            supabase.from('tma_deadlines').select('*').eq('academic_session', activeSession).order('due_date'),
          ])
          setLectures(lecturesData)
          setTmaDeadlines(tmaRes.data || [])
          setEnrolledCourseIds([])
          scopeRef.current = { role: 'admin', userId: user.id, courseIds: [] }

        } else if (role === 'lecturer') {
          const [lecturesData, tmaRes] = await Promise.all([
            fetchAllRows(() => supabase.from('lectures').select('*').eq('facilitator_id', user.id).eq('academic_session', activeSession).order('start_time')),
            supabase.from('tma_deadlines').select('*').eq('academic_session', activeSession).order('due_date'),
          ])
          setLectures(lecturesData)
          setTmaDeadlines(tmaRes.data || [])
          setEnrolledCourseIds([])
          scopeRef.current = { role: 'lecturer', userId: user.id, courseIds: [] }

        } else {
          // Student  scope to enrolled courses
          const { data: enrollments } = await supabase
            .from('enrollments')
            .select('course_id, academic_session')
            .eq('user_id', user.id)
            .eq('expired', false)

          const courseIds = (enrollments || []).map(e => e.course_id)
          setEnrolledCourseIds(courseIds)
          scopeRef.current = { role: 'student', userId: user.id, courseIds }

          if (courseIds.length === 0) {
            setLectures([])
            setTmaDeadlines([])
            setLoading(false)
            return
          }

          // Prefer enrollments that match the active session.
          // If the admin changed the active session after enrollment,
          // fall back to the session on the student's own enrollments so
          // their lectures still appear instead of going blank.
          const activeMatch = (enrollments || []).find(e => e.academic_session === activeSession)
          const lectureSession = activeMatch
            ? activeSession
            : ((enrollments || [])[0]?.academic_session || activeSession)

          const [lecturesData, tmaRes] = await Promise.all([
            fetchAllRows(() => supabase.from('lectures').select('*').in('course_id', courseIds).eq('academic_session', lectureSession).order('start_time')),
            supabase.from('tma_deadlines').select('*').eq('academic_session', lectureSession).order('due_date'),
          ])
          setLectures(lecturesData)
          setTmaDeadlines(tmaRes.data || [])
        }
      } catch (e) {
        console.error('LecturesContext load error:', e)
      } finally {
        setLoading(false)
      }
    }

    loadData()

    // Subscribed to the whole table (Supabase Realtime can't filter server-side
    // on an .in() list), so every INSERT/UPDATE anywhere fires here regardless
    // of role — e.g. an admin bulk-importing lectures for every course would
    // otherwise stream straight into every open student/lecturer tab's local
    // state. Scope each event against scopeRef before applying it.
    function inScope(row) {
      if (!row) return false
      const { role, userId, courseIds } = scopeRef.current
      if (role === 'admin') return true
      if (role === 'lecturer') return row.facilitator_id === userId
      if (role === 'student') return courseIds.includes(row.course_id)
      return false
    }

    const channel = supabase
      .channel('lectures-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lectures' }, payload => {
        if (payload.eventType === 'INSERT') {
          if (inScope(payload.new)) setLectures(prev => [...prev, payload.new])
        }
        if (payload.eventType === 'UPDATE') {
          setLectures(prev => prev.some(l => l.id === payload.new.id)
            ? prev.map(l => l.id === payload.new.id ? payload.new : l)
            : (inScope(payload.new) ? [...prev, payload.new] : prev))
        }
        if (payload.eventType === 'DELETE') setLectures(prev => prev.filter(l => l.id !== payload.old.id))
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [user, profile, activeSession, settingsLoading, refreshKey])

  function refreshLectures() { setRefreshKey(k => k + 1) }

  return (
    <LecturesContext.Provider value={{ lectures, tmaDeadlines, enrolledCourseIds, loading, setLectures, setEnrolledCourseIds, refreshLectures }}>
      {children}
    </LecturesContext.Provider>
  )
}

export function useLectures() {
  const ctx = useContext(LecturesContext)
  if (!ctx) throw new Error('useLectures must be used inside LecturesProvider')
  return ctx
}

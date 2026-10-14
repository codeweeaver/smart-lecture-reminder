import { useState, useEffect } from 'react'
import { supabase } from '../../services/supabase.js'
import { createLecture, updateLecture } from '../../services/lectures.service.js'
import { Button } from '../ui/Button.jsx'
import { Input } from '../ui/Input.jsx'
import { Select } from '../ui/Select.jsx'
import { extractMeetingId, extractZoomPassword, buildDeepLink } from '../../utils/zoomHelpers.js'
import { useToast } from '../ui/Toast.jsx'
import { useSettings } from '../../contexts/SettingsContext.jsx'
import { FiAlertCircle, FiInfo } from 'react-icons/fi'

const BLANK = {
  course_id: '', facilitator_id: '', venue: 'Zoom', meeting_platform: 'zoom',
  meeting_web_url: '', start_time: '', end_time: '',
  status: 'scheduled', semester: '', academic_session: '',
}

const STATUSES = [
  { value: 'scheduled',   label: 'Scheduled' },
  { value: 'cancelled',   label: 'Cancelled' },
  { value: 'rescheduled', label: 'Rescheduled' },
  { value: 'completed',   label: 'Completed' },
]

export default function LectureForm({ lecture, onSaved, onCancel, lecturers: propLecturers }) {
  const { activeSession, activeSemester } = useSettings()
  const toast = useToast()
  const [form, setForm] = useState(lecture ? { ...lecture } : { ...BLANK })
  const [lecturers, setLecturers] = useState(propLecturers || [])
  const [facilitatorCourses, setFacilitatorCourses] = useState([])
  const [loadingCourses, setLoadingCourses] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Session + semester always reflect app settings for new lectures.
  useEffect(() => {
    if (!lecture?.id) {
      setForm(prev => ({ ...prev, academic_session: activeSession, semester: activeSemester }))
    }
  }, [activeSession, activeSemester, lecture?.id])

  // Sync prop lecturers when they arrive (parent may load after mount).
  useEffect(() => {
    if (propLecturers && propLecturers.length > 0) {
      setLecturers(propLecturers)
    }
  }, [propLecturers])

  // Fallback fetch when no prop provided  uses unfiltered select (same as UserManagement)
  // to avoid the self-referential RLS hang that occurs with .eq('role',...) filters.
  useEffect(() => {
    if (propLecturers && propLecturers.length > 0) return
    supabase.from('users').select('id, full_name, role, status').order('full_name')
      .then(({ data }) => {
        const active = (data || []).filter(u => u.role === 'lecturer' && u.status === 'active')
        if (active.length) setLecturers(active)
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // When the facilitator changes, load only the courses they are assigned to.
  useEffect(() => {
    if (!form.facilitator_id) { setFacilitatorCourses([]); return }
    setLoadingCourses(true)
    supabase
      .from('lecturer_courses')
      .select('course:courses(*)')
      .eq('lecturer_id', form.facilitator_id)
      .then(({ data }) => {
        setFacilitatorCourses((data || []).map(r => r.course).filter(Boolean))
        setLoadingCourses(false)
      })
  }, [form.facilitator_id, activeSession])

  function set(k, v) {
    setForm(prev => {
      const next = { ...prev, [k]: v }
      // Auto-calculate end time as start + 1 hour.
      if (k === 'start_time' && v) {
        next.end_time = new Date(new Date(v).getTime() + 1 * 60 * 60 * 1000).toISOString()
      }
      // Changing the facilitator invalidates the current course selection.
      if (k === 'facilitator_id') {
        next.course_id = ''
      }
      return next
    })
  }

  async function handleSubmit() {
    setError('')
    if (!form.facilitator_id) { setError('Please select a facilitator.'); return }
    if (!form.course_id)      { setError('Please select a course.'); return }
    if (!form.start_time || !form.end_time) { setError('Start and end time are required.'); return }
    setSaving(true)
    try {
      const payload = { ...form }

      if (payload.meeting_web_url && payload.meeting_platform === 'zoom') {
        const id  = extractMeetingId(payload.meeting_web_url)
        const pwd = extractZoomPassword(payload.meeting_web_url)
        payload.meeting_id        = id
        payload.meeting_deep_link = id ? buildDeepLink(id, pwd) : null
      }

      const course = facilitatorCourses.find(c => c.id === payload.course_id)
      const lect   = lecturers.find(l => l.id === payload.facilitator_id)
      if (course) {
        payload.course_code  = course.course_code
        payload.course_title = course.course_title
        payload.color_hex    = course.color_hex || '#1a9a5c'
      }
      if (lect) payload.facilitator_name = lect.full_name

      if (lecture?.id) {
        await updateLecture(lecture.id, payload)
      } else {
        await createLecture(payload)
      }
      toast('Lecture saved!', 'success')
      onSaved?.()
    } catch (err) {
      toast(err.message || 'Save failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  const PillGroup = ({ options, value, onChange }) => (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button key={opt.value} type="button" onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
            value === opt.value
              ? 'bg-noun-500 text-white border-noun-500'
              : 'bg-white text-gray-600 border-gray-200 hover:border-noun-300'
          }`}>
          {opt.label}
        </button>
      ))}
    </div>
  )

  const coursePlaceholder = !form.facilitator_id
    ? 'Select a facilitator first'
    : loadingCourses
      ? 'Loading courses…'
      : facilitatorCourses.length === 0
        ? 'No courses assigned to this facilitator'
        : 'Select course'

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-3 py-3">
          <FiAlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 1. Facilitator  first, because it drives the course list */}
      <Select label="Facilitator" name="facilitator_id" value={form.facilitator_id}
        onChange={e => set('facilitator_id', e.target.value)}>
        <option value="">Select facilitator</option>
        {lecturers.map(l => <option key={l.id} value={l.id}>{l.full_name}</option>)}
      </Select>

      {/* 2. Course  only shows courses assigned to the selected facilitator */}
      <Select label="Course" value={form.course_id}
        onChange={e => set('course_id', e.target.value)}
        disabled={!form.facilitator_id || loadingCourses}>
        <option value="">{coursePlaceholder}</option>
        {facilitatorCourses.map(c => (
          <option key={c.id} value={c.id}>{c.course_code}  {c.course_title}</option>
        ))}
      </Select>

      {/* 3. Times  end auto-sets to start + 1h, still manually editable */}
      <div className="grid grid-cols-2 gap-3">
        <Input label="Start Time" type="datetime-local"
          value={form.start_time ? form.start_time.slice(0, 16) : ''}
          onChange={e => set('start_time', e.target.value ? new Date(e.target.value).toISOString() : '')} />
        <Input label="End Time" type="datetime-local"
          value={form.end_time ? form.end_time.slice(0, 16) : ''}
          onChange={e => set('end_time', e.target.value ? new Date(e.target.value).toISOString() : '')}
          hint="Auto-set to +1 h from start" />
      </div>

      {/* 4. Meeting URL  platform is always Zoom, hardcoded via BLANK.meeting_platform */}
      <Input label="Meeting URL" value={form.meeting_web_url}
        onChange={e => set('meeting_web_url', e.target.value)}
        hint="Zoom URL auto-parses meeting ID and deep link" />

      {/* 5. Status  only editable on existing lectures; new lectures always start "scheduled" */}
      {lecture?.id && (
        <div>
          <p className="text-[10px] text-gray-500 mb-1.5 ml-0.5">Status</p>
          <PillGroup options={STATUSES} value={form.status} onChange={v => set('status', v)} />
        </div>
      )}

      {/* 6. Session + Semester  read-only, sourced from app settings */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-gray-700">Session</p>
          <div className="h-11.5 flex items-center px-3 border border-gray-100 rounded-xl bg-gray-50 text-sm text-gray-500">
            {form.academic_session || activeSession}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-gray-700">Semester</p>
          <div className="h-11.5 flex items-center px-3 border border-gray-100 rounded-xl bg-gray-50 text-sm text-gray-500 capitalize">
            {form.semester || activeSemester}
          </div>
        </div>
      </div>
      <p className="text-[11px] text-gray-400 flex items-center gap-1 -mt-2">
        <FiInfo size={11} />
        Change session / semester in Admin → Settings tab.
      </p>

      <div className="border-t border-gray-100 pt-3 mt-2 flex justify-end gap-3">
        <Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button>
        <Button loading={saving} onClick={handleSubmit}>
          {lecture?.id ? 'Update Lecture' : 'Create Lecture'}
        </Button>
      </div>
    </div>
  )
}

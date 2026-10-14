import { useState, useEffect } from 'react'
import { supabase, fetchAllRows } from '../../services/supabase.js'
import { useSettings } from '../../contexts/SettingsContext.jsx'
import { updateUserProfile } from '../../services/auth.service.js'
import { FACULTY_DEPARTMENTS } from '../../constants/reminderIntervals.js'
import { Modal } from '../ui/Modal.jsx'
import { Input } from '../ui/Input.jsx'
import { Select } from '../ui/Select.jsx'
import { Button } from '../ui/Button.jsx'
import { Checkbox } from '../ui/Checkbox.jsx'
import { Skeleton } from '../ui/Skeleton.jsx'
import { Badge } from '../ui/Badge.jsx'
import { useToast } from '../ui/Toast.jsx'

export default function LecturerEditModal({ lecturer, isOpen, onClose, onSaved }) {
  const toast = useToast()
  const { activeSession } = useSettings()
  const [form, setForm] = useState({ full_name: '', faculty: '', department: '' })
  const [courses, setCourses] = useState([])
  const [assigned, setAssigned] = useState(new Set())
  const [loadingCourses, setLoadingCourses] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen || !lecturer) return
    setError('')
    setForm({
      full_name: lecturer.full_name || '',
      faculty: lecturer.faculty || '',
      department: lecturer.department || '',
    })
    loadCourses(lecturer.id)
  }, [isOpen, lecturer, lecturer.id])

  async function loadCourses(lecturerId) {
    setLoadingCourses(true)
    const [allCourses, { data: existing }] = await Promise.all([
      fetchAllRows(() => supabase.from('courses').select('*').order('course_code')),
      supabase.from('lecturer_courses').select('course_id')
        .eq('lecturer_id', lecturerId),
    ])
    setCourses(allCourses || [])
    setAssigned(new Set((existing || []).map(e => e.course_id)))
    setLoadingCourses(false)
  }

  function toggleCourse(id) {
    setAssigned(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  function setField(key, val) { setForm(f => ({ ...f, [key]: val })) }

  async function handleSave() {
    if (!form.full_name.trim()) { setError('Full name is required'); return }
    setError('')
    setSaving(true)
    try {
      await updateUserProfile(lecturer.id, {
        full_name: form.full_name.trim(),
        faculty: form.faculty.trim(),
        department: form.department.trim(),
      })

      const { data: existing } = await supabase.from('lecturer_courses').select('course_id')
        .eq('lecturer_id', lecturer.id).eq('academic_session', activeSession)
      const existingIds = (existing || []).map(e => e.course_id)

      const toAdd = [...assigned].filter(id => !existingIds.includes(id))
      const toRemove = existingIds.filter(id => !assigned.has(id))

      if (toAdd.length > 0) {
        await supabase.from('lecturer_courses').upsert(
          toAdd.map(cid => ({ lecturer_id: lecturer.id, course_id: cid, academic_session: activeSession })),
          { onConflict: 'lecturer_id,course_id,academic_session' }
        )
      }
      if (toRemove.length > 0) {
        await supabase.from('lecturer_courses').delete()
          .eq('lecturer_id', lecturer.id)
          .eq('academic_session', activeSession)
          .in('course_id', toRemove)
      }

      toast('Lecturer updated', 'success')
      onSaved?.()
    } catch (err) {
      setError(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const statusColors = { active: 'green', pending: 'orange', suspended: 'red' }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Lecturer" size="lg">
      {/* Lecturer identity */}
      <div className="flex items-center gap-3 p-3 mb-5 bg-gray-50 rounded-xl">
        <div className="flex items-center justify-center rounded-full w-9 h-9 bg-noun-100 shrink-0">
          <span className="text-sm font-bold text-noun-700">
            {lecturer?.full_name?.[0]?.toUpperCase() ?? '?'}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{lecturer?.full_name}</p>
          <p className="text-xs text-gray-400 truncate">{lecturer?.email}</p>
        </div>
        <Badge color={statusColors[lecturer?.status] || 'gray'}>{lecturer?.status}</Badge>
      </div>

      {/* Profile fields */}
      <div className="mb-5 space-y-3">
        <p className="text-xs font-semibold tracking-wide text-gray-400 uppercase">Profile</p>
        <Input
          label="Full Name"
          value={form.full_name}
          onChange={e => setField('full_name', e.target.value)}
          error={error && !form.full_name.trim() ? error : ''}
        />
        <Select
          label="Faculty"
          value={form.faculty}
          onChange={e => setForm(f => ({ ...f, faculty: e.target.value, department: '' }))}
        >
          <option value="">Select faculty</option>
          {Object.keys(FACULTY_DEPARTMENTS).map(f => (
            <option key={f} value={f}>{f}</option>
          ))}
        </Select>
        <Select
          label="Department"
          value={form.department}
          onChange={e => setField('department', e.target.value)}
          disabled={!form.faculty}
        >
          <option value="">{form.faculty ? 'Select department' : 'Select a faculty first'}</option>
          {(FACULTY_DEPARTMENTS[form.faculty] || []).map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </Select>
        <Input
          label="Email"
          value={lecturer?.email ?? ''}
          disabled
          hint="Email cannot be changed here"
        />
      </div>

      {/* Course assignment */}
      <div>
        <p className="mb-2 text-xs font-semibold tracking-wide text-gray-400 uppercase">
          Assigned Courses  {activeSession}
        </p>
        {loadingCourses ? (
          <div className="space-y-1">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
        ) : courses.length === 0 ? (
          <p className="py-2 text-sm text-gray-400">No courses found for the active session.</p>
        ) : (
          <div className="max-h-52 overflow-y-auto space-y-0.5 border border-gray-100 rounded-xl p-2">
            {courses.map(c => (
              <div key={c.id} className="px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                <Checkbox
                  label={`${c.course_code}  ${c.course_title}`}
                  checked={assigned.has(c.id)}
                  onChange={() => toggleCourse(c.id)}
                />
              </div>
            ))}
          </div>
        )}
        {assigned.size > 0 && (
          <p className="text-xs text-noun-600 mt-1.5">{assigned.size} course{assigned.size !== 1 ? 's' : ''} selected</p>
        )}
      </div>

      {/* General error */}
      {error && form.full_name.trim() && (
        <p className="mt-3 text-sm text-red-500">{error}</p>
      )}

      <div className="flex justify-end gap-3 pt-3 mt-4 border-t border-gray-100">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} loading={saving}>Save Changes</Button>
      </div>
    </Modal>
  )
}

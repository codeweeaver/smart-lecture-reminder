import { useState } from 'react'
import { FiAlertCircle } from 'react-icons/fi'
import { useSettings } from '../../contexts/SettingsContext.jsx'
import { createCourse, updateCourse } from '../../services/courses.service.js'
import { Button } from '../ui/Button.jsx'
import { Input } from '../ui/Input.jsx'
import { Select } from '../ui/Select.jsx'
import { PROGRAMMES } from '../../constants/reminderIntervals.js'

const PRESET_COLORS = [
  '#1a9a5c', '#127a46', '#3db57a', '#0d5c34',
  '#6366f1', '#f59e0b', '#ef4444', '#0ea5e9',
]

export default function CourseForm({ course, onSaved, onCancel }) {
  const { activeSession, activeSemester } = useSettings()

  const BLANK = {
    course_code: '', course_title: '', credit_units: 2,
    programme: '', level: 400, semester: activeSemester,
    academic_session: activeSession, color_hex: '#127a46',
  }

  const [form, setForm] = useState(course ? {
    course_code:      course.course_code      || '',
    course_title:     course.course_title     || '',
    credit_units:     course.credit_units     ?? 2,
    programme:        course.programme        || '',
    level:            course.level            ?? 400,
    semester:         course.semester         || activeSemester,
    academic_session: course.academic_session || activeSession,
    color_hex:        course.color_hex        || '#127a46',
  } : { ...BLANK })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit() {
    setError('')
    if (!form.course_code || !form.course_title) {
      setError('Course code and title are required.')
      return
    }
    setSaving(true)
    try {
      if (course) {
        await updateCourse(course.id, form)
      } else {
        await createCourse(form)
      }
      onSaved?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-start gap-2 px-3 py-3 text-sm text-red-700 border border-red-100 bg-red-50 rounded-xl">
          <FiAlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-4">
        <Input
          label="Course Code *"
          value={form.course_code}
          onChange={e => set('course_code', e.target.value)}
          placeholder="e.g. CIT 403"
        />
        <Input
          label="Credit Units"
          type="number"
          value={form.credit_units}
          onChange={e => set('credit_units', Number(e.target.value))}
        />
      </div>

      <Input
        label="Course Title *"
        value={form.course_title}
        onChange={e => set('course_title', e.target.value)}
        placeholder="e.g. Database Design and Management"
      />

      <Select
        label="Programme"
        value={form.programme}
        onChange={e => set('programme', e.target.value)}
      >
        <option value="">Select programme</option>
        {PROGRAMMES.map(p => <option key={p} value={p}>{p}</option>)}
      </Select>

      <div className="grid grid-cols-2 gap-3">
        <Select label="Level" value={form.level} onChange={e => set('level', Number(e.target.value))}>
          {[100, 200, 300, 400, 500].map(l => <option key={l} value={l}>{l} Level</option>)}
        </Select>
        <Select label="Semester" value={form.semester} onChange={e => set('semester', e.target.value)}>
          <option value="first">First</option>
          <option value="second">Second</option>
        </Select>
      </div>

      {/* Session  read-only, sourced from app settings for new courses */}
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-gray-700">Academic Session</p>
        <div className="h-11.5 flex items-center px-3 border border-gray-100 rounded-xl bg-gray-50 text-sm text-gray-500">
          {form.academic_session}
        </div>
      </div>

      <div>
        <p className="text-[10px] text-gray-500 mb-2 ml-0.5">Course Color</p>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map(color => (
            <button
              key={color}
              type="button"
              onClick={() => set('color_hex', color)}
              className={`w-7 h-7 rounded-full transition-all ${
                form.color_hex === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
          <input
            type="color"
            value={form.color_hex}
            onChange={e => set('color_hex', e.target.value)}
            className="w-7 h-7 rounded-full border border-gray-200 cursor-pointer p-0.5"
            title="Custom color"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-3 mt-2 border-t border-gray-100">
        <Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button>
        <Button loading={saving} onClick={handleSubmit}>
          {course ? 'Update Course' : 'Create Course'}
        </Button>
      </div>
    </div>
  )
}

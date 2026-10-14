import { useState } from 'react'
import { useAttendance } from '../../hooks/useAttendance.js'
import { motion } from 'motion/react'
import { BsCheckCircleFill, BsXCircleFill, BsDashCircleFill } from 'react-icons/bs'
import AttendanceNote from './AttendanceNote.jsx'
import { useToast } from '../ui/Toast.jsx'

const STATUSES = [
  { value: 'attended', label: 'I attended', icon: BsCheckCircleFill, color: 'text-green-600', bg: 'bg-green-50', ring: 'ring-green-500' },
  { value: 'missed',   label: 'I missed this', icon: BsXCircleFill, color: 'text-red-600',   bg: 'bg-red-50',   ring: 'ring-red-500' },
  { value: 'excused',  label: 'Excused',    icon: BsDashCircleFill, color: 'text-gray-500',  bg: 'bg-gray-50',  ring: 'ring-gray-400' },
]

export default function AttendanceControls({ lecture }) {
  const { getForLecture, mark } = useAttendance()
  const toast = useToast()
  const [saving, setSaving] = useState(false)
  const [note, setNote] = useState('')

  const existing = getForLecture(lecture.id)
  const [status, setStatus] = useState(existing?.status || null)

  async function handleMark(newStatus) {
    setStatus(newStatus)
    setSaving(true)
    try {
      await mark(lecture.id, lecture.course_id, newStatus, note)
      toast('Attendance saved', 'success')
    } catch {
      toast('Failed to save attendance', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="border-t border-gray-100 pt-4">
      <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Attendance</p>
      <div className="flex gap-2 mb-3">
        {STATUSES.map(s => {
          const Icon = s.icon
          const isSelected = status === s.value
          return (
            <motion.button key={s.value} whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.02 }}
              onClick={() => handleMark(s.value)} disabled={saving}
              className={`flex-1 flex flex-col items-center gap-1.5 p-2.5 rounded-xl text-xs font-medium transition border-2 ${
                isSelected ? `${s.bg} border-current ring-2 ${s.ring} ring-offset-1 ${s.color}` : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
            >
              <Icon size={18} className={isSelected ? s.color : 'text-gray-400'} />
              {s.label}
            </motion.button>
          )
        })}
      </div>
      {status && <AttendanceNote note={note} onChange={setNote} onSave={() => handleMark(status)} />}
    </div>
  )
}

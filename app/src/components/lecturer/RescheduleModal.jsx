import { useState } from 'react'
import { Modal } from '../ui/Modal.jsx'
import { Button } from '../ui/Button.jsx'
import { Input } from '../ui/Input.jsx'
import { rescheduleLecture } from '../../services/lectures.service.js'
import { useToast } from '../ui/Toast.jsx'
import { format } from 'date-fns'
import { FiAlertTriangle } from 'react-icons/fi'

export default function RescheduleModal({ lecture, isOpen, onClose, onRescheduled }) {
  const toast = useToast()
  const [startTime, setStartTime] = useState(lecture?.start_time ? lecture.start_time.slice(0, 16) : '')
  const [endTime, setEndTime] = useState(lecture?.end_time ? lecture.end_time.slice(0, 16) : '')
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    if (!lecture) return
    setSaving(true)
    try {
      await rescheduleLecture(lecture.id, new Date(startTime).toISOString(), new Date(endTime).toISOString())
      toast('Lecture rescheduled  students notified', 'success')
      onRescheduled?.()
      onClose()
    } catch (err) {
      toast(err.message || 'Reschedule failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Reschedule Lecture">
      {lecture && (
        <div className="mb-4 p-3 bg-gray-50 rounded-xl text-sm">
          <p className="font-medium text-gray-900">{lecture.course_code}</p>
          <p className="text-gray-500">Current: {format(new Date(lecture.start_time), 'EEE, MMM d · h:mm a')}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-4">
        <Input label="New Date & Start" type="datetime-local"
          value={startTime} onChange={e => setStartTime(e.target.value)} />
        <Input label="New End Time" type="datetime-local"
          value={endTime} onChange={e => setEndTime(e.target.value)} />
      </div>

      <div className="flex items-start gap-2 bg-orange-50 border border-orange-100 rounded-xl p-3 mb-4 text-xs text-orange-700">
        <FiAlertTriangle size={14} className="mt-0.5 shrink-0" />
        <span>All enrolled students will receive an instant push notification about this reschedule.</span>
      </div>

      <div className="border-t border-gray-100 pt-3 flex justify-end gap-3">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button loading={saving} onClick={handleSubmit}>Reschedule & Notify</Button>
      </div>
    </Modal>
  )
}

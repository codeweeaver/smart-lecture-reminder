import { useState } from 'react'
import { Modal } from '../ui/Modal.jsx'
import { Button } from '../ui/Button.jsx'
import { Textarea } from '../ui/Textarea.jsx'
import { cancelLecture } from '../../services/lectures.service.js'
import { useToast } from '../ui/Toast.jsx'
import { FiAlertCircle } from 'react-icons/fi'

export default function CancelModal({ lecture, isOpen, onClose, onCancelled }) {
  const toast = useToast()
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    if (!lecture) return
    setSaving(true)
    try {
      await cancelLecture(lecture.id, reason)
      toast('Lecture cancelled  students notified', 'success')
      onCancelled?.()
      onClose()
    } catch (err) {
      toast(err.message || 'Cancel failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cancel Lecture">
      <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl p-3 mb-4 text-sm text-red-700">
        <FiAlertCircle size={15} className="mt-0.5 shrink-0" />
        <div>
          <p className="font-medium">{lecture?.course_code}  {lecture?.course_title}</p>
          <p className="text-xs mt-0.5">This cannot be undone. All enrolled students will be notified immediately.</p>
        </div>
      </div>

      <Textarea
        label="Reason for cancellation"
        rows={2}
        value={reason}
        onChange={e => setReason(e.target.value)}
        hint="e.g. Facilitator is ill, will reschedule next week…"
      />

      <div className="border-t border-gray-100 pt-3 mt-4 flex justify-end gap-3">
        <Button variant="ghost" onClick={onClose}>Go Back</Button>
        <Button variant="danger" loading={saving} onClick={handleSubmit}
          disabled={!reason.trim()}>
          Cancel &amp; Notify
        </Button>
      </div>
    </Modal>
  )
}

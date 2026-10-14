import { useState } from 'react'
import { addRecording } from '../../services/lectures.service.js'
import { Button } from '../ui/Button.jsx'
import { Input } from '../ui/Input.jsx'
import { useToast } from '../ui/Toast.jsx'

export default function AddRecordingForm({ lecture, onAdded, onCancel }) {
  const toast = useToast()
  const [url, setUrl] = useState(lecture?.recording_url || '')
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    if (!lecture || !url.trim()) return
    setSaving(true)
    try {
      await addRecording(lecture.id, url.trim())
      toast('Recording link saved  students notified', 'success')
      onAdded?.()
    } catch (err) {
      toast(err.message || 'Failed to save', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Add the recording link for <strong>{lecture?.course_code}</strong>. Enrolled students will be notified.
      </p>

      <Input
        label="Recording URL"
        type="url"
        value={url}
        onChange={e => setUrl(e.target.value)}
        hint="e.g. https://zoom.us/rec/..."
      />

      <div className="border-t border-gray-100 pt-3 flex justify-end gap-3">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button loading={saving} onClick={handleSubmit} disabled={!url.trim()}>
          Save &amp; Notify
        </Button>
      </div>
    </div>
  )
}

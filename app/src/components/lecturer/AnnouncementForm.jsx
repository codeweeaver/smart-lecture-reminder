import { useState } from 'react'
import { postAnnouncement } from '../../services/lectures.service.js'
import { Button } from '../ui/Button.jsx'
import { Textarea } from '../ui/Textarea.jsx'
import { useToast } from '../ui/Toast.jsx'

const MAX_CHARS = 280

export default function AnnouncementForm({ lecture, onPosted, onCancel }) {
  const toast = useToast()
  const [text, setText] = useState(lecture?.announcement || '')
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    if (!lecture || !text.trim()) return
    setSaving(true)
    try {
      await postAnnouncement(lecture.id, text.trim())
      toast('Announcement posted  students notified', 'success')
      onPosted?.()
    } catch (err) {
      toast(err.message || 'Failed to post', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <Textarea
        label={`Announcement for ${lecture?.course_code || 'this lecture'}`}
        rows={2}
        maxLength={MAX_CHARS}
        value={text}
        onChange={e => setText(e.target.value)}
        hint="Students receive a push notification when you post"
      />

      <div className="border-t border-gray-100 pt-3 flex justify-end gap-3">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button loading={saving} onClick={handleSubmit} disabled={!text.trim()}>
          Post Announcement
        </Button>
      </div>
    </div>
  )
}

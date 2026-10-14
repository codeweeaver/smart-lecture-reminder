import { useState } from 'react'
import { BottomSheet } from '../ui/BottomSheet.jsx'
import { Badge } from '../ui/Badge.jsx'
import { Button } from '../ui/Button.jsx'
import { FiVideo, FiCopy, FiCalendar, FiExternalLink, FiMic } from 'react-icons/fi'
import { BsWhatsapp } from 'react-icons/bs'
import { format } from 'date-fns'
import { isPastLecture, isLiveLecture, downloadICS } from '../../utils/zoomHelpers.js'
import { buildWhatsAppShare, copyToClipboard } from '../../utils/share.js'
import { useCountdown } from '../../hooks/useCountdown.js'
import AttendanceControls from '../attendance/AttendanceControls.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useToast } from '../ui/Toast.jsx'

export default function LectureDetailSheet({ lecture, isOpen, onClose }) {
  const { profile } = useAuth()
  const toast = useToast()
  const countdown = useCountdown(lecture?.start_time)
  if (!lecture) return null

  const isLive = isLiveLecture(lecture)
  const isPast = isPastLecture(lecture)
  const startFormatted = format(new Date(lecture.start_time), 'EEEE, MMMM d · h:mm a')
  const endFormatted = format(new Date(lecture.end_time), 'h:mm a')

  async function handleCopyLink() {
    await copyToClipboard(lecture.meeting_web_url || '')
    toast('Link copied!', 'success')
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="px-4 pb-8 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: lecture.color_hex || '#1a9a5c' }}>
                {lecture.course_code}
              </span>
              {isLive && <Badge color="green">LIVE</Badge>}
              {lecture.status === 'cancelled' && <Badge color="red">Cancelled</Badge>}
              {lecture.status === 'rescheduled' && <Badge color="orange">Rescheduled</Badge>}
            </div>
            <h3 className="font-semibold text-gray-900">{lecture.course_title}</h3>
            <p className="text-sm text-gray-500 mt-0.5">{startFormatted} – {endFormatted}</p>
            <p className="text-sm text-gray-500">{lecture.facilitator_name}</p>
          </div>
        </div>

        {/* Countdown */}
        {!isPast && !isLive && (
          <div className="bg-noun-50 rounded-xl px-4 py-3 text-center">
            <p className="text-noun-700 font-semibold text-lg">{countdown}</p>
            <p className="text-noun-500 text-xs">until lecture starts</p>
          </div>
        )}

        {/* Announcement */}
        {lecture.announcement && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 flex gap-2">
            <FiMic className="text-yellow-600 shrink-0 mt-0.5" size={14} />
            <div>
              <p className="text-xs font-semibold text-yellow-700 mb-0.5">Announcement</p>
              <p className="text-sm text-yellow-800">{lecture.announcement}</p>
            </div>
          </div>
        )}

        {/* Zoom Panel */}
        {lecture.meeting_web_url && lecture.status !== 'cancelled' && (
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <FiVideo className="text-blue-600" size={16} />
              <span className="text-sm font-medium text-gray-700">
                {lecture.meeting_platform?.charAt(0).toUpperCase() + lecture.meeting_platform?.slice(1) || 'Zoom'}
              </span>
              {lecture.meeting_id && <code className="text-xs bg-white border rounded px-2 py-0.5 font-mono text-gray-600">{lecture.meeting_id}</code>}
            </div>
            <div className="flex gap-2 flex-wrap">
              {(isLive || isUpcoming30min(lecture)) && (
                <a href={lecture.meeting_deep_link || lecture.meeting_web_url} target="_blank" rel="noreferrer">
                  <Button size="sm"><FiVideo size={14} className="mr-1.5" /> Join Now</Button>
                </a>
              )}
              <button onClick={handleCopyLink}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-white border border-gray-200 hover:bg-gray-50 transition">
                <FiCopy size={12} /> Copy Link
              </button>
              <button onClick={() => downloadICS(lecture)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-white border border-gray-200 hover:bg-gray-50 transition">
                <FiCalendar size={12} /> Add to Calendar
              </button>
              <a href={buildWhatsAppShare(lecture)} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 transition">
                <BsWhatsapp size={12} /> Share
              </a>
            </div>
          </div>
        )}

        {/* Recording */}
        {lecture.recording_url && (
          <div className="bg-blue-50 rounded-xl p-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-blue-700">Recording Available</p>
              <p className="text-xs text-blue-600 truncate">{lecture.course_code} session</p>
            </div>
            <a href={lecture.recording_url} target="_blank" rel="noreferrer">
              <Button size="sm" variant="secondary"><FiExternalLink size={12} className="mr-1" /> Watch</Button>
            </a>
          </div>
        )}

        {/* Attendance (for students, past lectures) */}
        {profile?.role === 'student' && isPast && (
          <AttendanceControls lecture={lecture} />
        )}
      </div>
    </BottomSheet>
  )
}

function isUpcoming30min(lecture) {
  const diff = (new Date(lecture.start_time) - new Date()) / 60000
  return diff >= 0 && diff <= 30
}

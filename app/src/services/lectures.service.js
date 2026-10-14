import { supabase } from './supabase.js'
import { extractMeetingId, extractZoomPassword, buildDeepLink } from '../utils/zoomHelpers.js'

export async function getLecturesByCourses(courseIds, academicSession) {
  const { data, error } = await supabase
    .from('lectures')
    .select('*')
    .in('course_id', courseIds)
    .eq('academic_session', academicSession)
    .order('start_time')
  if (error) throw error
  return data
}

export async function getAllLectures(academicSession) {
  const { data, error } = await supabase
    .from('lectures')
    .select('*')
    .eq('academic_session', academicSession)
    .order('start_time')
  if (error) throw error
  return data
}

export async function getLecturesByFacilitator(facilitatorId, academicSession) {
  const { data, error } = await supabase
    .from('lectures')
    .select('*')
    .eq('facilitator_id', facilitatorId)
    .eq('academic_session', academicSession)
    .order('start_time')
  if (error) throw error
  return data
}

export async function createLecture(lectureData) {
  const { meeting_web_url } = lectureData
  const meetingId = extractMeetingId(meeting_web_url)
  const pwd = extractZoomPassword(meeting_web_url)

  const { data, error } = await supabase
    .from('lectures')
    .insert({
      ...lectureData,
      meeting_id: meetingId,
      meeting_deep_link: meetingId ? buildDeepLink(meetingId, pwd) : null,
      notifications_sent: { '30min': false, '15min': false, '5min': false },
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateLecture(id, updates) {
  if (updates.meeting_web_url) {
    const meetingId = extractMeetingId(updates.meeting_web_url)
    const pwd = extractZoomPassword(updates.meeting_web_url)
    updates.meeting_id = meetingId
    updates.meeting_deep_link = meetingId ? buildDeepLink(meetingId, pwd) : null
  }
  const { data, error } = await supabase
    .from('lectures')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteLecture(id) {
  const { error } = await supabase.from('lectures').delete().eq('id', id)
  if (error) throw error
}

export async function rescheduleLecture(id, newStart, newEnd) {
  const { data: old } = await supabase.from('lectures').select('start_time').eq('id', id).single()
  const { data, error } = await supabase
    .from('lectures')
    .update({
      start_time: newStart,
      end_time: newEnd,
      status: 'rescheduled',
      rescheduled_from: old?.start_time,
      notifications_sent: { '30min': false, '15min': false, '5min': false },
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  await notifyInstant(id, 'rescheduled')
  return data
}

export async function cancelLecture(id, reason) {
  const { data, error } = await supabase
    .from('lectures')
    .update({ status: 'cancelled', cancel_reason: reason, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  await notifyInstant(id, 'cancelled')
  return data
}

export async function postAnnouncement(id, announcement) {
  const { data, error } = await supabase
    .from('lectures')
    .update({ announcement, announcement_sent: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  await notifyInstant(id, 'announcement')
  return data
}

export async function addRecording(id, recordingUrl) {
  const { data, error } = await supabase
    .from('lectures')
    .update({ recording_url: recordingUrl, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  await notifyInstant(id, 'recording_added')
  return data
}

async function notifyInstant(lectureId, type) {
  try {
    await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cancel-notify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': import.meta.env.VITE_INTERNAL_SECRET,
      },
      body: JSON.stringify({ lectureId, type }),
    })
  } catch {
    // fire and forget  push failure must not block the UI action
  }
}

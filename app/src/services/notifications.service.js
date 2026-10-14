import { supabase } from './supabase.js'

export async function getNotifications(userId) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return data
}

export async function markNotificationRead(id) {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id)
  if (error) throw error
}

export async function markAllNotificationsRead(userId) {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false)
  if (error) throw error
}

export async function createInAppNotification(userId, lectureId, courseCode, message, type, meetingLink = null) {
  const { data, error } = await supabase
    .from('notifications')
    .insert({ user_id: userId, lecture_id: lectureId, course_code: courseCode, message, type, sent_at: new Date().toISOString(), meeting_link: meetingLink })
    .select()
    .single()
  if (error) throw error
  return data
}

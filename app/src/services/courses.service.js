import { supabase, fetchAllRows } from './supabase.js'

export async function getAllCourses() {
  return fetchAllRows(() => supabase.from('courses').select('*').order('course_code'))
}

export async function getCoursesBySession(session) {
  return fetchAllRows(() =>
    supabase.from('courses').select('*').eq('academic_session', session).order('course_code')
  )
}

export async function getCoursesByIds(ids) {
  if (!ids?.length) return []
  const { data, error } = await supabase.from('courses').select('*').in('id', ids)
  if (error) throw error
  return data
}

export async function createCourse(courseData) {
  const { data, error } = await supabase.from('courses').insert(courseData).select().single()
  if (error) throw error
  return data
}

export async function updateCourse(id, updates) {
  const { data, error } = await supabase.from('courses').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteCourse(id) {
  const { error } = await supabase.from('courses').delete().eq('id', id)
  if (error) throw error
}

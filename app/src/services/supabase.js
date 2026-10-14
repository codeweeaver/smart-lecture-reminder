import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Supabase/PostgREST caps a single response at 1000 rows by default — queries
// against tables that can legitimately exceed that (e.g. a semester's worth
// of weekly-recurring lectures) need to page through with .range() or they
// silently truncate. queryFactory must return a fresh, un-awaited query
// builder each call since .range() has to be applied before it's sent.
//
// Each page is retried on failure — with multiple sequential requests instead
// of one, a single transient network blip (seen intermittently even for plain
// one-shot queries) would otherwise discard every row already fetched, since
// the whole result is only committed to caller state once, at the end.
export async function fetchAllRows(queryFactory, pageSize = 1000) {
  let from = 0
  const all = []
  while (true) {
    let data, error
    for (let attempt = 0; attempt < 3; attempt++) {
      ;({ data, error } = await queryFactory().range(from, from + pageSize - 1))
      if (!error) break
      await new Promise(r => setTimeout(r, 500 * (attempt + 1)))
    }
    if (error) throw error
    all.push(...(data || []))
    if (!data || data.length < pageSize) break
    from += pageSize
  }
  return all
}

export default supabase

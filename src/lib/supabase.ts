import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

// Lazy singleton - avoids calling createBrowserClient at module scope
// which crashes during Next.js prerender when env vars are unavailable
let _supabase: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
    }
    _supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)
  }
  return _supabase
}

// Types for Supabase Auth
export type SupabaseUser = {
  id: string
  email?: string
  user_metadata?: {
    name?: string
    avatar_url?: string
  }
}

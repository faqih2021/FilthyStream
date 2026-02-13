import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client-side Supabase client with auth persistence
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

// Server-side Supabase client (for public data, no auth)
export const supabaseAdmin = createClient(supabaseUrl, supabaseAnonKey)

// Types for Supabase Auth
export type SupabaseUser = {
  id: string
  email?: string
  user_metadata?: {
    name?: string
    avatar_url?: string
  }
}

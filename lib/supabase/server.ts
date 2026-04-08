import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Simple Supabase client for server-side usage
export async function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Return null if environment variables are not set (e.g., during build)
  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'undefined' || supabaseAnonKey === 'undefined') {
    return null
  }

  try {
    return createSupabaseClient(supabaseUrl, supabaseAnonKey)
  } catch {
    // Return null if client creation fails
    return null
  }
}

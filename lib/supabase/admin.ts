// lib/supabase/admin.ts
// Server-only Supabase client using the service-role key.
// Never import this from a client component.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

/**
 * Creates a Supabase admin client using the service-role key.
 * Bypasses RLS - use only in trusted server contexts (cron jobs,
 * server actions, route handlers with verified auth).
 *
 * Throws if called from a client component or if required env vars
 * are missing.
 */
export function createAdminClient(): SupabaseClient {
  if (typeof window !== "undefined") {
    throw new Error(
      "createAdminClient() must not be called from a client component. " +
        "It requires the service-role key which must never be exposed to the browser."
    )
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable")
  }
  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable")
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

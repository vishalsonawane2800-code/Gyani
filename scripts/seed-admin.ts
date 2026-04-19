import { hashPassword } from '@/lib/hash'
import { createClient } from '@supabase/supabase-js'

// This is a Node.js script to seed the default admin user
// Run with: node scripts/seed-admin.js

async function main() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  // Prefer the service role key so we bypass RLS when upserting the admin row.
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY

  if (!url || !key) {
    console.error(
      'Missing Supabase env vars. Need SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.'
    )
    process.exit(1)
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  console.log('Seeding admin user...')

  // Hash the default password
  const defaultPassword = 'changeme123'
  const passwordHash = await hashPassword(defaultPassword)

  // Insert or update default admin
  const { data, error } = await supabase
    .from('admins')
    .upsert(
      {
        username: 'admin',
        password_hash: passwordHash,
        must_reset_password: true,
      },
      { onConflict: 'username' }
    )
    .select()

  if (error) {
    console.error('Error seeding admin:', error)
    process.exit(1)
  }

  console.log('✓ Admin user seeded successfully')
  console.log(`
Default Credentials:
  Username: admin
  Password: ${defaultPassword}
  
⚠️  Make sure to reset this password on first login!
  `)
}

main().catch(console.error)

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST /api/admin/upload-logo
// Uploads an IPO logo to the `ipo-logos` bucket in Supabase Storage and
// returns its public URL. We moved off Vercel Blob so this works without
// a BLOB_READ_WRITE_TOKEN — the connected Supabase project already has
// service-role credentials available on the server.
export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const slug = (formData.get('slug') as string) || 'temp'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    }

    // Max 2MB, matches the client-side validation
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 2MB)' }, { status: 400 })
    }

    const supabase = createAdminClient()
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase is not configured on the server' },
        { status: 500 }
      )
    }

    // Build a stable, collision-safe object key inside the bucket.
    const extension = (file.name.split('.').pop() || 'png')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
    const safeSlug = slug.replace(/[^a-z0-9-_]/gi, '').toLowerCase() || 'temp'
    const objectPath = `${safeSlug}/${Date.now()}.${extension || 'png'}`

    const arrayBuffer = await file.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from('ipo-logos')
      .upload(objectPath, bytes, {
        contentType: file.type,
        cacheControl: '31536000',
        upsert: true,
      })

    if (uploadError) {
      console.error('[v0] Supabase Storage upload error:', uploadError)
      const message = uploadError.message || ''
      // Surface a clear message if the bucket isn't created yet so the user
      // knows to run scripts/019_create_logo_storage_bucket.sql.
      if (/bucket.*not.*found/i.test(message) || /not found/i.test(message)) {
        return NextResponse.json(
          {
            error:
              'Storage bucket "ipo-logos" does not exist. Run scripts/019_create_logo_storage_bucket.sql in Supabase and retry.',
          },
          { status: 500 }
        )
      }
      return NextResponse.json(
        { error: `Failed to upload file: ${message || 'unknown error'}` },
        { status: 500 }
      )
    }

    const { data: publicUrlData } = supabase.storage
      .from('ipo-logos')
      .getPublicUrl(objectPath)

    return NextResponse.json({ url: publicUrlData.publicUrl })
  } catch (error) {
    console.error('[v0] Upload route error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: `Failed to upload file: ${message}` }, { status: 500 })
  }
}

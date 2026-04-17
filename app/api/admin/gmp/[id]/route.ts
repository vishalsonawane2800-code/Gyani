import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface RouteParams {
  params: Promise<{ id: string }>
}

// DELETE /api/admin/gmp/[id] - Delete GMP entry
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = createAdminClient()

    const { error } = await supabase
      .from('gmp_history')
      .delete()
      .eq('id', parseInt(id))

    if (error) {
      console.error('Error deleting GMP entry:', error)
      return NextResponse.json({ error: 'Failed to delete GMP entry' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

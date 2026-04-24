import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
);

export const revalidate = 30; // Cache for 30 seconds

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ipoId: string }> }
) {
  try {
    const { ipoId } = await params;

    if (!ipoId) {
      return NextResponse.json(
        { error: 'IPO ID is required' },
        { status: 400 }
      );
    }

    // Fetch latest subscription data from subscription_live table
    const { data: subscriptionData, error } = await supabase
      .from('subscription_live')
      .select('retail, nii, qib, total')
      .eq('ipo_id', ipoId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !subscriptionData) {
      console.error('[v0] Failed to fetch subscription:', error);
      // Return empty object to trigger fallback to static data
      return NextResponse.json(
        { retail: null },
        { status: 200, headers: { 'Cache-Control': 'max-age=30' } }
      );
    }

    return NextResponse.json(
      {
        retail: subscriptionData.retail,
        nii: subscriptionData.nii,
        qib: subscriptionData.qib,
        total: subscriptionData.total,
      },
      { status: 200, headers: { 'Cache-Control': 'max-age=30' } }
    );
  } catch (error) {
    console.error('[v0] API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();

    // Fetch latest subscription data (category-wise breakdown)
    const { data, error } = await supabase
      .from('subscription_live')
      .select('*')
      .eq('ipo_id', id)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching subscription live data:', error);
      return NextResponse.json(
        { error: 'Failed to fetch subscription data', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Subscription live endpoint error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();

    const subscriptionData = await request.json();

    // Validate required fields
    if (!Array.isArray(subscriptionData) || subscriptionData.length === 0) {
      return NextResponse.json(
        { error: 'Invalid subscription data format' },
        { status: 400 }
      );
    }

    // Upsert subscription live data
    const { data, error } = await supabase
      .from('subscription_live')
      .upsert(
        subscriptionData.map((item: any, index: number) => ({
          ipo_id: id,
          category: item.category,
          applied: item.applied,
          times: item.times,
          updated_at: new Date().toISOString(),
          display_order: index,
        })),
        { onConflict: 'ipo_id,category' }
      )
      .select();

    if (error) {
      console.error('Error upserting subscription data:', error);
      return NextResponse.json(
        { error: 'Failed to save subscription data', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      count: data?.length || 0,
      message: `Updated ${data?.length || 0} subscription categories`,
    });
  } catch (error) {
    console.error('Subscription POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

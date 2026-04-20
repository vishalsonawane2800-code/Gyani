import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

// GET returns the latest category-wise subscription data for the Live
// Subscription Tracker. We map the DB columns (`subscription_times`,
// `shares_bid_for`) to the shape the client component expects (`times`,
// `applied`) so neither side has to know about both names.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('subscription_live')
      .select(
        'category, subscription_times, shares_offered, shares_bid_for, total_amount_cr, display_order, updated_at'
      )
      .eq('ipo_id', id)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching subscription live data:', error);
      return NextResponse.json(
        { error: 'Failed to fetch subscription data', details: error.message },
        { status: 500 }
      );
    }

    const rows = (data ?? []).map((row: any) => ({
      category: row.category,
      times: Number(row.subscription_times ?? 0),
      applied: Number(row.shares_bid_for ?? 0),
      shares_offered: Number(row.shares_offered ?? 0),
      total_amount_cr: Number(row.total_amount_cr ?? 0),
      display_order: row.display_order ?? 0,
      updated_at: row.updated_at,
    }));

    return NextResponse.json(rows);
  } catch (error) {
    console.error('Subscription live endpoint error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST accepts an array like `[{ category, times, applied }]` from the admin
// bulk-entry UI and writes to the real column names.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();

    const subscriptionData = await request.json();

    if (!Array.isArray(subscriptionData) || subscriptionData.length === 0) {
      return NextResponse.json(
        { error: 'Invalid subscription data format' },
        { status: 400 }
      );
    }

    const rows = subscriptionData.map((item: any, index: number) => ({
      ipo_id: id,
      category: item.category,
      // Accept either shape from callers (live scraper OR admin bulk entry).
      subscription_times: Number(item.subscription_times ?? item.times ?? 0),
      shares_bid_for: Number(item.shares_bid_for ?? item.applied ?? 0),
      shares_offered: Number(item.shares_offered ?? 0),
      total_amount_cr: Number(item.total_amount_cr ?? 0),
      display_order:
        typeof item.display_order === 'number' ? item.display_order : index,
      updated_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from('subscription_live')
      .upsert(rows, { onConflict: 'ipo_id,category' })
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
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

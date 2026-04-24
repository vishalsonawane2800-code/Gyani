import { getCurrentIPOs } from '@/lib/supabase/queries';

// Cache for 2 minutes since ticker data doesn't need to update faster than that
export const revalidate = 120;

export async function GET() {
  try {
    const ipos = await getCurrentIPOs();

    // Separate current (active) and upcoming IPOs
    const activeStatuses = ['open', 'lastday', 'closed', 'allot', 'listing'];
    const currentIPOs = ipos.filter((ipo) => activeStatuses.includes(ipo.status));
    const upcomingIPOs = ipos.filter((ipo) => ipo.status === 'upcoming');

    // Sort by date/status priority - current first, then upcoming
    currentIPOs.sort((a, b) => {
      const statusPriority: Record<string, number> = {
        'open': 0,
        'lastday': 1,
        'listing': 2,
        'allot': 3,
        'closed': 4,
      };
      return (statusPriority[a.status] || 999) - (statusPriority[b.status] || 999);
    });

    upcomingIPOs.sort((a, b) => new Date(a.openDate).getTime() - new Date(b.openDate).getTime());

    return Response.json({
      currentIPOs,
      upcomingIPOs,
    });
  } catch (error) {
    console.error('[ticker API] Failed to fetch IPOs:', error);
    return Response.json(
      { currentIPOs: [], upcomingIPOs: [] },
      { status: 200 } // Return 200 with empty data so ticker gracefully degrades
    );
  }
}

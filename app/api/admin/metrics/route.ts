import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const [
      { count: pendingCount, error: pendingErr },
      { count: approvedCount, error: approvedErr },
      { count: usersCount, error: usersErr },
      { count: reportsCount, error: reportsErr },
    ] = await Promise.all([
      supabaseAdmin.from('posts').select('*', { count: 'exact', head: true }).eq('moderation_status', 'pending'),
      supabaseAdmin.from('posts').select('*', { count: 'exact', head: true }).eq('moderation_status', 'approved'),
      supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    ]);

    if (pendingErr) console.error('[API /api/admin/metrics pending count error]:', pendingErr.message);
    if (approvedErr) console.error('[API /api/admin/metrics approved count error]:', approvedErr.message);
    if (usersErr) console.error('[API /api/admin/metrics users count error]:', usersErr.message);

    return NextResponse.json({
      metrics: {
        pendingPostsCount: pendingCount ?? 0,
        approvedPostsCount: approvedCount ?? 0,
        totalUsersCount: usersCount ?? 0,
        pendingReportsCount: reportsCount ?? 0,
      },
    });
  } catch (err: any) {
    console.error('[API /api/admin/metrics error]:', err?.message);
    return NextResponse.json(
      {
        metrics: {
          pendingPostsCount: 0,
          approvedPostsCount: 0,
          totalUsersCount: 0,
          pendingReportsCount: 0,
        },
      },
      { status: 500 }
    );
  }
}

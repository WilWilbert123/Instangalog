import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  try {
    // 1. Query reports using supabaseAdmin (bypasses RLS)
    const { data: reports, error } = await (supabaseAdmin.from('reports') as any)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[API /api/admin/reports GET error]:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!reports || reports.length === 0) {
      return NextResponse.json({ reports: [] });
    }

    // 2. Hydrate reporter profile info
    const reporterIds = Array.from(new Set(reports.map((r: any) => r.reporter_id).filter(Boolean)));
    let reporterMap: Record<string, any> = {};

    if (reporterIds.length > 0) {
      const { data: profiles } = await (supabaseAdmin.from('profiles') as any)
        .select('id, username, display_name, avatar_url')
        .in('id', reporterIds);

      if (profiles) {
        profiles.forEach((p: any) => {
          reporterMap[p.id] = p;
        });
      }
    }

    // 3. Hydrate target post info if applicable
    const targetPostIds = Array.from(
      new Set(
        reports
          .filter((r: any) => ['video', 'image', 'music', 'status', 'post'].includes(r.target_type) && r.target_id)
          .map((r: any) => r.target_id)
      )
    );

    let postMap: Record<string, any> = {};
    if (targetPostIds.length > 0) {
      const { data: posts } = await (supabaseAdmin.from('posts') as any)
        .select(`
          *,
          video:videos(*),
          image:images(*),
          music:music(*),
          status:statuses(*)
        `)
        .in('id', targetPostIds);

      if (posts) {
        posts.forEach((p: any) => {
          postMap[p.id] = p;
        });
      }
    }

    const hydratedReports = reports.map((r: any) => ({
      ...r,
      reporter: r.reporter_id ? reporterMap[r.reporter_id] : undefined,
      target_post: r.target_id ? postMap[r.target_id] : undefined,
    }));

    return NextResponse.json({ reports: hydratedReports });
  } catch (err: any) {
    console.error('[API /api/admin/reports error]:', err?.message);
    return NextResponse.json({ error: err?.message || 'Failed to fetch reports' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { reportId, adminId, action } = await request.json();

    if (!reportId || !action) {
      return NextResponse.json({ error: 'Missing reportId or action' }, { status: 400 });
    }

    const { data: report } = await (supabaseAdmin.from('reports') as any)
      .select('*')
      .eq('id', reportId)
      .maybeSingle();

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // If action is delete, remove target content
    if (action === 'delete' && report.target_id) {
      if (['video', 'image', 'music', 'status', 'post'].includes(report.target_type)) {
        await (supabaseAdmin.from('posts') as any).delete().eq('id', report.target_id);
      } else if (report.target_type === 'comment') {
        await (supabaseAdmin.from('comments') as any).delete().eq('id', report.target_id);
      } else if (report.target_type === 'chat') {
        await (supabaseAdmin.from('chat_messages') as any).delete().eq('id', report.target_id);
      }
    }

    // Update report status
    const { error } = await (supabaseAdmin.from('reports') as any)
      .update({
        status: action === 'delete' ? 'resolved' : 'dismissed',
        resolution: action === 'delete' ? 'Content removed by admin' : 'Report dismissed by admin',
        reviewed_by: adminId || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', reportId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to resolve report' }, { status: 500 });
  }
}

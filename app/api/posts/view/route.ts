import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const { postId, userId } = await request.json();
    if (!postId) return NextResponse.json({ error: 'Missing postId' }, { status: 400 });

    // 1. Insert into public.views table
    await (supabaseAdmin.from('views') as any).insert({
      post_id: postId,
      user_id: userId || null,
      created_at: new Date().toISOString(),
    });

    // 2. Fetch current views_count and increment by 1
    const { data: post } = await (supabaseAdmin as any)
      .from('posts')
      .select('views_count')
      .eq('id', postId)
      .maybeSingle();

    const currentCount = post?.views_count || 0;
    await (supabaseAdmin as any)
      .from('posts')
      .update({ views_count: currentCount + 1 })
      .eq('id', postId);

    return NextResponse.json({ success: true, viewsCount: currentCount + 1 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to record view' }, { status: 500 });
  }
}

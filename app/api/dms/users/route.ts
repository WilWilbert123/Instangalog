import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const currentUserId = searchParams.get('currentUserId');
    const query = searchParams.get('q') || '';

    let dbQuery = (supabaseAdmin.from('profiles') as any)
      .select('id, username, display_name, avatar_url, role, status, updated_at')
      .order('updated_at', { ascending: false })
      .limit(30);

    if (currentUserId) {
      dbQuery = dbQuery.neq('id', currentUserId);
    }

    if (query.trim()) {
      dbQuery = dbQuery.or(`display_name.ilike.%${query}%,username.ilike.%${query}%`);
    }

    const { data: users, error } = await dbQuery;

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, users: users || [] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}

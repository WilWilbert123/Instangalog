import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

const SUPER_ADMIN_EMAIL = 'johnwilbertgamis2022@gmail.com';
const SUPER_ADMIN_USERNAME = 'johnwilbert';

// GET /api/admin/users - Fetch all registered user profiles
export async function GET() {
  try {
    const { data: profiles, error } = await (supabaseAdmin.from('profiles') as any)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch stats for each user (posts count, followers count)
    const formatted = await Promise.all(
      (profiles || []).map(async (u: any) => {
        const [{ count: postsCount }, { count: followersCount }] = await Promise.all([
          supabaseAdmin.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', u.id),
          supabaseAdmin.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', u.id),
        ]);

        return {
          id: u.id,
          username: u.username || 'user_' + u.id.slice(0, 6),
          display_name: u.display_name || u.username || 'User',
          avatar_url: u.avatar_url || '',
          bio: u.bio || '',
          role: u.role || 'user',
          status: u.status || 'active',
          created_at: u.created_at,
          posts_count: postsCount || 0,
          followers_count: followersCount || 0,
          following_count: 0,
        };
      })
    );

    return NextResponse.json({ success: true, users: formatted });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to fetch users' }, { status: 500 });
  }
}

// POST /api/admin/users - Update user role or status
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, action, role, status } = body;

    if (!userId || !action) {
      return NextResponse.json({ error: 'Missing userId or action parameter' }, { status: 400 });
    }

    // 1. Check if target user is Super Admin
    const { data: targetProfile, error: fetchErr } = await (supabaseAdmin.from('profiles') as any)
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    if (
      targetProfile &&
      (targetProfile.username?.toLowerCase() === SUPER_ADMIN_USERNAME.toLowerCase() ||
        targetProfile.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase())
    ) {
      return NextResponse.json(
        { error: 'Super Admin account (johnwilbertgamis2022@gmail.com) is immutable and cannot be demoted or restricted.' },
        { status: 403 }
      );
    }

    // 2. Perform requested update
    if (action === 'update_role') {
      if (!['user', 'moderator', 'admin'].includes(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }

      const { data: updated, error: updateErr } = await (supabaseAdmin.from('profiles') as any)
        .update({ role, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single();

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, user: updated });
    } else if (action === 'update_status') {
      if (!['active', 'suspended', 'banned'].includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }

      const { data: updated, error: updateErr } = await (supabaseAdmin.from('profiles') as any)
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single();

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, user: updated });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to update user' }, { status: 500 });
  }
}

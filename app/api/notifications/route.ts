import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
    }

    // Fetch raw notifications for the user
    const { data: rawNotifs, error } = await (supabaseAdmin.from('notifications') as any)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!rawNotifs || rawNotifs.length === 0) {
      return NextResponse.json({ notifications: [], unreadCount: 0 });
    }

    // Hydrate actor profiles
    const actorIds = Array.from(new Set(rawNotifs.map((n: any) => n.actor_id).filter(Boolean)));
    let actorMap: Record<string, any> = {};

    if (actorIds.length > 0) {
      const { data: actorProfiles } = await (supabaseAdmin.from('profiles') as any)
        .select('id, username, display_name, avatar_url')
        .in('id', actorIds);

      if (actorProfiles) {
        actorProfiles.forEach((prof: any) => {
          actorMap[prof.id] = prof;
        });
      }
    }

    const hydrated = rawNotifs.map((n: any) => ({
      ...n,
      actor: n.actor_id ? actorMap[n.actor_id] : undefined,
    }));

    const unreadCount = hydrated.filter((n: any) => !n.is_read).length;

    return NextResponse.json({ notifications: hydrated, unreadCount });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to fetch notifications' }, { status: 500 });
  }
}

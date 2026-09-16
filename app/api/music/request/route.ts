import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const { data: requests, error } = await (supabaseAdmin.from('party_song_requests') as any)
      .select(`
        id,
        user_id,
        song_title,
        status,
        created_at,
        requester:profiles (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, requests: requests || [] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, songTitle } = body;

    if (!userId || !songTitle?.trim()) {
      return NextResponse.json({ success: false, error: 'Missing userId or songTitle' }, { status: 400 });
    }

    const { data: newRequest, error } = await (supabaseAdmin.from('party_song_requests') as any)
      .insert({
        user_id: userId,
        song_title: songTitle.trim(),
        status: 'pending',
      })
      .select(`
        id,
        user_id,
        song_title,
        status,
        created_at,
        requester:profiles (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, request: newRequest });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}

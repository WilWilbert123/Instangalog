import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  try {
    // 1. Fetch from music table
    const { data: musicRows, error: musicErr } = await (supabaseAdmin.from('music') as any)
      .select(`
        id,
        post_id,
        audio_url,
        cover_url,
        title,
        artist,
        album,
        description,
        genre,
        duration,
        play_count,
        post:posts (
          id,
          caption,
          user_id,
          author:profiles (
            id,
            username,
            display_name,
            avatar_url
          )
        )
      `)
      .order('id', { ascending: false })
      .limit(30);

    if (musicErr) {
      console.warn('[Music API] music table error:', musicErr.message);
    }

    const musicList = (musicRows || []).map((m: any) => ({
      id: m.id,
      postId: m.post_id,
      audioUrl: m.audio_url,
      coverUrl: m.cover_url || m.post?.author?.avatar_url || '',
      title: m.title || m.post?.caption || 'Community Audio',
      artist: m.artist || m.post?.author?.display_name || m.post?.author?.username || 'Community Artist',
      album: m.album,
      genre: m.genre || 'Live Audio',
      duration: m.duration || 0,
      playCount: m.play_count || 0,
    }));

    // 2. Fallback: If music table is empty, fetch posts that have audio_url
    if (musicList.length === 0) {
      const { data: audioPosts } = await (supabaseAdmin.from('posts') as any)
        .select(`
          id,
          caption,
          audio_url,
          created_at,
          author:profiles (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .not('audio_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(20);

      (audioPosts || []).forEach((p: any) => {
        if (p.audio_url) {
          musicList.push({
            id: p.id,
            postId: p.id,
            audioUrl: p.audio_url,
            coverUrl: p.author?.avatar_url || '',
            title: p.caption || 'Community Track',
            artist: p.author?.display_name || p.author?.username || 'Community Member',
            album: undefined,
            genre: 'Community Audio',
            duration: 0,
            playCount: 0,
          });
        }
      });
    }

    return NextResponse.json({ success: true, music: musicList });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}

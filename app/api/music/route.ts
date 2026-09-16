import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  try {
    // 1. Fetch from public.music table directly without ambiguous relational joins
    const { data: musicRows, error: musicErr } = await (supabaseAdmin.from('music') as any)
      .select('id, post_id, audio_url, cover_url, title, artist, album, description, genre, duration, play_count')
      .order('id', { ascending: false })
      .limit(50);

    if (musicErr) {
      console.warn('[Music API] music table query note:', musicErr.message);
    }

    const musicList: any[] = [];

    if (musicRows && musicRows.length > 0) {
      musicRows.forEach((m: any) => {
        if (m.audio_url) {
          musicList.push({
            id: m.id,
            postId: m.post_id,
            audioUrl: m.audio_url,
            coverUrl: m.cover_url || '',
            title: m.title || 'Community Track',
            artist: m.artist || 'Community Artist',
            album: m.album,
            genre: m.genre || 'Supabase Music',
            duration: m.duration || 0,
            playCount: m.play_count || 0,
          });
        }
      });
    }

    // 2. Fetch posts containing audio/video media as additional playable tracks
    const { data: postsData, error: postsErr } = await (supabaseAdmin.from('posts') as any)
      .select('id, caption, video_url, audio_url, user_id, created_at')
      .order('created_at', { ascending: false })
      .limit(30);

    if (!postsErr && postsData && postsData.length > 0) {
      const userIds = Array.from(new Set(postsData.map((p: any) => p.user_id).filter(Boolean)));
      let profilesMap: Record<string, any> = {};

      if (userIds.length > 0) {
        const { data: profiles } = await (supabaseAdmin.from('profiles') as any)
          .select('id, username, display_name, avatar_url')
          .in('id', userIds);

        (profiles || []).forEach((prof: any) => {
          profilesMap[prof.id] = prof;
        });
      }

      postsData.forEach((p: any) => {
        const playableUrl = p.audio_url || p.video_url;
        if (playableUrl && !musicList.some((m) => m.audioUrl === playableUrl)) {
          const author = profilesMap[p.user_id] || {};
          musicList.push({
            id: `post-track-${p.id}`,
            postId: p.id,
            audioUrl: playableUrl,
            coverUrl: author.avatar_url || '',
            title: p.caption || 'Community Media Track',
            artist: author.display_name || author.username || 'Instangalog Creator',
            album: undefined,
            genre: 'Community Track',
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

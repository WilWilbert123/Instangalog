import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { parseMediaUrl } from '@/lib/utils/mediaEmbed';

export async function GET() {
  try {
    // 1. Fetch from public.music table directly
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
          const parsed = parseMediaUrl(m.audio_url);
          musicList.push({
            id: m.id,
            postId: m.post_id,
            audioUrl: m.audio_url,
            coverUrl: m.cover_url || parsed.thumbnailUrl || '',
            title: m.title || 'Community Track',
            artist: m.artist || 'Community Artist',
            album: m.album,
            genre: m.genre || (parsed.isEmbeddable ? 'YouTube Audio' : 'Supabase Music'),
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
          const parsed = parseMediaUrl(playableUrl);

          musicList.push({
            id: `post-track-${p.id}`,
            postId: p.id,
            audioUrl: playableUrl,
            coverUrl: author.avatar_url || parsed.thumbnailUrl || '',
            title: p.caption || 'Community Media Track',
            artist: author.display_name || author.username || 'Instangalog Creator',
            album: undefined,
            genre: parsed.isEmbeddable ? 'YouTube Track' : 'Community Track',
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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, artist, audioUrl, coverUrl, genre } = body || {};

    if (!title || !artist || !audioUrl) {
      return NextResponse.json(
        { success: false, error: 'Title, artist, and audio/media URL are required' },
        { status: 400 }
      );
    }

    let formattedUrl = audioUrl.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    const parsed = parseMediaUrl(formattedUrl);
    const finalCover = coverUrl?.trim() || parsed.thumbnailUrl || '';

    // 1. Get a valid user_id from profiles (admin or first available user)
    const { data: firstProfile } = await (supabaseAdmin.from('profiles') as any)
      .select('id')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    const validUserId = firstProfile?.id;

    if (!validUserId) {
      return NextResponse.json(
        { success: false, error: 'No valid user profile found in database to attach track' },
        { status: 400 }
      );
    }

    // 2. Create a hidden studio anchor post in `posts` table so `post_id` non-null constraint is satisfied
    const { data: anchorPost, error: postErr } = await (supabaseAdmin.from('posts') as any)
      .insert([
        {
          user_id: validUserId,
          caption: `[Studio Music] ${title.trim()} - ${artist.trim()}`,
          type: 'music',
          visibility: 'private',
          moderation_status: 'rejected',
        },
      ])
      .select('id')
      .single();

    if (postErr || !anchorPost?.id) {
      console.error('[Music POST API] Anchor post creation error:', postErr);
      return NextResponse.json(
        { success: false, error: postErr?.message || 'Failed to create studio track post anchor' },
        { status: 500 }
      );
    }

    // 3. Insert into public.music with post_id = anchorPost.id
    const insertData: any = {
      post_id: anchorPost.id,
      title: title.trim(),
      artist: artist.trim(),
      audio_url: formattedUrl,
      cover_url: finalCover,
      genre: genre?.trim() || (parsed.isEmbeddable ? 'YouTube Audio' : 'Studio Exclusive'),
    };

    const { data: createdTrack, error: insertErr } = await (supabaseAdmin.from('music') as any)
      .insert([insertData])
      .select()
      .single();

    if (insertErr) {
      console.error('[Music POST API] Music insert error:', insertErr);
      return NextResponse.json({ success: false, error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, music: createdTrack });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}

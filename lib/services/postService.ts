import { Post, PostType } from '@/types/post';
import { MOCK_POSTS } from './mockData';
import { supabase } from '@/lib/supabase/client';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { parseMediaUrl } from '@/lib/utils/mediaEmbed';
import { ensureValidUuid } from '@/lib/utils/uuid';

export async function getApprovedPosts(type?: PostType): Promise<Post[]> {
  try {
    let query = supabase
      .from('posts')
      .select(`
        *,
        author:profiles!posts_user_id_fkey(*),
        video:videos(*),
        image:images(*),
        music:music(*),
        status:statuses(*)
      `)
      .eq('visibility', 'public')
      .eq('moderation_status', 'approved')
      .order('created_at', { ascending: false });

    if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query;

    if (!error && data && data.length > 0) {
      return data as unknown as Post[];
    }
  } catch {
    // Supabase query error
  }

  let fallback = MOCK_POSTS.filter((p) => p.visibility === 'public' && p.moderation_status === 'approved');
  if (type) {
    fallback = fallback.filter((p) => p.type === type);
  }
  return fallback;
}

export async function getFYPVideos(): Promise<Post[]> {
  const posts = await getApprovedPosts('video');
  return posts.filter((p) => p.video);
}

export async function getUserPendingPosts(userId: string): Promise<Post[]> {
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch(`/api/posts/user-pending?userId=${encodeURIComponent(userId)}`);
      const json = await res.json();
      if (json.posts) return json.posts as Post[];
    } catch {
      // Fallthrough
    }
  }

  const validUserId = ensureValidUuid(userId);
  try {
    const { data, error } = await supabaseAdmin
      .from('posts')
      .select(`
        *,
        author:profiles!posts_user_id_fkey(*),
        video:videos(*),
        image:images(*),
        music:music(*),
        status:statuses(*)
      `)
      .eq('user_id', validUserId)
      .eq('moderation_status', 'pending')
      .order('created_at', { ascending: false });

    if (!error && data) {
      return data as unknown as Post[];
    }
  } catch {
    // Fallthrough
  }

  return [];
}

export async function getPostById(id: string): Promise<Post | null> {
  if (!id) return null;

  try {
    let { data, error } = await supabaseAdmin
      .from('posts')
      .select(`
        *,
        author:profiles!posts_user_id_fkey(*),
        video:videos(*),
        image:images(*),
        music:music(*),
        status:statuses(*)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error || !data) {
      const res = await supabase
        .from('posts')
        .select(`
          *,
          author:profiles!posts_user_id_fkey(*),
          video:videos(*),
          image:images(*),
          music:music(*),
          status:statuses(*)
        `)
        .eq('id', id)
        .maybeSingle();
      data = res.data;
      error = res.error;
    }

    if (!error && data) {
      return data as unknown as Post;
    }
  } catch {
    // Supabase query error
  }

  // Fallback to MOCK_POSTS if not found in database
  const mock = MOCK_POSTS.find((p) => p.id === id);
  if (mock) {
    return mock;
  }

  return null;
}

export async function createPost(postData: Partial<Post>): Promise<Post> {
  if (typeof window !== 'undefined') {
    const res = await fetch('/api/posts/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(postData),
    });
    const json = await res.json();
    if (!res.ok || json.error) {
      throw new Error(json.error || 'Failed to create post in Supabase');
    }
    return json.post;
  }

  const rawUserId = postData.user_id || '00000000-0000-0000-0000-000000000001';
  const userId = ensureValidUuid(rawUserId);

  // Process Media URL if applicable
  if (postData.type === 'video' && postData.video) {
    const media = parseMediaUrl(postData.video.video_url);
    if (media.embedUrl) {
      postData.video.video_url = media.embedUrl;
      if (media.thumbnailUrl) {
        postData.video.thumbnail_url = media.thumbnailUrl;
      }
    }
    if (!postData.video.thumbnail_url) {
      postData.video.thumbnail_url = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80';
    }
  }

  try {
    // 1. Ensure author profile exists in profiles table so FK constraint passes
    if (userId) {
      await (supabaseAdmin.from('profiles') as any).upsert(
        {
          id: userId,
          username: postData.author?.username || 'user_' + userId.slice(0, 8),
          display_name: postData.author?.display_name || 'User',
          avatar_url: postData.author?.avatar_url || '',
          role: postData.author?.role || 'user',
          status: 'active',
        },
        { onConflict: 'id', ignoreDuplicates: true }
      );
    }

    const moderationStatus = postData.type === 'video' ? 'pending' : 'approved';

    // 2. Insert into Supabase posts table using supabaseAdmin (bypasses RLS)
    const { data: postRecord, error: postErr } = await (supabaseAdmin.from('posts') as any)
      .insert({
        user_id: userId,
        type: postData.type || 'video',
        caption: postData.caption || '',
        hashtags: postData.hashtags || [],
        visibility: 'public',
        moderation_status: moderationStatus,
      })
      .select()
      .single();

    if (postErr) {
      console.error('[createPost insert error]:', postErr.message);
      throw new Error(`Failed to create post in Supabase: ${postErr.message}`);
    }

    if (postRecord) {
      const createdPostId = (postRecord as any).id;

      // 3. Insert into corresponding sub-table (videos, images, music, statuses)
      if (postData.type === 'video' && postData.video) {
        const { error: vidErr } = await (supabaseAdmin.from('videos') as any).insert({
          post_id: createdPostId,
          video_url: postData.video.video_url,
          thumbnail_url: postData.video.thumbnail_url || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80',
          duration: postData.video.duration || 15,
        });
        if (vidErr) {
          console.error('[createPost video insert error]:', vidErr.message);
          throw new Error(`Failed to create video record in Supabase: ${vidErr.message}`);
        }
      } else if (postData.type === 'image' && postData.image) {
        const { error: imgErr } = await (supabaseAdmin.from('images') as any).insert({
          post_id: createdPostId,
          image_url: postData.image.image_url,
        });
        if (imgErr) console.error('[createPost image insert error]:', imgErr.message);
      } else if (postData.type === 'music' && postData.music) {
        const { error: musErr } = await (supabaseAdmin.from('music') as any).insert({
          post_id: createdPostId,
          audio_url: postData.music.audio_url,
          cover_url: postData.music.cover_url,
          title: postData.music.title,
          artist: postData.music.artist,
          genre: postData.music.genre || 'Pop',
          duration: postData.music.duration || 180,
        });
        if (musErr) console.error('[createPost music insert error]:', musErr.message);
      } else if (postData.type === 'status' && postData.status) {
        const { error: statErr } = await (supabaseAdmin.from('statuses') as any).insert({
          post_id: createdPostId,
          text: postData.status.text,
        });
        if (statErr) console.error('[createPost status insert error]:', statErr.message);
      }

      // 4. Fetch full joined post from Supabase
      const fetched = await getPostById(createdPostId);
      if (fetched) return fetched;
    }
  } catch (e: any) {
    console.error('Error creating post in Supabase:', e);
    throw e;
  }

  throw new Error('Post creation failed.');
}

export async function togglePostLike(postId: string, userId: string, currentlyLiked: boolean): Promise<boolean> {
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/posts/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, userId, currentlyLiked }),
      });
      const json = await res.json();
      return json.isLiked;
    } catch {
      // Fallthrough
    }
  }

  const validUserId = ensureValidUuid(userId);
  try {
    if (currentlyLiked) {
      await (supabaseAdmin as any).from('post_likes').delete().eq('post_id', postId).eq('user_id', validUserId);

      // Decrement likes_count on posts
      const { data: post } = await (supabaseAdmin as any).from('posts').select('likes_count').eq('id', postId).maybeSingle();
      if (post) {
        await (supabaseAdmin as any).from('posts').update({ likes_count: Math.max(0, (post.likes_count || 1) - 1) }).eq('id', postId);
      }
      return false;
    } else {
      await (supabaseAdmin as any).from('post_likes').insert({ post_id: postId, user_id: validUserId });

      // Increment likes_count on posts
      const { data: post } = await (supabaseAdmin as any).from('posts').select('user_id, likes_count').eq('id', postId).maybeSingle();
      if (post) {
        await (supabaseAdmin as any).from('posts').update({ likes_count: (post.likes_count || 0) + 1 }).eq('id', postId);

        // Notify post uploader if liker is not uploader
        if (post.user_id && post.user_id !== validUserId) {
          const { data: actorProf } = await (supabaseAdmin as any).from('profiles').select('display_name, username').eq('id', validUserId).maybeSingle();
          const actorName = actorProf?.display_name || (actorProf?.username ? `@${actorProf.username}` : 'Someone');

          await (supabaseAdmin as any).from('notifications').insert({
            user_id: post.user_id,
            actor_id: validUserId,
            type: 'like',
            post_id: postId,
            message: `${actorName} liked your post!`,
            is_read: false,
          });
        }
      }
      return true;
    }
  } catch (err: any) {
    console.error('[togglePostLike error]:', err?.message);
    return !currentlyLiked;
  }
}

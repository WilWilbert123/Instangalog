import { Post, PostType } from '@/types/post';
import { MOCK_POSTS } from './mockData';
import { supabase } from '@/lib/supabase/client';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { parseMediaUrl } from '@/lib/utils/mediaEmbed';
import { ensureValidUuid } from '@/lib/utils/uuid';
import { getSystemSettings, scanSpamContent } from '@/lib/services/systemSettings';

export const SUPER_ADMIN_EMAIL = 'johnwilbertgamis2022@gmail.com';

export async function getApprovedPosts(
  type?: PostType,
  currentUser?: { id?: string; email?: string } | null
): Promise<Post[]> {
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
      .eq('moderation_status', 'approved')
      .order('created_at', { ascending: false });

    const isSuperAdmin = currentUser?.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

    if (isSuperAdmin) {
      // Super Admin (johnwilbertgamis2022@gmail.com) sees all approved posts (both public and private)
    } else if (currentUser?.id) {
      // Logged-in user sees all public posts PLUS their own private posts
      query = query.or(`visibility.eq.public,and(visibility.eq.private,user_id.eq.${currentUser.id})`);
    } else {
      // General community sees only public posts
      query = query.eq('visibility', 'public');
    }

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

  let fallback = MOCK_POSTS.filter((p) => {
    if (p.moderation_status !== 'approved') return false;
    const isSuperAdmin = currentUser?.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
    if (isSuperAdmin) return true;
    if (currentUser?.id && p.visibility === 'private') {
      return p.user_id === currentUser.id;
    }
    return p.visibility === 'public';
  });

  if (type) {
    fallback = fallback.filter((p) => p.type === type);
  }
  return fallback;
}

export async function getFYPVideos(currentUser?: { id?: string; email?: string } | null): Promise<Post[]> {
  const posts = await getApprovedPosts('video', currentUser);
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
    if (media.thumbnailUrl && !postData.video.thumbnail_url) {
      postData.video.thumbnail_url = media.thumbnailUrl;
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

    const settings = await getSystemSettings();

    // 1. Anti-Spam Safety Scanning
    if (settings.enableSpamFilter && scanSpamContent(postData.caption || '')) {
      throw new Error('Post caption blocked by Anti-Spam Safety Filter (malicious link or domain detected).');
    }

    // 2. Moderation Pre-Approval Rule Check
    let moderationStatus: 'pending' | 'approved' = 'approved';
    if (postData.type === 'video') {
      moderationStatus = settings.requireVideoApproval ? 'pending' : 'approved';
    } else {
      moderationStatus = settings.autoApproveImageStatus ? 'approved' : 'pending';
    }

    // 3. Insert into Supabase posts table using supabaseAdmin (bypasses RLS)
    const { data: postRecord, error: postErr } = await (supabaseAdmin.from('posts') as any)
      .insert({
        user_id: userId,
        type: postData.type || 'video',
        caption: postData.caption || '',
        hashtags: postData.hashtags || [],
        visibility: postData.visibility || 'public',
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
    const res = await fetch('/api/posts/like', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId, userId, currentlyLiked }),
    });
    const json = await res.json();
    if (!res.ok || json.error) {
      throw new Error(json.error || 'Failed to toggle like');
    }
    return json.isLiked;
  }

  const validUserId = ensureValidUuid(userId);
  try {
    // Check account status
    const { data: userProf } = await (supabaseAdmin as any)
      .from('profiles')
      .select('status')
      .eq('id', validUserId)
      .maybeSingle();

    if (userProf && (userProf.status === 'suspended' || userProf.status === 'banned')) {
      throw new Error(`Your account is ${userProf.status}. You cannot like posts.`);
    }

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
    throw err;
  }
}

export interface UpdatePostPayload {
  caption?: string;
  hashtags?: string[];
  visibility?: 'public' | 'followers' | 'private';
}

export async function updatePost(
  postId: string,
  updates: UpdatePostPayload,
  requestingUserId: string,
  requestingUserEmail?: string
): Promise<Post> {
  if (typeof window !== 'undefined') {
    const res = await fetch('/api/posts/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        postId,
        updates,
        userId: requestingUserId,
        userEmail: requestingUserEmail,
      }),
    });
    const json = await res.json();
    if (!res.ok || json.error) {
      throw new Error(json.error || 'Failed to update post');
    }
    return json.post as Post;
  }

  const validUserId = ensureValidUuid(requestingUserId);
  const isSuperAdmin = requestingUserEmail?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

  // 1. Fetch existing post
  const { data: existing, error: fetchErr } = await (supabaseAdmin.from('posts') as any)
    .select('id, user_id, type')
    .eq('id', postId)
    .maybeSingle();

  if (fetchErr || !existing) {
    throw new Error('Post not found.');
  }

  // 2. Ownership verification: must be author or superadmin
  if (existing.user_id !== validUserId && !isSuperAdmin) {
    throw new Error('You do not have permission to edit this post.');
  }

  // 3. Anti-Spam check if caption changed
  if (updates.caption) {
    const settings = await getSystemSettings();
    if (settings.enableSpamFilter && scanSpamContent(updates.caption)) {
      throw new Error('Post caption blocked by Anti-Spam Safety Filter.');
    }
  }

  const updateFields: any = {
    updated_at: new Date().toISOString(),
  };

  if (updates.caption !== undefined) updateFields.caption = updates.caption;
  if (updates.hashtags !== undefined) updateFields.hashtags = updates.hashtags;
  if (updates.visibility !== undefined) updateFields.visibility = updates.visibility;

  const { error: updateErr } = await (supabaseAdmin.from('posts') as any)
    .update(updateFields)
    .eq('id', postId);

  if (updateErr) {
    console.error('[updatePost error]:', updateErr.message);
    throw new Error(`Failed to update post: ${updateErr.message}`);
  }

  const updated = await getPostById(postId);
  if (!updated) {
    throw new Error('Failed to retrieve updated post.');
  }
  return updated;
}

export async function deletePost(
  postId: string,
  requestingUserId: string,
  requestingUserEmail?: string
): Promise<{ success: boolean; postId: string }> {
  if (typeof window !== 'undefined') {
    const res = await fetch('/api/posts/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        postId,
        userId: requestingUserId,
        userEmail: requestingUserEmail,
      }),
    });
    const json = await res.json();
    if (!res.ok || json.error) {
      throw new Error(json.error || 'Failed to delete post');
    }
    return { success: true, postId };
  }

  const validUserId = ensureValidUuid(requestingUserId);
  const isSuperAdmin = requestingUserEmail?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

  // 1. Fetch existing post to verify ownership
  const { data: existing, error: fetchErr } = await (supabaseAdmin.from('posts') as any)
    .select('id, user_id')
    .eq('id', postId)
    .maybeSingle();

  if (fetchErr || !existing) {
    throw new Error('Post not found.');
  }

  if (existing.user_id !== validUserId && !isSuperAdmin) {
    throw new Error('You do not have permission to delete this post.');
  }

  // 2. Delete post (CASCADE automatically deletes from videos, images, music, statuses, likes, comments)
  const { error: delErr } = await (supabaseAdmin.from('posts') as any)
    .delete()
    .eq('id', postId);

  if (delErr) {
    console.error('[deletePost error]:', delErr.message);
    throw new Error(`Failed to delete post: ${delErr.message}`);
  }

  // 3. Decrement author profile posts_count
  try {
    const { data: prof } = await (supabaseAdmin.from('profiles') as any)
      .select('posts_count')
      .eq('id', existing.user_id)
      .maybeSingle();

    if (prof && typeof prof.posts_count === 'number') {
      await (supabaseAdmin.from('profiles') as any)
        .update({ posts_count: Math.max(0, prof.posts_count - 1) })
        .eq('id', existing.user_id);
    }
  } catch {
    // Non-fatal
  }

  return { success: true, postId };
}



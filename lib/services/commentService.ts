import { Comment } from '@/types/comment';
import { MOCK_COMMENTS, MOCK_PROFILES } from './mockData';
import { supabase } from '@/lib/supabase/client';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { ensureValidUuid } from '@/lib/utils/uuid';

export async function getCommentsForPost(postId: string): Promise<Comment[]> {
  try {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        author:profiles(*)
      `)
      .eq('post_id', postId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (!error && data) {
      return data as unknown as Comment[];
    }
  } catch {
    // Fallback
  }

  return [];
}

export async function addComment(postId: string, userId: string, content: string, parentId?: string): Promise<Comment> {
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/comments/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, userId, content, parentId }),
      });
      const json = await res.json();
      if (res.ok && json.comment) {
        return json.comment as Comment;
      }
    } catch {
      // Fallthrough
    }
  }

  const validUserId = ensureValidUuid(userId);
  try {
    const { data, error } = await (supabaseAdmin as any)
      .from('comments')
      .insert({
        post_id: postId,
        user_id: validUserId,
        parent_id: parentId || null,
        content,
      })
      .select(`
        *,
        author:profiles(*)
      `)
      .single();

    if (!error && data) {
      const commentRecord = data as unknown as Comment;

      // 1. Increment comments_count on posts
      const { data: post } = await (supabaseAdmin as any).from('posts').select('user_id, comments_count').eq('id', postId).maybeSingle();
      if (post) {
        await (supabaseAdmin as any).from('posts').update({ comments_count: (post.comments_count || 0) + 1 }).eq('id', postId);

        // 2. Notify post uploader if commenter is not uploader
        if (post.user_id && post.user_id !== validUserId) {
          const { data: actorProf } = await (supabaseAdmin as any).from('profiles').select('display_name, username').eq('id', validUserId).maybeSingle();
          const actorName = actorProf?.display_name || (actorProf?.username ? `@${actorProf.username}` : 'Someone');

          await (supabaseAdmin as any).from('notifications').insert({
            user_id: post.user_id,
            actor_id: validUserId,
            type: 'comment',
            post_id: postId,
            comment_id: commentRecord.id,
            message: `${actorName} commented: "${content.length > 30 ? content.slice(0, 30) + '...' : content}"`,
            is_read: false,
          });
        }
      }

      return commentRecord;
    }
  } catch (err) {
    console.error('Error adding comment to Supabase:', err);
  }

  const newComment: Comment = {
    id: `c-${Date.now()}`,
    post_id: postId,
    user_id: validUserId,
    parent_id: parentId || null,
    content,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    author: MOCK_PROFILES.find((p) => p.id === validUserId) || MOCK_PROFILES[0],
    likes_count: 0,
  };

  MOCK_COMMENTS.push(newComment);
  return newComment;
}

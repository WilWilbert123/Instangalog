import { supabase } from '@/lib/supabase/client';
import { supabaseAdmin } from '@/lib/supabase/admin';

const viewedPostsInSession = new Set<string>();

export async function recordPostView(postId: string, userId?: string): Promise<boolean> {
  if (!postId || viewedPostsInSession.has(postId)) {
    return false;
  }

  viewedPostsInSession.add(postId);

  if (typeof window !== 'undefined') {
    try {
      fetch('/api/posts/view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, userId }),
      }).catch(() => {});
      return true;
    } catch {
      // Fallthrough
    }
  }

  try {
    const viewRecord = {
      post_id: postId,
      user_id: userId || null,
      created_at: new Date().toISOString(),
    };

    const { error } = await (supabase.from('views') as any).insert(viewRecord);
    if (error) {
      await (supabaseAdmin.from('views') as any).insert(viewRecord);
    }

    const { data: post } = await (supabaseAdmin as any)
      .from('posts')
      .select('views_count')
      .eq('id', postId)
      .maybeSingle();

    const currentCount = post?.views_count || 0;
    await (supabaseAdmin as any)
      .from('posts')
      .update({ views_count: currentCount + 1 })
      .eq('id', postId);

    return true;
  } catch (err) {
    return false;
  }
}

import { supabase } from '@/lib/supabase/client';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { Profile } from '@/types/user';
import { ensureValidUuid } from '@/lib/utils/uuid';

export interface NotificationItem {
  id: string;
  user_id: string;
  actor_id?: string;
  type: string;
  post_id?: string;
  comment_id?: string;
  message: string;
  is_read: boolean;
  created_at: string;
  actor?: Profile;
}

export async function checkIsFollowing(rawFollowerId: string, rawFollowingId: string): Promise<boolean> {
  if (!rawFollowerId || !rawFollowingId || rawFollowerId === rawFollowingId) return false;

  if (typeof window !== 'undefined') {
    try {
      const res = await fetch(`/api/follows/check?followerId=${encodeURIComponent(rawFollowerId)}&followingId=${encodeURIComponent(rawFollowingId)}`);
      const json = await res.json();
      return Boolean(json.isFollowing);
    } catch {
      // Fallthrough
    }
  }

  const followerId = ensureValidUuid(rawFollowerId);
  const followingId = ensureValidUuid(rawFollowingId);

  try {
    let { data, error } = await supabaseAdmin
      .from('follows')
      .select('id')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .maybeSingle();

    if (error || !data) {
      const res = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', followerId)
        .eq('following_id', followingId)
        .maybeSingle();
      data = res.data;
    }

    return Boolean(data);
  } catch (err: any) {
    console.warn('[checkIsFollowing error]:', err?.message);
    return false;
  }
}

export async function toggleFollow(
  rawFollowerId: string,
  rawFollowingId: string,
  followerProfile: Partial<Profile>
): Promise<{ isFollowing: boolean; newFollowersCount?: number }> {
  if (!rawFollowerId || !rawFollowingId || rawFollowerId === rawFollowingId) {
    return { isFollowing: false };
  }

  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/follows/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          followerId: rawFollowerId,
          followingId: rawFollowingId,
          followerProfile,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        return { isFollowing: json.isFollowing, newFollowersCount: json.newFollowersCount };
      }
    } catch (err: any) {
      console.error('[toggleFollow client fetch error]:', err?.message);
    }
  }

  const followerId = ensureValidUuid(rawFollowerId);
  const followingId = ensureValidUuid(rawFollowingId);

  try {
    const isCurrentlyFollowing = await checkIsFollowing(followerId, followingId);

    if (isCurrentlyFollowing) {
      // 1. UNFOLLOW: Delete follow record
      await (supabaseAdmin.from('follows') as any)
        .delete()
        .eq('follower_id', followerId)
        .eq('following_id', followingId);

      // Decrement recipient followers_count
      const { data: targetProf } = await (supabaseAdmin.from('profiles') as any)
        .select('followers_count')
        .eq('id', followingId)
        .single();

      const newFollowersCount = Math.max(0, ((targetProf as any)?.followers_count || 1) - 1);

      await (supabaseAdmin.from('profiles') as any)
        .update({ followers_count: newFollowersCount })
        .eq('id', followingId);

      // Decrement follower following_count
      const { data: followerProf } = await (supabaseAdmin.from('profiles') as any)
        .select('following_count')
        .eq('id', followerId)
        .single();

      const newFollowingCount = Math.max(0, ((followerProf as any)?.following_count || 1) - 1);

      await (supabaseAdmin.from('profiles') as any)
        .update({ following_count: newFollowingCount })
        .eq('id', followerId);

      return { isFollowing: false, newFollowersCount };
    } else {
      // 2. FOLLOW: Insert follow record
      const { error: followErr } = await (supabaseAdmin.from('follows') as any)
        .insert({
          follower_id: followerId,
          following_id: followingId,
        });

      if (followErr) {
        console.error('[toggleFollow insert error]:', followErr.message);
      }

      // Increment recipient followers_count
      const { data: targetProf } = await (supabaseAdmin.from('profiles') as any)
        .select('followers_count')
        .eq('id', followingId)
        .single();

      const newFollowersCount = ((targetProf as any)?.followers_count || 0) + 1;

      await (supabaseAdmin.from('profiles') as any)
        .update({ followers_count: newFollowersCount })
        .eq('id', followingId);

      // Increment follower following_count
      const { data: followerProf } = await (supabaseAdmin.from('profiles') as any)
        .select('following_count')
        .eq('id', followerId)
        .single();

      const newFollowingCount = ((followerProf as any)?.following_count || 0) + 1;

      await (supabaseAdmin.from('profiles') as any)
        .update({ following_count: newFollowingCount })
        .eq('id', followerId);

      // Create realtime Notification in Supabase notifications table
      const actorName = followerProfile.display_name || `@${followerProfile.username || 'user'}`;
      await (supabaseAdmin.from('notifications') as any).insert({
        user_id: followingId,
        actor_id: followerId,
        type: 'follow',
        message: `${actorName} started following you!`,
        is_read: false,
      });

      return { isFollowing: true, newFollowersCount };
    }
  } catch (err: any) {
    console.error('[toggleFollow Supabase error]:', err?.message);
    return { isFollowing: false };
  }
}

export async function getUserNotifications(rawUserId: string): Promise<NotificationItem[]> {
  const userId = ensureValidUuid(rawUserId);
  try {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select(`
        *,
        actor:profiles!notifications_actor_id_fkey(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      return data as unknown as NotificationItem[];
    }
  } catch (err: any) {
    console.warn('[getUserNotifications error]:', err?.message);
  }

  return [];
}

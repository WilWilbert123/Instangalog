import { supabase } from '@/lib/supabase/client';
import { supabaseAdmin } from '@/lib/supabase/admin';

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
  actor?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
}

export async function getUserNotifications(userId: string): Promise<NotificationItem[]> {
  try {
    // 1. Fetch raw notifications for the user
    const { data: rawNotifs, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error || !rawNotifs || rawNotifs.length === 0) {
      return [];
    }

    // 2. Hydrate actor profile details safely
    const actorIds = Array.from(
      new Set(rawNotifs.map((n: any) => n.actor_id).filter(Boolean))
    );

    let actorMap: Record<string, any> = {};
    if (actorIds.length > 0) {
      const { data: actorProfiles } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', actorIds);

      if (actorProfiles) {
        actorProfiles.forEach((prof: any) => {
          actorMap[prof.id] = prof;
        });
      }
    }

    return rawNotifs.map((n: any) => ({
      ...n,
      actor: n.actor_id ? actorMap[n.actor_id] : undefined,
    })) as NotificationItem[];
  } catch (err) {
    return [];
  }
}

export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  try {
    const { error } = await (supabase.from('notifications') as any)
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) {
      await (supabaseAdmin.from('notifications') as any)
        .update({ is_read: true })
        .eq('id', notificationId);
    }
    return true;
  } catch (err) {
    return false;
  }
}

export async function markAllNotificationsAsRead(userId: string): Promise<boolean> {
  try {
    const { error } = await (supabase.from('notifications') as any)
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      await (supabaseAdmin.from('notifications') as any)
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);
    }
    return true;
  } catch (err) {
    return false;
  }
}

export async function deleteNotification(notificationId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) {
      await (supabaseAdmin.from('notifications') as any)
        .delete()
        .eq('id', notificationId);
    }
    return true;
  } catch (err) {
    return false;
  }
}

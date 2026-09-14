'use client';

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase/client';
import { getAvatarUrl, getCartoonAvatar } from '@/lib/utils/avatar';
import { UserPlus, X, ExternalLink, Sparkles, Bell } from 'lucide-react';
import Link from 'next/link';

interface ActiveNotification {
  id: string;
  message: string;
  actor_id?: string;
  actor_name?: string;
  actor_username?: string;
  actor_avatar?: string;
}

export function RealtimeNotificationToast() {
  const { user } = useAuthStore();
  const [notification, setNotification] = useState<ActiveNotification | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    if (!user) return;

    // 1. Fetch initial unread count
    const fetchUnread = async () => {
      try {
        const { count } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_read', false);
        setUnreadCount(count || 0);
      } catch {
        // Ignore
      }
    };

    fetchUnread();

    // 2. Subscribe to Supabase Realtime insert on notifications table
    const channel = supabase
      .channel(`realtime:notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          const newNotif = payload.new;
          setUnreadCount((prev) => prev + 1);

          // Fetch actor profile details if actor_id is present
          let actorName = 'Someone';
          let actorUsername = 'user';
          let actorAvatar = '';

          if (newNotif.actor_id) {
            const { data: actorProf } = await supabase
              .from('profiles')
              .select('display_name, username, avatar_url')
              .eq('id', newNotif.actor_id)
              .maybeSingle();

            if (actorProf) {
              const prof = actorProf as any;
              actorName = prof.display_name || actorName;
              actorUsername = prof.username || actorUsername;
              actorAvatar = prof.avatar_url || '';
            }
          }

          setNotification({
            id: newNotif.id || `notif-${Date.now()}`,
            message: newNotif.message || `${actorName} started following you!`,
            actor_id: newNotif.actor_id,
            actor_name: actorName,
            actor_username: actorUsername,
            actor_avatar: actorAvatar,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (!notification) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm p-6 rounded-3xl glass-card border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-2xl space-y-4 text-center transform animate-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          onClick={() => setNotification(null)}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-400 hover:text-black dark:hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Animated Icon Badge */}
        <div className="relative w-16 h-16 mx-auto">
          <div className="w-16 h-16 rounded-full border-2 border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 overflow-hidden shadow-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getAvatarUrl(notification.actor_avatar || '', notification.actor_username || 'user')}
              alt={notification.actor_name || 'User'}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = getCartoonAvatar(notification.actor_username || 'user');
              }}
            />
          </div>
          <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-emerald-500 text-white shadow-lg ring-2 ring-white dark:ring-slate-950">
            <UserPlus className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Text Details */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-[10px] font-bold uppercase tracking-wider">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>New Follower Alert</span>
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {notification.actor_name}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            @{notification.actor_username}
          </p>
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 pt-1 leading-relaxed">
            {notification.message}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={() => setNotification(null)}
            className="flex-1 py-2.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            Dismiss
          </button>
          {notification.actor_username && (
            <Link
              href={`/profile/${notification.actor_username}`}
              onClick={() => setNotification(null)}
              className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-black text-white dark:bg-white dark:text-black hover:opacity-90 transition-all shadow-md flex items-center justify-center gap-1.5"
            >
              <span>View Profile</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

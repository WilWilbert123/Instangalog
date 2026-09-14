'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase/client';
import { getAvatarUrl, getCartoonAvatar } from '@/lib/utils/avatar';
import {
  NotificationItem,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from '@/lib/services/notificationService';
import {
  Bell,
  CheckCheck,
  UserPlus,
  MessageCircle,
  Sparkles,
  ShieldCheck,
  Clock,
  Inbox,
  Trash2,
  Filter,
  ArrowLeft,
} from 'lucide-react';

export default function NotificationsPage() {
  const router = useRouter();
  const { user, openAuthModal } = useAuthStore();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'follow' | 'activity'>('all');

  useEffect(() => {
    if (!user) return;

    const loadNotifications = async () => {
      setLoading(true);
      const items = await getUserNotifications(user.id);
      setNotifications(items);
      setLoading(false);
    };

    loadNotifications();

    // Supabase Realtime subscription for live notification stream
    const channel = supabase
      .channel(`page-notifs-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          const newNotif = payload.new as NotificationItem;

          if (newNotif.actor_id) {
            const { data: actor } = await supabase
              .from('profiles')
              .select('id, username, display_name, avatar_url')
              .eq('id', newNotif.actor_id)
              .maybeSingle();

            if (actor) {
              newNotif.actor = actor as any;
            }
          }

          setNotifications((prev) => [newNotif, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center mx-auto text-slate-400">
          <Bell className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Sign In to View Notifications</h1>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Stay updated when users follow you, comment on your posts, or interact with your content.
        </p>
        <button
          onClick={() => openAuthModal('Sign in to view notifications')}
          className="px-6 py-2.5 text-xs font-bold rounded-xl bg-black text-white dark:bg-white dark:text-black hover:opacity-90 transition-all shadow-md"
        >
          Sign In Now
        </button>
      </div>
    );
  }

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    await markNotificationAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  const handleMarkAllAsRead = async () => {
    await markAllNotificationsAsRead(user.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteNotification(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.is_read) {
      await handleMarkAsRead(notif.id);
    }

    if (notif.actor?.username) {
      router.push(`/profile/${notif.actor.username}`);
    } else if (notif.type === 'follow' && notif.actor_id) {
      router.push(`/profile/${notif.actor_id}`);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.is_read;
    if (filter === 'follow') return n.type === 'follow';
    if (filter === 'activity') return n.type !== 'follow';
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'follow':
        return <UserPlus className="w-4 h-4 text-emerald-500" />;
      case 'comment':
        return <MessageCircle className="w-4 h-4 text-blue-500" />;
      case 'approval':
      case 'system':
        return <ShieldCheck className="w-4 h-4 text-purple-500" />;
      default:
        return <Sparkles className="w-4 h-4 text-amber-500" />;
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return `${Math.floor(diff / 86400)} days ago`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header Bar */}
      <div className="p-6 rounded-3xl glass-card border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 text-slate-900 dark:text-white shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-500 hover:text-black dark:hover:text-white transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <span>Notifications</span>
                {unreadCount > 0 && (
                  <span className="px-2.5 py-0.5 text-xs font-black rounded-full bg-red-500 text-white shadow-sm">
                    {unreadCount}
                  </span>
                )}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Real-time activity and community interactions
              </p>
            </div>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all active:scale-95 shadow-sm"
            >
              <CheckCheck className="w-4 h-4 text-emerald-500" />
              <span>Mark All as Read</span>
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-1" />

          <button
            onClick={() => setFilter('all')}
            className={`px-3.5 py-1.5 font-bold rounded-xl transition-all shrink-0 ${
              filter === 'all'
                ? 'bg-black text-white dark:bg-white dark:text-black shadow-md'
                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900'
            }`}
          >
            All ({notifications.length})
          </button>

          <button
            onClick={() => setFilter('unread')}
            className={`px-3.5 py-1.5 font-bold rounded-xl transition-all shrink-0 ${
              filter === 'unread'
                ? 'bg-black text-white dark:bg-white dark:text-black shadow-md'
                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900'
            }`}
          >
            Unread ({unreadCount})
          </button>

          <button
            onClick={() => setFilter('follow')}
            className={`px-3.5 py-1.5 font-bold rounded-xl transition-all shrink-0 ${
              filter === 'follow'
                ? 'bg-black text-white dark:bg-white dark:text-black shadow-md'
                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900'
            }`}
          >
            Follows ({notifications.filter((n) => n.type === 'follow').length})
          </button>

          <button
            onClick={() => setFilter('activity')}
            className={`px-3.5 py-1.5 font-bold rounded-xl transition-all shrink-0 ${
              filter === 'activity'
                ? 'bg-black text-white dark:bg-white dark:text-black shadow-md'
                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900'
            }`}
          >
            Activity ({notifications.filter((n) => n.type !== 'follow').length})
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-400 glass-card rounded-3xl animate-pulse">
            Loading your notifications...
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-12 text-center glass-card rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 space-y-3">
            <Inbox className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              No notifications found
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {filter === 'unread'
                ? "You're all caught up! No unread notifications."
                : 'Notifications regarding your content and community interactions will show up here.'}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleNotificationClick(notif)}
              className={`p-4 rounded-2xl glass-card border transition-all cursor-pointer flex items-center justify-between gap-4 group hover:shadow-lg ${
                !notif.is_read
                  ? 'border-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-950/20'
                  : 'border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80'
              }`}
            >
              <div className="flex items-center gap-4 min-w-0">
                {/* Actor Avatar */}
                <div className="relative shrink-0 w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden border-2 border-slate-200 dark:border-slate-700 shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getAvatarUrl(
                      notif.actor?.avatar_url || '',
                      notif.actor?.username || 'user'
                    )}
                    alt={notif.actor?.display_name || 'User'}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = getCartoonAvatar(
                        notif.actor?.username || 'user'
                      );
                    }}
                  />
                  <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    {getNotificationIcon(notif.type)}
                  </div>
                </div>

                <div className="space-y-1 min-w-0">
                  <p className="text-sm text-slate-800 dark:text-slate-200 leading-snug">
                    {notif.actor?.display_name && (
                      <span className="font-bold text-slate-900 dark:text-white mr-1.5">
                        {notif.actor.display_name}
                      </span>
                    )}
                    <span>{notif.message}</span>
                  </p>

                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {formatTimeAgo(notif.created_at)}
                    </span>

                    {!notif.is_read && (
                      <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-indigo-600 text-white">
                        New
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {!notif.is_read && (
                  <button
                    onClick={(e) => handleMarkAsRead(notif.id, e)}
                    className="p-2 rounded-xl text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                    title="Mark as read"
                  >
                    <CheckCheck className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={(e) => handleDelete(notif.id, e)}
                  className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  title="Delete notification"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

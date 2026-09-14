'use client';

import React, { useState, useEffect, useRef } from 'react';
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
} from '@/lib/services/notificationService';
import {
  Bell,
  CheckCheck,
  UserPlus,
  MessageCircle,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Clock,
  Inbox,
  Trash2,
} from 'lucide-react';

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onUnreadCountChange?: (count: number) => void;
}

export function NotificationDropdown({
  isOpen,
  onClose,
  onUnreadCountChange,
}: NotificationDropdownProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Load notifications & set up realtime listener
  useEffect(() => {
    if (!user) return;

    const fetchNotifs = async () => {
      setLoading(true);
      const items = await getUserNotifications(user.id);
      setNotifications(items);
      setLoading(false);

      const unread = items.filter((n) => !n.is_read).length;
      if (onUnreadCountChange) onUnreadCountChange(unread);
    };

    fetchNotifs();

    // Supabase Realtime subscription for incoming notifications
    const channel = supabase
      .channel(`dropdown-notifs-${user.id}`)
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

          // Fetch actor info if available
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
          if (onUnreadCountChange) {
            setNotifications((updated) => {
              const unread = updated.filter((n) => !n.is_read).length;
              onUnreadCountChange(unread);
              return updated;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, onUnreadCountChange]);

  if (!isOpen) return null;

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    await markNotificationAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    const unread = notifications.filter((n) => n.id !== id && !n.is_read).length;
    if (onUnreadCountChange) onUnreadCountChange(unread);
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;
    await markAllNotificationsAsRead(user.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    if (onUnreadCountChange) onUnreadCountChange(0);
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.is_read) {
      await handleMarkAsRead(notif.id);
    }
    onClose();

    if (notif.actor?.username) {
      router.push(`/profile/${notif.actor.username}`);
    } else if (notif.type === 'follow' && notif.actor_id) {
      router.push(`/profile/${notif.actor_id}`);
    } else {
      router.push('/notifications');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'follow':
        return <UserPlus className="w-3.5 h-3.5 text-emerald-500" />;
      case 'comment':
        return <MessageCircle className="w-3.5 h-3.5 text-blue-500" />;
      case 'approval':
      case 'system':
        return <ShieldCheck className="w-3.5 h-3.5 text-purple-500" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-amber-500" />;
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl glass-card border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 text-slate-900 dark:text-white shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Header */}
      <div className="p-3.5 px-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-indigo-500" />
          <h3 className="font-bold text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-red-500 text-white shadow-sm">
              {unreadCount} new
            </span>
          )}
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-black dark:hover:text-white transition-colors"
            title="Mark all notifications as read"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      {/* Notification Items List */}
      <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-900">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400 animate-pulse">
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <Inbox className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              No notifications yet
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-600">
              When people interact with you, updates will appear here.
            </p>
          </div>
        ) : (
          notifications.slice(0, 10).map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleNotificationClick(notif)}
              className={`p-3.5 flex items-start gap-3 hover:bg-slate-100/60 dark:hover:bg-slate-900/60 cursor-pointer transition-colors ${
                !notif.is_read ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''
              }`}
            >
              {/* Actor Avatar */}
              <div className="relative shrink-0 w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700">
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
                <div className="absolute -bottom-0.5 -right-0.5 p-0.5 rounded-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  {getNotificationIcon(notif.type)}
                </div>
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0 space-y-0.5">
                <p className="text-xs text-slate-800 dark:text-slate-200 leading-snug break-words">
                  {notif.actor?.display_name && (
                    <span className="font-bold text-slate-900 dark:text-white mr-1">
                      {notif.actor.display_name}
                    </span>
                  )}
                  <span>{notif.message}</span>
                </p>

                <div className="flex items-center justify-between pt-0.5 text-[10px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTimeAgo(notif.created_at)}
                  </span>

                  {!notif.is_read && (
                    <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Link to /notifications */}
      <div className="p-2.5 border-t border-slate-200 dark:border-slate-800 text-center bg-slate-50/50 dark:bg-slate-900/50">
        <Link
          href="/notifications"
          onClick={onClose}
          className="inline-flex items-center justify-center gap-1.5 w-full py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white transition-colors"
        >
          <span>View All Notifications</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

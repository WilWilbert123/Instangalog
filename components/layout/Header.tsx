'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { Search, Bell, Sparkles, LogIn } from 'lucide-react';
import { InstallAppButton } from '@/components/pwa/InstallAppButton';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';

import { supabase } from '@/lib/supabase/client';

export function Header() {
  const router = useRouter();
  const { user, openAuthModal } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isNotifDropdownOpen, setIsNotifDropdownOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchUnread = async () => {
      try {
        const { count } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_read', false);
        setUnreadCount(count || 0);
      } catch {
        // Fallthrough
      }
    };

    fetchUnread();

    const channel = supabase
      .channel(`header-notifs-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/following?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full h-16 glass-header border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 text-slate-900 dark:text-white px-4 flex items-center justify-between gap-4 transition-colors duration-200">
      {/* Mobile Brand Logo */}
      <Link href="/" className="md:hidden flex items-center gap-2">
        <div className="w-11 h-11 rounded-xl overflow-hidden bg-gradient-to-br from-orange-500/10 to-amber-500/10 border border-slate-200 dark:border-slate-800 flex items-center justify-center p-0.5 shadow-sm shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/pagpag.png" alt="Pagpag Logo" className="w-full h-full object-contain scale-125" />
        </div>
        <span className="font-bold text-lg text-slate-900 dark:text-white">
          Instangalog
        </span>
      </Link>

      {/* Global Search Bar */}
      <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search videos, music, users, hashtags..."
          className="w-full pl-10 pr-4 py-2 text-xs md:text-sm rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-black dark:focus:border-white transition-colors"
        />
      </form>

      {/* Right Header Actions */}
      <div className="flex items-center gap-2.5">
        <InstallAppButton variant="icon" />

        {user ? (
          <div className="relative">
            <button
              onClick={() => setIsNotifDropdownOpen((prev) => !prev)}
              className="relative p-2 text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-red-500 text-white shadow-sm ring-2 ring-white dark:ring-slate-950 flex items-center justify-center min-w-[18px]">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            <NotificationDropdown
              isOpen={isNotifDropdownOpen}
              onClose={() => setIsNotifDropdownOpen(false)}
              onUnreadCountChange={setUnreadCount}
            />
          </div>
        ) : (
          <button
            onClick={() => openAuthModal('Sign in to interact, post media, and chat')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-black text-white dark:bg-white dark:text-black hover:opacity-90 transition-all shadow-md"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
}

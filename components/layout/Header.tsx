'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { Search, Bell, Sparkles, LogIn, Sun, Moon, ArrowLeft, LogOut } from 'lucide-react';
import { InstallAppButton } from '@/components/pwa/InstallAppButton';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';
import { useThemeStore } from '@/stores/themeStore';

import { supabase } from '@/lib/supabase/client';

export function Header() {
  const router = useRouter();
  const { user, openAuthModal, logout } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isNotifDropdownOpen, setIsNotifDropdownOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

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
    <header className="sticky top-0 z-30 w-full h-16 glass-header border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 text-slate-900 dark:text-white px-4 flex items-center justify-between gap-2 md:gap-4 transition-colors duration-200">
      
      {/* Mobile Search Overlay */}
      {isMobileSearchOpen && (
        <form onSubmit={handleSearchSubmit} className="flex md:hidden flex-1 items-center gap-2 w-full animate-in fade-in zoom-in-95 duration-200">
          <button 
            type="button" 
            onClick={() => setIsMobileSearchOpen(false)}
            className="p-2 -ml-2 text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            autoFocus
            className="flex-1 px-4 py-2 text-sm rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-black dark:focus:border-white transition-colors"
          />
        </form>
      )}

      {/* Normal Header Content (hidden on mobile when search is open) */}
      <div className={`flex items-center justify-between w-full ${isMobileSearchOpen ? 'hidden md:flex' : 'flex'}`}>
        {/* Mobile Brand Logo */}
        <Link href="/" className="md:hidden flex items-center gap-2">
          <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl overflow-hidden bg-gradient-to-br from-orange-500/10 to-amber-500/10 border border-slate-200 dark:border-slate-800 flex items-center justify-center p-0.5 shadow-sm shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/pagpag.png" alt="Pagpag Logo" className="w-full h-full object-contain scale-125" />
          </div>
          <span className="font-bold text-lg text-slate-900 dark:text-white truncate max-w-[120px]">
            Instangalog
          </span>
        </Link>

        {/* Global Search Bar (Desktop) */}
        <form onSubmit={handleSearchSubmit} className="hidden md:block flex-1 max-w-md relative mx-4">
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
        <div className="flex items-center gap-1 md:gap-2.5">
          {/* Mobile Search Toggle */}
          <button
            onClick={() => setIsMobileSearchOpen(true)}
            className="md:hidden p-2 text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white rounded-full transition-colors"
            aria-label="Search"
          >
            <Search className="w-5 h-5" />
          </button>

          <InstallAppButton variant="icon" />

          {/* Theme Toggle (Mobile Only) */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="md:hidden p-2 text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white rounded-full transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {user ? (
            <div className="flex items-center gap-1 md:gap-2.5">
              <div className="relative">
                <button
                  onClick={() => setIsNotifDropdownOpen((prev) => !prev)}
                  className="relative p-2 text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white rounded-full transition-colors"
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

              {/* Mobile Logout Toggle */}
              <button
                onClick={logout}
                className="md:hidden p-2 text-slate-600 dark:text-slate-400 hover:text-red-500 rounded-full transition-colors"
                aria-label="Sign Out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => openAuthModal('Sign in to interact, post media, and chat')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-black text-white dark:bg-white dark:text-black hover:opacity-90 transition-all shadow-md ml-1"
            >
              <LogIn className="w-4 h-4" />
              <span className="hidden sm:inline">Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

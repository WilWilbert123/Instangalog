'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import {
  House,
  Clapperboard,
  Users,
  Compass,
  MessageSquare,
  PlusSquare,
  User,
  Shield,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { getAvatarUrl, getCartoonAvatar } from '@/lib/utils/avatar';

export function DesktopSidebar() {
  const pathname = usePathname();
  const { user, openAuthModal, logout } = useAuthStore();

  const navItems = [
    { href: '/', label: 'Home', icon: House },
    { href: '/following', label: 'Feed', icon: Users, protected: true },
    { href: '/chat', label: 'Global Chat', icon: MessageSquare },
    { href: user ? `/profile/${user.username}` : '/profile', label: 'Profile', icon: User, protected: true },
  ];

  if (user?.role === 'admin' || user?.role === 'moderator') {
    navItems.push({ href: '/admin', label: 'Admin Desk', icon: Shield, protected: true });
  }

  const handleNavClick = (e: React.MouseEvent, isProtected?: boolean) => {
    if (isProtected && !user) {
      e.preventDefault();
      openAuthModal('Sign in to access this feature');
    }
  };

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white p-4 justify-between z-30 transition-colors duration-200">
      <div className="space-y-6">
        {/* Brand Header (Monochrome Black & White) */}
        <Link href="/" className="flex items-center gap-3 px-2 py-1">
          <div className="w-10 h-10 rounded-xl bg-black text-white dark:bg-white dark:text-black flex items-center justify-center shadow-md">
            <Sparkles className="w-5 h-5 fill-current" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Instangalog
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold tracking-wider uppercase">
              Multimedia Social
            </p>
          </div>
        </Link>

        {/* Navigation Menu */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={(e) => handleNavClick(e, item.protected)}
                className={`flex items-center gap-3.5 px-3.5 py-3 rounded-xl font-semibold text-sm transition-all ${
                  isActive
                    ? 'bg-black text-white dark:bg-white dark:text-black shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Area: PWA Button, Theme & Auth Status */}
      <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="space-y-1.5">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 px-1">Theme</span>
          <ThemeToggle />
        </div>

        {user ? (
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center text-xs font-bold text-slate-900 dark:text-white overflow-hidden shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getAvatarUrl(user.avatar_url, user.username || user.display_name)}
                  alt={user.display_name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = getCartoonAvatar(user.username || user.display_name);
                  }}
                />
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user.display_name}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">@{user.username}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => openAuthModal('Sign in to access your profile and post content')}
            className="w-full py-2.5 text-xs font-bold rounded-xl bg-black text-white dark:bg-white dark:text-black hover:opacity-90 transition-all shadow-md"
          >
            Sign In
          </button>
        )}
      </div>
    </aside>
  );
}

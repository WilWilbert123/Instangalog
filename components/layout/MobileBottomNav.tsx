'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { House, Users, MessageSquare, User } from 'lucide-react';

export function MobileBottomNav() {
  const pathname = usePathname();
  const { user, openAuthModal } = useAuthStore();

  const navItems = [
    { href: '/', label: 'Home', icon: House },
    { href: '/following', label: 'Feed', icon: Users, protected: true },
    { href: '/chat', label: 'Chat', icon: MessageSquare },
    { href: user ? `/profile/${user.username}` : '/profile', label: 'Profile', icon: User, protected: true },
  ];

  const handleClick = (e: React.MouseEvent, isProtected?: boolean) => {
    if (isProtected && !user) {
      e.preventDefault();
      openAuthModal('Sign in to continue');
    }
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 px-2 py-2 transition-colors duration-200">
      <nav className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={(e) => handleClick(e, item.protected)}
              className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all ${
                isActive
                  ? 'text-black dark:text-white font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-black dark:hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

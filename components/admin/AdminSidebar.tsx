'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Video, Users, AlertTriangle, MessageSquare, Settings, ShieldCheck, ArrowLeft } from 'lucide-react';

export function AdminSidebar() {
  const pathname = usePathname();

  const links = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/videos', label: 'Pending Media', icon: Video },
    { href: '/admin/users', label: 'User Overview', icon: Users },
    { href: '/admin/reports', label: 'Abuse Reports', icon: AlertTriangle },
    { href: '/admin/chat', label: 'Chat Moderation', icon: MessageSquare },
    { href: '/admin/settings', label: 'Platform Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 space-y-6 flex flex-col justify-between h-full min-h-screen text-slate-900 dark:text-white transition-colors duration-200">
      <div className="space-y-6">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 rounded-xl bg-black text-white dark:bg-white dark:text-black flex items-center justify-center shadow-md">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Admin Control</h2>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold tracking-wider uppercase">Safety & Moderation</p>
          </div>
        </div>

        <nav className="space-y-1">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                  isActive
                    ? 'bg-black text-white dark:bg-white dark:text-black shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
        <Link
          href="/"
          className="flex items-center justify-center gap-2 w-full py-2.5 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to App</span>
        </Link>
      </div>
    </aside>
  );
}

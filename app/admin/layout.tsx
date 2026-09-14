'use client';

import React from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { useAuthStore, ADMIN_EMAIL } from '@/stores/authStore';
import { ShieldAlert } from 'lucide-react';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();

  const isAdminOrMod = user?.role === 'admin' || user?.role === 'moderator';

  if (!isAdminOrMod) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center space-y-4 text-slate-900 dark:text-white">
        <div className="w-16 h-16 rounded-full bg-black text-white dark:bg-white dark:text-black flex items-center justify-center shadow-lg">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Admin Authorization Required</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
          Please sign in with an authorized admin email account to access the Instangalog Moderation Desk.
        </p>

        <Link
          href="/login"
          className="px-6 py-2.5 text-xs font-bold rounded-xl bg-black text-white dark:bg-white dark:text-black shadow-lg hover:opacity-90 transition-all"
        >
          Go to Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors">
      <AdminSidebar />
      <div className="flex-1 p-6 overflow-y-auto">{children}</div>
    </div>
  );
}


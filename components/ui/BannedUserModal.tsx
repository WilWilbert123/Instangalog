'use client';

import React from 'react';
import { useAuthStore } from '@/stores/authStore';
import { ShieldAlert, LogOut, Mail } from 'lucide-react';

export function BannedUserModal() {
  const { user, logout } = useAuthStore();

  if (!user || user.status !== 'banned') return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/95 backdrop-blur-xl p-4 flex items-center justify-center animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-slate-900 border border-red-500/40 rounded-3xl p-6 sm:p-8 text-center shadow-2xl space-y-5 relative overflow-hidden">
        {/* Glow accent behind icon */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-40 h-40 bg-red-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 flex items-center justify-center mx-auto shadow-inner">
          <ShieldAlert className="w-8 h-8 animate-pulse" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-black text-white tracking-tight uppercase">
            Account Banned
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">
            Your account <strong className="text-red-400">@{user.username}</strong> has been <span className="text-red-500 font-bold uppercase">permanently banned</span> by platform administration due to severe or repeated content policy violations.
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-red-950/50 border border-red-900/60 text-left text-xs text-red-200 space-y-1 font-mono">
          <p className="font-bold text-red-400 uppercase text-[10px] tracking-wider">Restrictions Enforced:</p>
          <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-300">
            <li>Community Global Chat revoked</li>
            <li>Direct messaging & comments disabled</li>
            <li>Post publishing & media uploads locked</li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <a
            href="mailto:johnwilbertgamis2022@gmail.com?subject=Instangalog%20Account%20Ban%20Appeal"
            className="w-full sm:w-1/2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center justify-center gap-2"
          >
            <Mail className="w-4 h-4" />
            <span>Appeal Ban</span>
          </a>

          <button
            onClick={() => logout()}
            className="w-full sm:w-1/2 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition shadow-lg flex items-center justify-center gap-2 active:scale-95"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}

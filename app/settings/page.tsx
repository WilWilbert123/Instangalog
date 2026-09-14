'use client';

import React from 'react';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { InstallAppButton } from '@/components/pwa/InstallAppButton';
import { Settings, Shield, Moon, Smartphone } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6 text-slate-900 dark:text-white">
      <div className="p-6 rounded-2xl glass-card border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/80 space-y-2 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-black text-white dark:bg-white dark:text-black flex items-center justify-center shadow-md">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Application Settings</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Manage appearance, install options, and preferences</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Appearance Card */}
        <div className="p-4 rounded-2xl glass-card border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <Moon className="w-5 h-5 text-slate-700 dark:text-slate-300" />
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Theme Preference</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Choose between System, Dark, or Light interface</p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        {/* PWA App Installation Card */}
        <div className="p-4 rounded-2xl glass-card border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <Smartphone className="w-5 h-5 text-slate-700 dark:text-slate-300" />
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Instangalog PWA</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Install web app for desktop or mobile home screen</p>
            </div>
          </div>
          <InstallAppButton variant="button" />
        </div>

        {/* Safety & Moderation Info */}
        <div className="p-4 rounded-2xl glass-card border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-slate-700 dark:text-slate-300" />
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Community Safety & RLS</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">All media uploads undergo Admin review before public distribution</p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700">
            Active Security
          </span>
        </div>
      </div>
    </div>
  );
}

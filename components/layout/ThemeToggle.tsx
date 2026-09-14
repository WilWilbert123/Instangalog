'use client';

import React from 'react';
import { useThemeStore, ThemeMode } from '@/stores/themeStore';
import { Moon, Sun, Monitor } from 'lucide-react';

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const { theme, setTheme } = useThemeStore();

  const modes: { mode: ThemeMode; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
    { mode: 'dark', icon: Moon, label: 'Dark' },
    { mode: 'light', icon: Sun, label: 'Light' },
    { mode: 'system', icon: Monitor, label: 'System' },
  ];

  return (
    <div className={`grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 transition-colors ${className}`}>
      {modes.map(({ mode, icon: Icon, label }) => (
        <button
          key={mode}
          onClick={() => setTheme(mode)}
          className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            theme === mode
              ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
          title={`${label} theme`}
        >
          <Icon className="w-3.5 h-3.5 shrink-0" />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}

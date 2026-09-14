'use client';

import React from 'react';
import { Share, SquarePlus, X } from 'lucide-react';

interface IOSInstallInstructionsProps {
  onClose: () => void;
}

export function IOSInstallInstructions({ onClose }: IOSInstallInstructionsProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md p-6 overflow-hidden rounded-3xl glass-card border border-slate-300 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-white shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-black dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
          aria-label="Close installation instructions"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-black text-white dark:bg-white dark:text-black flex items-center justify-center shadow-lg">
            <SquarePlus className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Install Instangalog on iOS</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Add to your Home Screen for the full app experience.</p>
        </div>

        <div className="space-y-4 mb-6">
          <div className="flex items-start gap-4 p-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5">
            <div className="p-2 rounded-lg bg-black text-white dark:bg-white dark:text-black">
              <Share className="w-5 h-5" />
            </div>
            <div className="text-sm">
              <span className="font-semibold text-slate-900 dark:text-white">Step 1: </span>
              <span className="text-slate-700 dark:text-slate-300">Tap the Share button in Safari toolbar.</span>
            </div>
          </div>

          <div className="flex items-start gap-4 p-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5">
            <div className="p-2 rounded-lg bg-black text-white dark:bg-white dark:text-black">
              <SquarePlus className="w-5 h-5" />
            </div>
            <div className="text-sm">
              <span className="font-semibold text-slate-900 dark:text-white">Step 2: </span>
              <span className="text-slate-700 dark:text-slate-300">Scroll down and select &quot;Add to Home Screen&quot;.</span>
            </div>
          </div>

          <div className="flex items-start gap-4 p-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5">
            <div className="p-2 rounded-lg bg-black text-white dark:bg-white dark:text-black">
              <SquarePlus className="w-5 h-5" />
            </div>
            <div className="text-sm">
              <span className="font-semibold text-slate-900 dark:text-white">Step 3: </span>
              <span className="text-slate-700 dark:text-slate-300">Tap &quot;Add&quot; in the top right to confirm.</span>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 text-sm font-semibold rounded-xl bg-black text-white dark:bg-white dark:text-black shadow-lg hover:opacity-90 transition-opacity"
        >
          Got It
        </button>
      </div>
    </div>
  );
}

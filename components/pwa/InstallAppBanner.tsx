'use client';

import React, { useState } from 'react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Download, Smartphone, X } from 'lucide-react';
import { IOSInstallInstructions } from './IOSInstallInstructions';

export function InstallAppBanner() {
  const { isInstallable, isIOS, isInstalled, isBannerDismissed, dismissBanner, promptInstall } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);

  if (isInstalled || isBannerDismissed || (!isInstallable && !isIOS)) {
    return null;
  }

  const handleInstallClick = () => {
    if (isIOS) {
      setShowIOSModal(true);
    } else {
      promptInstall();
    }
  };

  return (
    <>
      <div className="fixed top-16 left-4 right-4 md:left-auto md:right-6 md:max-w-sm z-40 p-4 rounded-2xl glass-card border border-slate-300 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-white shadow-2xl animate-in slide-in-from-top-4 duration-300">
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center p-0.5 shrink-0 shadow-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/pagpag.png" alt="Pagpag App Icon" className="w-full h-full object-contain" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Get Instangalog App</h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">Install for faster loading & full screen mode.</p>
            </div>
          </div>
          <button
            onClick={dismissBanner}
            className="p-1 text-slate-400 hover:text-black dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-white/10"
            aria-label="Dismiss app install banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={handleInstallClick}
            className="flex-1 py-2 text-xs font-bold rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-90 transition-opacity"
          >
            {isIOS ? 'Add to Home Screen' : 'Install App'}
          </button>
          <button
            onClick={dismissBanner}
            className="px-3 py-2 text-xs font-medium rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300"
          >
            Not Now
          </button>
        </div>
      </div>

      {showIOSModal && <IOSInstallInstructions onClose={() => setShowIOSModal(false)} />}
    </>
  );
}

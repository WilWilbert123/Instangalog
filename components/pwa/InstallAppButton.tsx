'use client';

import React, { useState } from 'react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Download, Smartphone } from 'lucide-react';
import { IOSInstallInstructions } from './IOSInstallInstructions';

interface InstallAppButtonProps {
  variant?: 'icon' | 'button';
  className?: string;
}

export function InstallAppButton({ variant = 'icon', className = '' }: InstallAppButtonProps) {
  const { isInstallable, isIOS, isInstalled, promptInstall } = usePWAInstall();
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  if (isInstalled) return null;

  const handleClick = () => {
    if (isIOS) {
      setShowIOSInstructions(true);
    } else if (isInstallable) {
      promptInstall();
    }
  };

  if (!isInstallable && !isIOS) return null;

  const label = isIOS ? 'Add to Home Screen' : 'Install App';

  return (
    <>
      {variant === 'icon' ? (
        <button
          onClick={handleClick}
          title={label}
          aria-label={label}
          className={`p-2 text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors ${className}`}
        >
          {isIOS ? <Smartphone className="w-5 h-5" /> : <Download className="w-5 h-5" />}
        </button>
      ) : (
        <button
          onClick={handleClick}
          className={`flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-xl bg-black text-white dark:bg-white dark:text-black hover:opacity-90 transition-all shadow-md active:scale-[0.98] ${className}`}
          aria-label={label}
        >
          {isIOS ? <Smartphone className="w-4 h-4" /> : <Download className="w-4 h-4" />}
          <span>{label}</span>
        </button>
      )}

      {showIOSInstructions && (
        <IOSInstallInstructions onClose={() => setShowIOSInstructions(false)} />
      )}
    </>
  );
}

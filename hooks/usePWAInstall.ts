'use client';

import { useEffect } from 'react';
import { usePWAStore } from '@/stores/pwaStore';

export function usePWAInstall() {
  const { setDeferredPrompt, setIsIOS, setIsInstalled } = usePWAStore();

  useEffect(() => {
    // Check if running as standalone app
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
    }

    // iOS Detection
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    // Listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as unknown as Parameters<typeof setDeferredPrompt>[0]);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [setDeferredPrompt, setIsIOS, setIsInstalled]);

  return usePWAStore();
}

import { create } from 'zustand';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAStore {
  deferredPrompt: BeforeInstallPromptEvent | null;
  isInstallable: boolean;
  isIOS: boolean;
  isInstalled: boolean;
  isBannerDismissed: boolean;
  setDeferredPrompt: (event: BeforeInstallPromptEvent | null) => void;
  setIsIOS: (isIOS: boolean) => void;
  setIsInstalled: (isInstalled: boolean) => void;
  dismissBanner: () => void;
  promptInstall: () => Promise<boolean>;
}

export const usePWAStore = create<PWAStore>((set, get) => ({
  deferredPrompt: null,
  isInstallable: false,
  isIOS: false,
  isInstalled: false,
  isBannerDismissed: false,

  setDeferredPrompt: (event) => set({ deferredPrompt: event, isInstallable: !!event }),
  setIsIOS: (isIOS) => set({ isIOS }),
  setIsInstalled: (isInstalled) => set({ isInstalled }),
  dismissBanner: () => set({ isBannerDismissed: true }),

  promptInstall: async () => {
    const { deferredPrompt } = get();
    if (!deferredPrompt) return false;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    set({ deferredPrompt: null, isInstallable: false });
    return outcome === 'accepted';
  },
}));

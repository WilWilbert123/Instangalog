export interface MagicLinkState {
  email: string;
  userId: string;
  status: 'pending' | 'verified';
  session?: {
    access_token: string;
    refresh_token: string;
  };
  createdAt: number;
}

const g = globalThis as unknown as { __magicLinkStore?: Map<string, MagicLinkState> };
if (!g.__magicLinkStore) {
  g.__magicLinkStore = new Map();
}

export const magicLinkStore = g.__magicLinkStore;

export function registerPendingMagicLink(email: string, userId: string) {
  magicLinkStore.set(email.toLowerCase(), {
    email: email.toLowerCase(),
    userId,
    status: 'pending',
    createdAt: Date.now(),
  });
}

export function setMagicLinkVerified(email: string, userId: string, session?: { access_token: string; refresh_token: string }) {
  magicLinkStore.set(email.toLowerCase(), {
    email: email.toLowerCase(),
    userId,
    status: 'verified',
    session,
    createdAt: Date.now(),
  });
}

export function getMagicLinkStatus(email: string): MagicLinkState | null {
  const entry = magicLinkStore.get(email.toLowerCase());
  if (!entry) return null;
  // Expire after 15 minutes
  if (Date.now() - entry.createdAt > 15 * 60 * 1000) {
    magicLinkStore.delete(email.toLowerCase());
    return null;
  }
  return entry;
}

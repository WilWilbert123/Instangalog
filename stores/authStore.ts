import { create } from 'zustand';
import { UserSession } from '@/types/auth';
import { supabase } from '@/lib/supabase/client';
import { upsertProfile } from '@/lib/services/chatService';

export const ADMIN_EMAIL = 'johnwilbertgamis2022@gmail.com';

interface AuthStore {
  user: UserSession | null;
  isLoading: boolean;
  showAuthModal: boolean;
  authModalActionText: string;
  openAuthModal: (actionText?: string) => void;
  closeAuthModal: () => void;
  loginWithEmail: (email: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<void>;
  initSession: () => Promise<void>;
  logout: () => Promise<void>;
  updateUserSession: (updates: Partial<UserSession>) => void;
}

import { getAvatarUrl } from '@/lib/utils/avatar';

/** Map a raw Supabase auth user + DB profile row into our app's UserSession shape */
function buildSession(
  supabaseUser: {
    id: string;
    email?: string | null;
    user_metadata?: Record<string, unknown>;
  },
  dbProfile?: {
    username?: string | null;
    display_name?: string | null;
    avatar_url?: string | null;
    role?: string | null;
  } | null
): UserSession {
  const email = (supabaseUser.email ?? '').toLowerCase();
  const meta = supabaseUser.user_metadata ?? {};
  const isAdmin = email === ADMIN_EMAIL.toLowerCase();

  const username =
    dbProfile?.username ||
    (isAdmin
      ? 'johnwilbert'
      : (meta.preferred_username as string) ||
        (meta.user_name as string) ||
        email.split('@')[0]);

  const display_name =
    dbProfile?.display_name ||
    (isAdmin
      ? 'John Wilbert (Admin)'
      : (meta.full_name as string) ||
        (meta.name as string) ||
        email.split('@')[0]);

  const rawAvatar =
    dbProfile?.avatar_url ||
    (meta.avatar_url as string) ||
    (meta.picture as string) ||
    '';

  return {
    id: supabaseUser.id,
    email,
    username,
    display_name,
    avatar_url: getAvatarUrl(rawAvatar, username),
    role: isAdmin ? 'admin' : (dbProfile?.role as any) || 'user',
    status: 'active',
  };
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isLoading: true,
  showAuthModal: false,
  authModalActionText: 'Sign in to continue',

  openAuthModal: (actionText = 'Sign in to continue') =>
    set({ showAuthModal: true, authModalActionText: actionText }),

  closeAuthModal: () => set({ showAuthModal: false }),

  /**
   * Email sign-in: sends magic-link via Resend API (if configured) or Supabase Auth.
   */
  loginWithEmail: async (email: string) => {
    const cleanEmail = email.trim().toLowerCase();

    try {
      // Clear any previous stale session if logging in with a different email
      const { data: currentSessionData } = await supabase.auth.getSession();
      if (currentSessionData?.session?.user?.email?.toLowerCase() !== cleanEmail) {
        await supabase.auth.signOut();
      }

      const origin = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || 'https://instangalogpagpag.vercel.app');
      const redirectTo = `${origin}/auth/callback`;

      // 1. Send via Resend API route
      const res = await fetch('/api/auth/send-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      });

      const resData = await res.json().catch(() => null);

      if (resData) {
        if (resData.success && resData.provider === 'resend') {
          return { success: true };
        }
        if (!resData.success) {
          let msg = resData.error || 'Failed to send magic link';
          if (msg.includes('rate limit') || msg.includes('security purposes') || msg.includes('after')) {
            msg = 'For security purposes, you can only request this after 60 seconds.';
          }
          return { success: false, error: msg };
        }
      }

      // 2. Supabase client fallback ONLY if Resend API key is not configured on server
      if (resData?.provider === 'supabase') {
        const { error } = await supabase.auth.signInWithOtp({
          email: cleanEmail,
          options: {
            emailRedirectTo: redirectTo,
            shouldCreateUser: true,
          },
        });

        if (error) {
          let msg = error.message;
          if (msg.includes('rate limit') || msg.includes('security purposes') || msg.includes('after')) {
            msg = 'For security purposes, you can only request this after 60 seconds.';
          }
          return { success: false, error: msg };
        }

        return { success: true };
      }

      return { success: resData?.success ?? false, error: resData?.error || 'Failed to send magic link' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to send magic link' };
    }
  },

  /**
   * One-click instant login helper for magic link screen
   */
  completeInstantLogin: async (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const isAdmin = cleanEmail === ADMIN_EMAIL.toLowerCase();

    try {
      const { data: dbProfile } = await (supabase.from('profiles') as any)
        .select('username, display_name, avatar_url, role')
        .eq('username', cleanEmail.split('@')[0])
        .maybeSingle();

      const prof = dbProfile as any;

      const userSession: UserSession = {
        id: isAdmin ? '2825c165-8cd1-4cd4-a42e-c2eedde378e0' : `user-${Date.now()}`,
        email: cleanEmail,
        username: prof?.username || (isAdmin ? 'admin' : cleanEmail.split('@')[0]),
        display_name: prof?.display_name || (isAdmin ? 'John Wilbert' : cleanEmail.split('@')[0]),
        avatar_url: prof?.avatar_url || '',
        role: isAdmin ? 'admin' : (prof?.role as any) || 'user',
        status: 'active',
      };

      set({ user: userSession, showAuthModal: false });
    } catch {
      const userSession: UserSession = {
        id: isAdmin ? '2825c165-8cd1-4cd4-a42e-c2eedde378e0' : `user-${Date.now()}`,
        email: cleanEmail,
        username: isAdmin ? 'admin' : cleanEmail.split('@')[0],
        display_name: isAdmin ? 'admin' : cleanEmail.split('@')[0],
        avatar_url: '',
        role: isAdmin ? 'admin' : 'user',
        status: 'active',
      };
      set({ user: userSession, showAuthModal: false });
    }
  },

  /**
   * Real Google OAuth via Supabase — redirects to actual Google account picker.
   */
  loginWithGoogle: async () => {
    // Clear any active session first so switching Google accounts creates/logs into the selected account properly
    await supabase.auth.signOut();

    const redirectTo =
      typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback`
        : `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          prompt: 'select_account',
          access_type: 'offline',
        },
      },
    });

    if (error) {
      console.error('[Google OAuth] Failed to initiate:', error.message);
    }
  },

  /**
   * Called on app mount to restore an existing Supabase session.
   */
  initSession: async () => {
    set({ isLoading: true });
    try {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        await upsertProfile(data.user as Parameters<typeof upsertProfile>[0]);
        const { data: dbProfile } = await supabase
          .from('profiles')
          .select('username, display_name, avatar_url, role')
          .eq('id', data.user.id)
          .maybeSingle();

        set({ user: buildSession(data.user, dbProfile), isLoading: false });
      } else {
        set({ user: null, isLoading: false });
      }
    } catch {
      set({ user: null, isLoading: false });
    }

    // Listen for auth state changes (login / logout / token refresh)
    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await upsertProfile(session.user as Parameters<typeof upsertProfile>[0]);
        const { data: dbProfile } = await supabase
          .from('profiles')
          .select('username, display_name, avatar_url, role')
          .eq('id', session.user.id)
          .maybeSingle();

        set({ user: buildSession(session.user, dbProfile), showAuthModal: false });
      } else {
        set({ user: null });
      }
    });
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null });
  },

  updateUserSession: (updates: Partial<UserSession>) => {
    set((state) => ({
      user: state.user ? { ...state.user, ...updates } : null,
    }));
  },
}));

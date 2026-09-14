'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';

/** Bootstraps the Supabase session on first client render. */
export function SessionProvider() {
  const initSession = useAuthStore((s) => s.initSession);
  useEffect(() => {
    initSession();
  }, [initSession]);
  return null;
}

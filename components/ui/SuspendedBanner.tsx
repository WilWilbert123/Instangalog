'use client';

import React from 'react';
import { useAuthStore } from '@/stores/authStore';
import { AlertTriangle } from 'lucide-react';

export function SuspendedBanner() {
  const { user } = useAuthStore();

  if (!user || user.status !== 'suspended') return null;

  return (
    <div className="w-full bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 text-white px-4 py-2.5 text-xs font-bold flex items-center justify-center gap-2 shadow-md relative z-40 animate-in slide-in-from-top-2">
      <AlertTriangle className="w-4 h-4 shrink-0 animate-bounce" />
      <span>
        <strong>Account Suspended:</strong> Your account is currently suspended due to content policy violations. Posting, chatting, and commenting are temporarily restricted.
      </span>
    </div>
  );
}

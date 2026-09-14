'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

export default function ProfileRedirect() {
  const router = useRouter();
  const { user, isLoading, openAuthModal } = useAuthStore();

  useEffect(() => {
    if (!isLoading) {
      if (user?.username) {
        router.replace(`/profile/${user.username}`);
      } else {
        openAuthModal('Sign in to view your profile');
        router.replace('/profile/bringsomeice6');
      }
    }
  }, [user, isLoading, router, openAuthModal]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="w-8 h-8 border-4 border-black dark:border-white border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Profile } from '@/types/user';
import { useAuthStore } from '@/stores/authStore';
import { getAvatarUrl, getCartoonAvatar } from '@/lib/utils/avatar';
import { EditProfileModal } from './EditProfileModal';
import { ProfileVisitorsModal } from './ProfileVisitorsModal';
import { ShieldCheck, Edit3, UserCheck, UserPlus, Clock, Eye } from 'lucide-react';
import { PendingPostsModal } from './PendingPostsModal';
import { getUserPendingPosts } from '@/lib/services/postService';

interface ProfileHeaderProps {
  initialProfile: Profile;
  actualPostsCount?: number;
}

import { checkIsFollowing, toggleFollow } from '@/lib/services/followService';

export function ProfileHeader({ initialProfile, actualPostsCount }: ProfileHeaderProps) {
  const router = useRouter();
  const { user, openAuthModal } = useAuthStore();
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPendingModalOpen, setIsPendingModalOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(initialProfile.followers_count);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [isVisitorsModalOpen, setIsVisitorsModalOpen] = useState(false);
  const [visitorCount, setVisitorCount] = useState(0);

  // Check if logged-in user owns this profile
  const isOwnProfile =
    Boolean(user) &&
    (user?.id === profile.id ||
      user?.username.toLowerCase() === profile.username.toLowerCase());

  // Log visit if logged in and visiting another user's profile
  React.useEffect(() => {
    if (user && profile.id && !isOwnProfile) {
      fetch('/api/profile/visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: profile.id, visitorId: user.id }),
      }).catch(console.error);
    }
  }, [user, profile.id, isOwnProfile]);

  // Fetch visitor count for profile owner only
  React.useEffect(() => {
    if (profile.id && isOwnProfile) {
      fetch(`/api/profile/visitors?profileId=${profile.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.visitors) {
            setVisitorCount(data.visitors.length);
          }
        })
        .catch(console.error);
    }
  }, [profile.id, isOwnProfile]);

  // Check initial follow state and pending uploads count (private to profile owner only)
  React.useEffect(() => {
    if (user && profile.id && !isOwnProfile) {
      checkIsFollowing(user.id, profile.id).then((following) => {
        setIsFollowing(following);
      });
    }
    if (profile.id && isOwnProfile) {
      getUserPendingPosts(profile.id).then((posts) => {
        setPendingCount(posts.length);
      });
    }
  }, [user, profile.id, isOwnProfile]);

  const handleFollowToggle = async () => {
    if (!user) {
      openAuthModal('Sign in to follow users');
      return;
    }

    if (isFollowLoading) return;
    setIsFollowLoading(true);

    // Optimistic UI update
    const nextState = !isFollowing;
    setIsFollowing(nextState);
    setFollowersCount((prev) => (nextState ? prev + 1 : Math.max(0, prev - 1)));

    // Persist to Supabase DB
    const res = await toggleFollow(user.id, profile.id, user);
    setIsFollowing(res.isFollowing);
    if (res.newFollowersCount !== undefined) {
      setFollowersCount(res.newFollowersCount);
    }
    setIsFollowLoading(false);
  };

  const handleProfileUpdated = (updatedProfile: Profile) => {
    setProfile(updatedProfile);
    if (updatedProfile.username !== initialProfile.username) {
      router.push(`/profile/${updatedProfile.username}`);
    }
    router.refresh();
  };

  return (
    <>
      <div className="p-6 rounded-3xl glass-card border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 text-slate-900 dark:text-white space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
          {/* Avatar */}
          <div className="relative w-24 h-24 rounded-full border-4 border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 shadow-lg group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getAvatarUrl(profile.avatar_url, profile.username || profile.display_name)}
              alt={profile.display_name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = getCartoonAvatar(profile.username || profile.display_name);
              }}
            />

            {/* Quick edit overlay for profile owner */}
            {isOwnProfile && (
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs font-bold gap-1"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit</span>
              </button>
            )}
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center justify-center sm:justify-start gap-2">
                  <span>{profile.display_name}</span>
                  {profile.role === 'admin' && (
                    <span className="p-1 rounded-full bg-black text-white dark:bg-white dark:text-black" title="Verified Admin">
                      <ShieldCheck className="w-4 h-4" />
                    </span>
                  )}
                </h1>
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">@{profile.username}</p>
              </div>

              {/* Action Buttons: Visitors (Owner only), Pending Uploads & Edit Profile for owner vs Follow for others */}
              <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-end">
                {isOwnProfile && (
                  <button
                    onClick={() => setIsVisitorsModalOpen(true)}
                    className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-bold rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition-all active:scale-95 shadow-sm"
                    title="View your profile visitors history"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Visitors</span>
                    {visitorCount > 0 && (
                      <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-indigo-600 text-white font-black">
                        {visitorCount}
                      </span>
                    )}
                  </button>
                )}

                {isOwnProfile && pendingCount > 0 && (
                  <button
                    onClick={() => setIsPendingModalOpen(true)}
                    className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-bold rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-all active:scale-95 shadow-sm"
                    title="View your pending uploads"
                  >
                    <Clock className="w-4 h-4" />
                    <span>Pending</span>
                    <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-amber-500 text-white font-black">
                      {pendingCount}
                    </span>
                  </button>
                )}

                {isOwnProfile ? (
                  <button
                    onClick={() => setIsEditModalOpen(true)}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-black text-white dark:bg-white dark:text-black shadow-md hover:opacity-90 transition-all active:scale-95"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Edit Profile</span>
                  </button>
                ) : (
                  <button
                    onClick={handleFollowToggle}
                    className={`flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold rounded-xl transition-all shadow-md active:scale-95 ${
                      isFollowing
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700'
                        : 'bg-black text-white dark:bg-white dark:text-black hover:opacity-90'
                    }`}
                  >
                    {isFollowing ? (
                      <>
                        <UserCheck className="w-4 h-4 text-emerald-500" />
                        <span>Following</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>Follow</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300 max-w-lg leading-relaxed">
              {profile.bio || 'No bio written yet.'}
            </p>

            {/* Metrics Counter */}
            <div className="flex items-center justify-center sm:justify-start gap-6 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
              <div>
                <span className="font-bold text-slate-900 dark:text-white text-sm block">
                  {Math.max(profile.posts_count || 0, actualPostsCount || 0)}
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">Posts</span>
              </div>
              <div>
                <span className="font-bold text-slate-900 dark:text-white text-sm block">{followersCount.toLocaleString()}</span>
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">Followers</span>
              </div>
              <div>
                <span className="font-bold text-slate-900 dark:text-white text-sm block">{profile.following_count.toLocaleString()}</span>
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">Following</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isOwnProfile && (
        <EditProfileModal
          profile={profile}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onProfileUpdated={handleProfileUpdated}
        />
      )}

      {/* Pending Posts Modal */}
      <PendingPostsModal
        userId={profile.id}
        isOpen={isPendingModalOpen}
        onClose={() => setIsPendingModalOpen(false)}
      />

      {/* Profile Visitors Modal */}
      <ProfileVisitorsModal
        profileId={profile.id}
        isOpen={isVisitorsModalOpen}
        onClose={() => setIsVisitorsModalOpen(false)}
      />
    </>
  );
}

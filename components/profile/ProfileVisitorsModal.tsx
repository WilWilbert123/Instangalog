'use client';

import React, { useState, useEffect } from 'react';
import { ProfileVisitor } from '@/lib/services/visitorService';
import { useAuthStore } from '@/stores/authStore';
import { getAvatarUrl, getCartoonAvatar } from '@/lib/utils/avatar';
import { Eye, X, Users, Clock, Loader2, ShieldCheck, UserPlus, UserCheck, Footprints } from 'lucide-react';
import Link from 'next/link';
import { toggleFollow, checkIsFollowing } from '@/lib/services/followService';

interface ProfileVisitorsModalProps {
  profileId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileVisitorsModal({ profileId, isOpen, onClose }: ProfileVisitorsModalProps) {
  const { user, openAuthModal } = useAuthStore();
  const [visitors, setVisitors] = useState<ProfileVisitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isOpen || !profileId) return;

    async function loadVisitors() {
      setLoading(true);
      try {
        const res = await fetch(`/api/profile/visitors?profileId=${encodeURIComponent(profileId)}`);
        const json = await res.json();
        if (json.visitors) {
          setVisitors(json.visitors);

          // Check follow status for each visitor if user is logged in
          if (user) {
            const map: Record<string, boolean> = {};
            await Promise.all(
              json.visitors.map(async (v: ProfileVisitor) => {
                if (v.visitor_id && v.visitor_id !== user.id) {
                  const isFollowing = await checkIsFollowing(user.id, v.visitor_id);
                  map[v.visitor_id] = isFollowing;
                }
              })
            );
            setFollowingMap(map);
          }
        }
      } catch (err: any) {
        console.error('[loadVisitors error]:', err?.message);
      } finally {
        setLoading(false);
      }
    }

    loadVisitors();
  }, [isOpen, profileId, user]);

  if (!isOpen) return null;

  const handleFollowToggle = async (visitorId: string) => {
    if (!user) {
      openAuthModal('Sign in to follow users');
      return;
    }

    const currentFollowing = Boolean(followingMap[visitorId]);
    setFollowingMap((prev) => ({ ...prev, [visitorId]: !currentFollowing }));

    const res = await toggleFollow(user.id, visitorId, user);
    setFollowingMap((prev) => ({ ...prev, [visitorId]: res.isFollowing }));
  };

  const getTimeAgo = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md p-6 rounded-3xl glass-card border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 text-slate-900 dark:text-white shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center justify-center">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Profile Visitors</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Recent community members who viewed this profile
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-black dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Visitors List Container */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-7 h-7 text-purple-500 animate-spin mx-auto" />
              <p className="text-xs text-slate-500">Loading profile visitors log...</p>
            </div>
          ) : visitors.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <Footprints className="w-10 h-10 text-slate-400 mx-auto" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">No visitors recorded yet</h4>
              <p className="text-xs text-slate-500">
                Profile visits by logged-in users will automatically appear here!
              </p>
            </div>
          ) : (
            visitors.map((item) => {
              const visitor = item.visitor || {
                display_name: 'Visitor',
                username: 'visitor',
                avatar_url: '',
                role: 'user',
              };
              const isSelf = user?.id === item.visitor_id;
              const isFollowing = Boolean(followingMap[item.visitor_id]);

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                >
                  <Link
                    href={`/profile/${visitor.username}`}
                    onClick={onClose}
                    className="flex items-center gap-3 min-w-0 flex-1 group"
                  >
                    <div className="w-10 h-10 rounded-full border border-slate-300 dark:border-slate-700 overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getAvatarUrl(visitor.avatar_url, visitor.username || visitor.display_name)}
                        alt={visitor.display_name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = getCartoonAvatar(visitor.username || visitor.display_name);
                        }}
                      />
                    </div>

                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:underline flex items-center gap-1.5 truncate">
                        <span>{visitor.display_name}</span>
                        {visitor.role === 'admin' && (
                          <span className="p-0.5 rounded-full bg-black text-white dark:bg-white dark:text-black">
                            <ShieldCheck className="w-3 h-3" />
                          </span>
                        )}
                      </h4>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                        <span>@{visitor.username}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {getTimeAgo(item.visited_at)}
                        </span>
                      </div>
                    </div>
                  </Link>

                  {!isSelf && user && (
                    <button
                      onClick={() => handleFollowToggle(item.visitor_id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm shrink-0 flex items-center gap-1 ${
                        isFollowing
                          ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white'
                          : 'bg-black text-white dark:bg-white dark:text-black hover:opacity-90'
                      }`}
                    >
                      {isFollowing ? (
                        <>
                          <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Following</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Follow</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

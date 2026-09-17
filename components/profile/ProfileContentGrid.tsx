'use client';

import React, { useState } from 'react';
import { Post, PostType } from '@/types/post';
import { FeedVideoPlayer } from '@/components/feed/FeedVideoPlayer';
import { MusicCard } from '@/components/music/MusicCard';
import { CommentDrawer } from '@/components/comments/CommentDrawer';
import { togglePostLike } from '@/lib/services/postService';
import { recordPostView } from '@/lib/services/viewService';
import { useAuthStore } from '@/stores/authStore';
import { useModalStore } from '@/stores/modalStore';
import {
  Grid,
  Video,
  Image as ImageIcon,
  Music,
  Type,
  Heart,
  MessageCircle,
  Share2,
  Eye,
  ExternalLink,
  Play,
} from 'lucide-react';
import Link from 'next/link';

interface ProfileContentGridProps {
  posts: Post[];
  username: string;
}

export function ProfileContentGrid({ posts, username }: ProfileContentGridProps) {
  const { user, openAuthModal } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'all' | PostType>('all');
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);

  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [likesCountMap, setLikesCountMap] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    posts.forEach((p) => {
      initial[p.id] = p.likes_count || 0;
    });
    return initial;
  });
  const [commentsCountMap, setCommentsCountMap] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    posts.forEach((p) => {
      initial[p.id] = p.comments_count || 0;
    });
    return initial;
  });

  const { showAlert } = useModalStore();

  const handleToggleLike = async (postId: string) => {
    if (!user) {
      openAuthModal('Sign in to like posts');
      return;
    }
    if (user.status === 'suspended' || user.status === 'banned') {
      showAlert(`Your account is currently ${user.status}. You cannot like posts.`, 'Account Restricted', 'warning');
      return;
    }

    const currentlyLiked = Boolean(likedMap[postId]);
    const nextState = !currentlyLiked;

    setLikedMap((prev) => ({ ...prev, [postId]: nextState }));
    setLikesCountMap((prev) => ({
      ...prev,
      [postId]: nextState ? (prev[postId] || 0) + 1 : Math.max(0, (prev[postId] || 1) - 1),
    }));

    try {
      await togglePostLike(postId, user.id, currentlyLiked);
    } catch (err: any) {
      // Revert optimistic update
      setLikedMap((prev) => ({ ...prev, [postId]: currentlyLiked }));
      setLikesCountMap((prev) => ({
        ...prev,
        [postId]: currentlyLiked ? (prev[postId] || 0) + 1 : Math.max(0, (prev[postId] || 1) - 1),
      }));
      showAlert(err?.message || 'Failed to like post.', 'Error', 'error');
    }
  };

  const handleShare = (postId: string, captionText?: string) => {
    const shareUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/post/${postId}`
      : `https://instangalog.online/post/${postId}`;

    if (navigator.share) {
      navigator.share({ title: captionText || 'Check out this post', url: shareUrl }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert('Link copied to clipboard!');
    }
  };

  const filteredPosts = posts.filter((p) => {
    if (activeTab === 'all') return true;
    return p.type === activeTab;
  });

  return (
    <div className="space-y-4">
      {/* Header Bar & Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl glass-card border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Grid className="w-4 h-4 text-indigo-500" />
          <span>Uploaded Content ({filteredPosts.length})</span>
        </h3>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 hide-scrollbar">
          {[
            { key: 'all', label: 'All', icon: Grid },
            { key: 'video', label: 'Videos', icon: Video },
            { key: 'image', label: 'Images', icon: ImageIcon },
            { key: 'music', label: 'Music', icon: Music },
            { key: 'status', label: 'Status', icon: Type },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === key
                  ? 'bg-black text-white dark:bg-white dark:text-black shadow-md'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Posts */}
      {filteredPosts.length === 0 ? (
        <div className="p-12 rounded-3xl glass-card border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40 text-center space-y-2">
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">No content found in this category.</p>
          <p className="text-xs text-slate-400">Posts uploaded by @{username} will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPosts.map((post) => {
            const isLiked = Boolean(likedMap[post.id]);
            const likesCount = likesCountMap[post.id] ?? post.likes_count ?? 0;

            if (post.type === 'music') {
              return (
                <MusicCard
                  key={post.id}
                  post={post}
                  onOpenComments={(pId) => {
                    if (!user) {
                      openAuthModal('Sign in to comment');
                      return;
                    }
                    setActiveCommentPostId(pId);
                  }}
                />
              );
            }

            return (
              <div
                key={post.id}
                onMouseEnter={() => recordPostView(post.id, user?.id)}
                className="p-5 rounded-3xl glass-card border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 text-slate-900 dark:text-white space-y-4 shadow-lg flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Caption */}
                  {post.caption && (
                    <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                      {post.caption}
                    </p>
                  )}

                  {/* Playable Video Player */}
                  {post.type === 'video' && post.video && (
                    <div className="relative rounded-2xl overflow-hidden bg-black border border-slate-200 dark:border-slate-800">
                      <FeedVideoPlayer
                        videoUrl={post.video.video_url}
                        thumbnailUrl={post.video.thumbnail_url}
                        caption={post.caption}
                      />
                    </div>
                  )}

                  {/* High Quality Image */}
                  {post.type === 'image' && post.image && (
                    <div className="relative aspect-square sm:aspect-video rounded-2xl overflow-hidden bg-black border border-slate-200 dark:border-slate-800 flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={post.image.image_url}
                        alt={post.caption || 'Image post'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Status Text Box */}
                  {post.type === 'status' && post.status && (
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 text-slate-900 dark:text-white font-medium text-sm sm:text-base leading-relaxed">
                      "{post.status.text}"
                    </div>
                  )}

                  {/* Hashtags */}
                  {post.hashtags && post.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {post.hashtags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 text-[10px] font-bold border border-slate-200 dark:border-slate-800"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card Action Bar */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleLike(post.id)}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-bold transition-all ${
                        isLiked
                          ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                          : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                      <span>{likesCount}</span>
                    </button>

                    <button
                      onClick={() => {
                        if (!user) {
                          openAuthModal('Sign in to comment');
                          return;
                        }
                        setActiveCommentPostId(post.id);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-bold bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white transition-all"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>{commentsCountMap[post.id] ?? post.comments_count ?? 0}</span>
                    </button>

                    <button
                      onClick={() => handleShare(post.id, post.caption)}
                      className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white transition-all"
                      title="Share Post"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <Link
                    href={`/post/${post.id}`}
                    className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-indigo-500 transition-colors"
                  >
                    <span>View Post</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Active Comment Drawer */}
      {activeCommentPostId && (
        <CommentDrawer
          postId={activeCommentPostId}
          onClose={() => setActiveCommentPostId(null)}
          onCommentAdded={(pId, count) => {
            setCommentsCountMap((prev) => ({ ...prev, [pId]: count }));
          }}
        />
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Post } from '@/types/post';
import { VideoCard } from './VideoCard';
import { CommentDrawer } from '@/components/comments/CommentDrawer';
import { organizeSmartFeed, markVideoAsWatched } from '@/lib/utils/watchedVideoManager';
import { useAuthStore } from '@/stores/authStore';
import { SUPER_ADMIN_EMAIL } from '@/lib/services/postService';
import { RotateCw } from 'lucide-react';

interface VerticalFeedProps {
  posts: Post[];
}

export function VerticalFeed({ posts }: VerticalFeedProps) {
  const { user } = useAuthStore();
  const [displayPosts, setDisplayPosts] = useState<Post[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [showRefreshToast, setShowRefreshToast] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const watchTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize and organize posts on mount or when posts change:
  // Automatically shows unseen fresh videos first, watched videos after,
  // and rotates automatically like TikTok so feed is always fresh.
  const refreshFeedList = useCallback((rawPosts: Post[]) => {
    // 1. Strict Privacy Filter: If post is private, only author & Super Admin can see
    const visiblePosts = rawPosts.filter((p) => {
      if (p.visibility === 'private') {
        const isAuthor = Boolean(user && p.user_id === user.id);
        const isSuperAdmin = Boolean(user && user.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase());
        if (!isAuthor && !isSuperAdmin) return false;
      }
      return true;
    });

    // 2. TikTok Auto-Fresh Smart Feed: fresh unseen first, auto-rotated
    const organized = organizeSmartFeed(visiblePosts, {
      userId: user?.id,
    });

    setDisplayPosts(organized);
    setActiveIndex(0);
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [user]);

  useEffect(() => {
    refreshFeedList(posts);
  }, [posts, refreshFeedList]);

  // Handle in-app refresh event triggered by clicking Home icon or Logo
  useEffect(() => {
    const handleRefreshEvent = () => {
      refreshFeedList(posts);
      setShowRefreshToast(true);
      const timer = setTimeout(() => setShowRefreshToast(false), 2200);
      return () => clearTimeout(timer);
    };

    window.addEventListener('refresh-fyp-feed', handleRefreshEvent);
    return () => window.removeEventListener('refresh-fyp-feed', handleRefreshEvent);
  }, [posts, refreshFeedList]);

  // Track scroll position to update active index
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollPosition = container.scrollTop;
      const height = container.clientHeight;
      if (height === 0) return;
      const index = Math.round(scrollPosition / height);
      if (index !== activeIndex && index >= 0 && index < displayPosts.length) {
        setActiveIndex(index);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [activeIndex, displayPosts.length]);

  // Mark currently active video as watched after viewing for 1.2 seconds
  useEffect(() => {
    if (watchTimerRef.current) clearTimeout(watchTimerRef.current);

    const currentPost = displayPosts[activeIndex];
    if (currentPost?.id) {
      watchTimerRef.current = setTimeout(() => {
        markVideoAsWatched(currentPost.id);
      }, 1200);
    }

    return () => {
      if (watchTimerRef.current) clearTimeout(watchTimerRef.current);
    };
  }, [activeIndex, displayPosts]);

  if (!displayPosts || displayPosts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 text-slate-400">
        <p className="text-lg font-semibold text-white">No videos available</p>
        <p className="text-sm mt-1">Check back soon for new video posts!</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex flex-col items-center">
      {/* Floating Refresh Rotating Icon Indicator */}
      {showRefreshToast && (
        <div className="absolute top-3 z-50 flex items-center justify-center p-2.5 rounded-full bg-orange-600/90 dark:bg-orange-500/90 text-white shadow-2xl backdrop-blur-md border border-white/20">
          <RotateCw className="w-5 h-5 text-white animate-spin" />
        </div>
      )}

      {/* Vertical Reel Scroll Container */}
      <div
        ref={containerRef}
        className="fyp-feed-container w-full h-[calc(100dvh-8rem)] md:h-[calc(100vh-5rem)] overflow-y-auto snap-y snap-mandatory hide-scrollbar"
      >
        {displayPosts.map((post, idx) => (
          <div key={post.id} className="fyp-slide w-full h-[calc(100dvh-8rem)] md:h-[calc(100vh-5rem)] flex items-center justify-center p-1 sm:p-2">
            <VideoCard
              post={post}
              isActive={idx === activeIndex}
              onOpenComments={(postId) => setActiveCommentPostId(postId)}
            />
          </div>
        ))}
      </div>

      {activeCommentPostId && (
        <CommentDrawer
          postId={activeCommentPostId}
          postAuthorId={displayPosts.find((p) => p.id === activeCommentPostId)?.user_id || displayPosts.find((p) => p.id === activeCommentPostId)?.author?.id}
          onClose={() => setActiveCommentPostId(null)}
        />
      )}
    </div>
  );
}

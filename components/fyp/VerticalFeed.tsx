'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Post } from '@/types/post';
import { VideoCard } from './VideoCard';
import { CommentDrawer } from '@/components/comments/CommentDrawer';
import { organizeSmartFeed, markVideoAsWatched } from '@/lib/utils/watchedVideoManager';
import { Sparkles } from 'lucide-react';

interface VerticalFeedProps {
  posts: Post[];
}

export function VerticalFeed({ posts }: VerticalFeedProps) {
  const [displayPosts, setDisplayPosts] = useState<Post[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [showRefreshToast, setShowRefreshToast] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const watchTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize and organize posts on mount or when posts change
  const refreshFeedList = useCallback((rawPosts: Post[]) => {
    const organized = organizeSmartFeed(rawPosts);
    setDisplayPosts(organized);
    setActiveIndex(0);
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

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

  if (!posts || posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 text-slate-400">
        <p className="text-lg font-semibold text-white">No videos available</p>
        <p className="text-sm mt-1">Check back soon for new public video posts!</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex flex-col items-center">
      {/* Floating Refresh Toast Notice */}
      {showRefreshToast && (
        <div className="absolute top-3 z-50 animate-bounce flex items-center gap-2 px-4 py-2 rounded-full bg-orange-600/90 dark:bg-orange-500/90 text-white font-semibold text-xs shadow-xl backdrop-blur-md border border-orange-400/30">
          <Sparkles className="w-4 h-4 text-amber-200 animate-spin" />
          <span>Feed Refreshed • Unwatched First</span>
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

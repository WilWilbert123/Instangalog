'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Post } from '@/types/post';
import { VideoCard } from './VideoCard';
import { CommentDrawer } from '@/components/comments/CommentDrawer';

interface VerticalFeedProps {
  posts: Post[];
}

export function VerticalFeed({ posts }: VerticalFeedProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollPosition = container.scrollTop;
      const height = container.clientHeight;
      const index = Math.round(scrollPosition / height);
      if (index !== activeIndex && index >= 0 && index < posts.length) {
        setActiveIndex(index);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [activeIndex, posts.length]);

  if (!posts || posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 text-slate-400">
        <p className="text-lg font-semibold text-white">No videos available</p>
        <p className="text-sm mt-1">Check back soon for new public video posts!</p>
      </div>
    );
  }

  return (
    <>
      <div
        ref={containerRef}
        className="fyp-feed-container w-full h-[calc(100dvh-8rem)] md:h-[calc(100vh-5rem)] overflow-y-auto snap-y snap-mandatory hide-scrollbar"
      >
        {posts.map((post, idx) => (
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
          onClose={() => setActiveCommentPostId(null)}
        />
      )}
    </>
  );
}

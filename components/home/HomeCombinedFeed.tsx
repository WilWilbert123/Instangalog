'use client';

import React from 'react';
import { Post } from '@/types/post';
import { VerticalFeed } from '@/components/fyp/VerticalFeed';
import { GlobalChatDrawer } from '@/components/chat/GlobalChatDrawer';

interface HomeCombinedFeedProps {
  posts: Post[];
}

export function HomeCombinedFeed({ posts }: HomeCombinedFeedProps) {
  return (
    <div className="w-full h-full">
      {/* Mobile View: Video Reel Feed Only */}
      <div className="lg:hidden w-full flex flex-col items-center justify-center">
        <VerticalFeed posts={posts} />
      </div>

      {/* Desktop Split View: Left = Realtime Global Chat, Right = FYP Videos */}
      <div className="hidden lg:grid grid-cols-12 gap-6 h-[calc(100vh-5rem)] max-w-[1600px] mx-auto items-stretch">
        {/* Left Side: Realtime Global Chat */}
        <div className="col-span-7 xl:col-span-7 h-full flex flex-col min-h-0">
          <GlobalChatDrawer simpleMode className="h-full max-w-none shadow-xl border border-slate-200 dark:border-slate-800" />
        </div>

        {/* Right Side: FYP Video Feed */}
        <div className="col-span-5 xl:col-span-5 h-full flex items-center justify-center min-h-0">
          <VerticalFeed posts={posts} />
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { Post } from '@/types/post';
import { getPendingPosts } from '@/lib/services/adminService';
import { VideoModerationCard } from '@/components/admin/VideoModerationCard';
import { Video, CheckCircle, Loader2 } from 'lucide-react';

export default function AdminVideosPage() {
  const [pendingPosts, setPendingPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refresh = async () => {
    setIsLoading(true);
    const data = await getPendingPosts();
    setPendingPosts(data);
    setIsLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="space-y-6 max-w-5xl mx-auto text-slate-900 dark:text-white">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Video className="w-5 h-5 text-amber-500" />
          <span>Pending Uploads Moderation Queue</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Review user uploaded video, audio, image, and text posts before public distribution
        </p>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          <p className="text-xs font-semibold">Loading live pending queue from Supabase...</p>
        </div>
      ) : pendingPosts.length === 0 ? (
        <div className="p-8 rounded-2xl glass-card border border-slate-200 dark:border-slate-800 text-center text-slate-500 space-y-2">
          <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Queue is clear!</p>
          <p className="text-xs text-slate-500">No pending content awaiting moderation.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pendingPosts.map((post) => (
            <VideoModerationCard key={post.id} post={post} onModerated={refresh} />
          ))}
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { Post } from '@/types/post';
import { getUserPendingPosts } from '@/lib/services/postService';
import { Clock, X, Film, Image as ImageIcon, Music as MusicIcon, MessageSquare, Loader2, AlertCircle } from 'lucide-react';

interface PendingPostsModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function PendingPostsModal({ userId, isOpen, onClose }: PendingPostsModalProps) {
  const [pendingPosts, setPendingPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen && userId) {
      setIsLoading(true);
      getUserPendingPosts(userId).then((posts) => {
        setPendingPosts(posts);
        setIsLoading(false);
      });
    }
  }, [isOpen, userId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-3xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">My Pending Uploads</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Content currently undergoing automated & Admin review</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-black dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {isLoading ? (
            <div className="py-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              <p className="text-xs font-semibold">Loading your pending posts...</p>
            </div>
          ) : pendingPosts.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <Clock className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
              <p className="text-sm font-semibold text-slate-900 dark:text-white">No pending posts</p>
              <p className="text-xs text-slate-500">All your uploaded content has been reviewed or published.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {pendingPosts.map((post) => (
                <div
                  key={post.id}
                  className="p-4 rounded-2xl glass-card border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 space-y-3 shadow-md flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Awaiting Review
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">ID: {post.id.slice(0, 6)}</span>
                    </div>

                    {/* Media Preview Box */}
                    {post.type === 'video' && post.video && (
                      <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black border border-slate-200 dark:border-slate-800">
                        {post.video.video_url.includes('youtube.com') || post.video.video_url.includes('youtu.be') ? (
                          <iframe
                            src={post.video.video_url}
                            title={post.caption || 'YouTube Video'}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="w-full h-full border-0"
                          />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={post.video.thumbnail_url} alt={post.caption} className="w-full h-full object-cover" />
                        )}
                      </div>
                    )}

                    {post.type === 'image' && post.image && (
                      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-black border border-slate-200 dark:border-slate-800">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={post.image.image_url} alt={post.caption} className="w-full h-full object-cover" />
                      </div>
                    )}

                    {post.type === 'music' && post.music && (
                      <div className="p-3 rounded-xl bg-slate-900 text-white flex items-center gap-3 border border-slate-800">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={post.music.cover_url} alt={post.music.title} className="w-10 h-10 rounded-lg object-cover" />
                        <div className="truncate text-xs">
                          <p className="font-bold truncate">{post.music.title}</p>
                          <p className="text-[10px] text-slate-400 truncate">{post.music.artist}</p>
                        </div>
                      </div>
                    )}

                    <p className="text-xs font-medium text-slate-800 dark:text-slate-200 line-clamp-2">{post.caption}</p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
                    <span>Uploaded {new Date(post.created_at).toLocaleDateString()}</span>
                    <span className="capitalize text-slate-500 font-bold">{post.type}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

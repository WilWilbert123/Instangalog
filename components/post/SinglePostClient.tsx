'use client';

import React, { useState } from 'react';
import { Post } from '@/types/post';
import { useAuthStore } from '@/stores/authStore';
import { togglePostLike } from '@/lib/services/postService';
import { getAvatarUrl, getCartoonAvatar } from '@/lib/utils/avatar';
import { parseMediaUrl } from '@/lib/utils/mediaEmbed';
import { FeedVideoPlayer } from '@/components/feed/FeedVideoPlayer';
import { MusicCard } from '@/components/music/MusicCard';
import { CommentDrawer } from '@/components/comments/CommentDrawer';
import { ReportModal } from '@/components/modals/ReportModal';
import { ReportTargetType } from '@/types/report';
import { Heart, MessageCircle, Share2, ShieldCheck, Calendar, Flag, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface SinglePostClientProps {
  initialPost: Post;
}

export function SinglePostClient({ initialPost }: SinglePostClientProps) {
  const router = useRouter();
  const { user, openAuthModal } = useAuthStore();
  const [post] = useState<Post>(initialPost);

  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<{ type: ReportTargetType; id: string; title?: string } | null>(null);

  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [likesCount, setLikesCount] = useState<number>(initialPost.likes_count || 0);

  const handleToggleLike = async () => {
    if (!user) {
      openAuthModal('Sign in to like posts');
      return;
    }

    const nextState = !isLiked;
    setIsLiked(nextState);
    setLikesCount((prev) => (nextState ? prev + 1 : Math.max(0, prev - 1)));

    await togglePostLike(post.id, user.id, isLiked);
  };

  const handleShare = () => {
    const shareUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/post/${post.id}`
      : `https://instangalog.online/post/${post.id}`;
    if (navigator.share) {
      navigator.share({ title: post.caption || 'Check out this post', url: shareUrl }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert('Link copied to clipboard!');
    }
  };

  const author = post.author || {
    display_name: 'Creator',
    username: 'creator',
    avatar_url: '',
    role: 'user',
  };

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </button>

      {post.type === 'music' ? (
        <MusicCard
          post={post}
          onOpenComments={(postId) => {
            if (!user) {
              openAuthModal('Sign in to comment');
              return;
            }
            setActiveCommentPostId(postId);
          }}
        />
      ) : (
        <div className="p-5 sm:p-6 rounded-3xl glass-card border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 text-slate-900 dark:text-white space-y-4 shadow-xl">
          {/* Author Info Bar */}
          <div className="flex items-center justify-between">
            <Link href={`/profile/${author.username}`} className="flex items-center gap-3 group/user">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-slate-300 dark:border-slate-700 overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getAvatarUrl(author.avatar_url, author.username || author.display_name)}
                  alt={author.display_name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = getCartoonAvatar(author.username || author.display_name);
                  }}
                />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover/user:underline flex items-center gap-1.5">
                  <span>{author.display_name}</span>
                  {author.role === 'admin' && (
                    <span className="p-0.5 rounded-full bg-black text-white dark:bg-white dark:text-black">
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </span>
                  )}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">@{author.username}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1 font-mono mt-0.5">
                  <Calendar className="w-2.5 h-2.5" />
                  {new Date(post.created_at).toLocaleDateString()}
                </p>
              </div>
            </Link>
          </div>

          {/* Caption Text */}
          {post.caption && (
            <p className="text-sm sm:text-base text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
              {post.caption}
            </p>
          )}

          {/* Media Container */}
          {post.type === 'video' && post.video && (
            <div className="mt-4 rounded-2xl overflow-hidden">
              <FeedVideoPlayer
                videoUrl={post.video.video_url}
                thumbnailUrl={post.video.thumbnail_url}
                caption={post.caption}
              />
            </div>
          )}

          {post.type === 'image' && post.image && (
            <div className="relative mt-4 rounded-2xl overflow-hidden bg-black border border-slate-200 dark:border-slate-800 max-h-[600px] flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.image.image_url}
                alt={post.caption}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          )}

          {/* Hashtags */}
          {post.hashtags && post.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {post.hashtags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 text-[11px] font-bold border border-slate-200 dark:border-slate-800"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Action Bar */}
          <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              <button
                onClick={handleToggleLike}
                className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  isLiked
                    ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                    : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-black dark:hover:text-white'
                }`}
              >
                <Heart className={`w-4 h-4 sm:w-5 sm:h-5 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
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
                className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-black dark:hover:text-white transition-all"
              >
                <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>{post.comments_count || 0}</span>
              </button>

              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-black dark:hover:text-white transition-all"
              >
                <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Share</span>
              </button>
            </div>

            <button
              onClick={() => setReportTarget({ type: post.type, id: post.id, title: post.caption })}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
              title="Report Content"
            >
              <Flag className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Drawers and Modals */}
      {activeCommentPostId && (
        <CommentDrawer
          postId={activeCommentPostId}
          onClose={() => setActiveCommentPostId(null)}
        />
      )}

      {reportTarget && (
        <ReportModal
          isOpen={Boolean(reportTarget)}
          onClose={() => setReportTarget(null)}
          targetType={reportTarget.type}
          targetId={reportTarget.id}
          targetTitle={reportTarget.title}
        />
      )}
    </div>
  );
}

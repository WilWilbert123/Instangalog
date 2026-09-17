'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Post } from '@/types/post';
import { useAuthStore } from '@/stores/authStore';
import { useModalStore } from '@/stores/modalStore';
import { togglePostLike } from '@/lib/services/postService';
import { Heart, MessageCircle, Share2, Music2, Play, Pause, Volume2, VolumeX, Eye, AlertCircle, Flag } from 'lucide-react';
import { getAvatarUrl, getCartoonAvatar } from '@/lib/utils/avatar';
import Link from 'next/link';
import { ReportModal } from '@/components/modals/ReportModal';

import { parseMediaUrl } from '@/lib/utils/mediaEmbed';
import { recordPostView } from '@/lib/services/viewService';
import { supabase } from '@/lib/supabase/client';

interface VideoCardProps {
  post: Post;
  isActive: boolean;
  onOpenComments: (postId: string) => void;
}

export function VideoCard({ post, isActive, onOpenComments }: VideoCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { user, openAuthModal } = useAuthStore();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [commentsCount, setCommentsCount] = useState(post.comments_count || 0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [hasVideoError, setHasVideoError] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    setLikesCount(post.likes_count || 0);
    setCommentsCount(post.comments_count || 0);
  }, [post.likes_count, post.comments_count]);

  useEffect(() => {
    if (!post?.id) return;
    const channelName = `realtime-videocard-${post.id}-${Math.random().toString(36).substring(2, 7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'posts',
          filter: `id=eq.${post.id}`,
        },
        (payload) => {
          const updated = payload.new as any;
          if (updated && typeof updated.comments_count === 'number') {
            setCommentsCount(updated.comments_count);
          }
          if (updated && typeof updated.likes_count === 'number') {
            setLikesCount(updated.likes_count);
          }
        }
      );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [post.id]);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsInView(entry.isIntersecting && entry.intersectionRatio >= 0.5);
        });
      },
      {
        threshold: [0, 0.5, 0.8, 1.0],
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const shouldPlay = isActive && isInView;

  const embedInfo = parseMediaUrl(post.video?.video_url || '', { autoplay: shouldPlay, mute: isMuted });
  const isEmbeddable = embedInfo.isEmbeddable;
  const embedSrc = embedInfo.embedUrl;

  useEffect(() => {
    if (shouldPlay && post?.id) {
      recordPostView(post.id, user?.id);
    }
  }, [shouldPlay, post?.id, user?.id]);

  useEffect(() => {
    if (!videoRef.current || hasVideoError || isEmbeddable) return;

    if (shouldPlay) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      }
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, [shouldPlay, hasVideoError, isEmbeddable]);

  const togglePlay = () => {
    if (!videoRef.current || hasVideoError || isEmbeddable) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const { showAlert } = useModalStore();

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      openAuthModal('Sign in to like videos');
      return;
    }
    if (user.status === 'suspended' || user.status === 'banned') {
      showAlert(`Your account is currently ${user.status}. You cannot like posts.`, 'Account Restricted', 'warning');
      return;
    }
    const nextState = !isLiked;
    setIsLiked(nextState);
    setLikesCount((prev) => (nextState ? prev + 1 : Math.max(0, prev - 1)));

    try {
      await togglePostLike(post.id, user.id, isLiked);
    } catch (err: any) {
      // Revert optimistic update if failed
      setIsLiked(isLiked);
      setLikesCount((prev) => (isLiked ? prev + 1 : Math.max(0, prev - 1)));
      showAlert(err?.message || 'Failed to like post.', 'Error', 'error');
    }
  };

  const handleFollow = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      openAuthModal('Sign in to follow creators');
      return;
    }
    setIsFollowing(!isFollowing);
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/post/${post.id}`
      : `https://instangalog.online/post/${post.id}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: post.caption || 'Check out this post on Instangalog',
          url: shareUrl,
        });
      } catch {
        // Fallback
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert('Link copied to clipboard!');
    }
  };

  const author = post.author || {
    display_name: 'Creator',
    username: 'creator',
    avatar_url: '',
  };

  return (
    <div ref={cardRef} className="relative w-full h-[calc(100dvh-8rem)] md:h-[calc(100vh-5rem)] max-w-lg mx-auto bg-black rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center group select-none">
      {/* Video Element or Embeddable iframe (YouTube, Facebook, TikTok, Instagram, etc.) or Error Poster Fallback */}
      {isEmbeddable ? (
        shouldPlay ? (
          <div className="relative w-full h-full bg-black flex items-center justify-center">
            <iframe
              src={embedSrc}
              title={post.caption || `${embedInfo.type} video`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="w-full h-full border-0 pointer-events-auto z-10"
            />
          </div>
        ) : (
          <div className="relative w-full h-full flex flex-col items-center justify-center bg-slate-900 text-center p-6 space-y-4">
            {(post.video?.thumbnail_url || embedInfo.thumbnailUrl) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={post.video?.thumbnail_url || embedInfo.thumbnailUrl || ''}
                alt={post.caption || 'Video preview'}
                className="absolute inset-0 w-full h-full object-cover opacity-60"
              />
            )}
            <div className="relative z-10 p-4 rounded-2xl bg-black/70 backdrop-blur-md border border-white/10 max-w-xs space-y-2">
              <div className="w-12 h-12 mx-auto rounded-full bg-white/20 text-white flex items-center justify-center border border-white/30 shadow-lg">
                <Play className="w-6 h-6 fill-white translate-x-0.5" />
              </div>
              <p className="text-xs font-bold text-white">Tap to Play</p>
            </div>
          </div>
        )
      ) : !hasVideoError && post.video?.video_url ? (
        <video
          ref={videoRef}
          src={post.video.video_url}
          poster={post.video.thumbnail_url}
          loop
          playsInline
          muted={isMuted}
          onClick={togglePlay}
          onError={() => setHasVideoError(true)}
          className="w-full h-full object-cover cursor-pointer"
        />
      ) : (
        <div className="relative w-full h-full flex flex-col items-center justify-center bg-slate-900 text-center p-6 space-y-4">
          {post.video?.thumbnail_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.video.thumbnail_url}
              alt={post.caption}
              className="absolute inset-0 w-full h-full object-cover opacity-40 blur-sm"
            />
          )}
          <div className="relative z-10 p-4 rounded-2xl bg-black/70 backdrop-blur-md border border-white/10 max-w-xs space-y-2">
            <div className="w-10 h-10 mx-auto rounded-full bg-white/10 text-white flex items-center justify-center border border-white/20">
              <Play className="w-5 h-5 fill-white" />
            </div>
            <h4 className="text-xs font-bold text-white">Media Preview</h4>
            <p className="text-[11px] text-slate-300 line-clamp-2">{post.caption}</p>
          </div>
        </div>
      )}

      {/* Play/Pause Overlay indicator for native HTML5 video */}
      {!isEmbeddable && !isPlaying && !hasVideoError && (
        <div
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-auto cursor-pointer z-10"
        >
          <div className="w-16 h-16 rounded-full bg-slate-900/80 backdrop-blur-md flex items-center justify-center border border-white/20 text-white shadow-2xl">
            <Play className="w-8 h-8 fill-white translate-x-0.5" />
          </div>
        </div>
      )}

      {/* Persistent Floating Sound Toggle for uploaded HTML5 videos */}
      {!isEmbeddable && !hasVideoError && (
        <button
          onClick={toggleMute}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 sm:p-2.5 rounded-full bg-slate-900/80 backdrop-blur-md text-white border border-white/20 hover:bg-black transition-all z-30 shadow-xl active:scale-95 flex items-center justify-center pointer-events-auto"
          aria-label={isMuted ? 'Unmute video' : 'Mute video'}
          title={isMuted ? 'Click to unmute' : 'Click to mute'}
        >
          {isMuted ? <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-white" /> : <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />}
        </button>
      )}
      <div className="absolute bottom-0 left-0 right-16 p-4 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10 space-y-3 pointer-events-none">
        {/* Creator Info */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <Link href={`/profile/${author.username}`} className="flex items-center gap-2.5 group/user">
            <div className="w-10 h-10 rounded-full border-2 border-white overflow-hidden bg-slate-800 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getAvatarUrl(author.avatar_url, author.username || author.display_name)}
                alt={author.display_name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = getCartoonAvatar(author.username || author.display_name);
                }}
              />
            </div>
            <div>
              <p className="text-sm font-bold text-white group-hover/user:underline">{author.display_name}</p>
              <p className="text-xs text-slate-300">@{author.username}</p>
            </div>
          </Link>
          <button
            onClick={handleFollow}
            className={`px-3 py-1 text-xs font-bold rounded-full transition-all ${isFollowing
              ? 'bg-slate-800 text-slate-300 border border-slate-700'
              : 'bg-white text-black hover:bg-slate-200 shadow-md'
              }`}
          >
            {isFollowing ? 'Following' : 'Follow'}
          </button>
        </div>

        {/* Caption */}
        <p className="text-sm text-slate-100 font-normal leading-snug line-clamp-3">{post.caption}</p>

        {/* Hashtags */}
        {post.hashtags && post.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {post.hashtags.map((tag) => (
              <span key={tag} className="text-xs font-medium text-slate-300">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Music Sound Ticker */}
        <div className="flex items-center gap-2 text-xs text-slate-300 pt-1">
          <Music2 className="w-3.5 h-3.5 text-white animate-spin" style={{ animationDuration: '4s' }} />
          <span className="truncate">Original Sound - {author.display_name}</span>
        </div>
      </div>

      {/* Right Side Action Drawer (Like Box for YouTube & Direct Videos) */}
      <div className="absolute right-2 sm:right-3 bottom-4 sm:bottom-8 z-30 flex flex-col items-center gap-3 sm:gap-5 pointer-events-auto">
        {/* Like Box */}
        <div className="flex flex-col items-center gap-0.5 sm:gap-1 group/like">
          <button
            onClick={handleLike}
            className={`p-2 sm:p-3.5 rounded-full backdrop-blur-md border shadow-xl transition-all active:scale-125 ${isLiked
              ? 'bg-red-600 text-white border-red-500 shadow-red-500/50'
              : 'bg-slate-900/80 text-white border-white/20 hover:bg-black'
              }`}
            aria-label="Like post"
          >
            <Heart className={`w-4 h-4 sm:w-6 sm:h-6 ${isLiked ? 'fill-white text-white' : 'text-white'}`} />
          </button>
          <span className="text-[9px] sm:text-xs font-black text-white drop-shadow-md bg-black/60 px-1.5 sm:px-2 py-0.5 rounded-full border border-white/10">
            {likesCount.toLocaleString()}
          </span>
        </div>

        {/* Comment Button */}
        <div className="flex flex-col items-center gap-0.5 sm:gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!user) {
                openAuthModal('Sign in to view and post comments');
                return;
              }
              onOpenComments(post.id);
            }}
            className="p-2 sm:p-3.5 rounded-full bg-slate-900/80 backdrop-blur-md text-white border border-white/20 hover:bg-black transition-colors shadow-lg"
            aria-label="View comments"
          >
            <MessageCircle className="w-4 h-4 sm:w-6 sm:h-6" />
          </button>
          <span className="text-[9px] sm:text-xs font-black text-white drop-shadow-md bg-black/60 px-1.5 sm:px-2 py-0.5 rounded-full border border-white/10">
            {commentsCount.toLocaleString()}
          </span>
        </div>

        {/* Share Button */}
        <div className="flex flex-col items-center gap-0.5 sm:gap-1">
          <button
            onClick={handleShare}
            className="p-2 sm:p-3.5 rounded-full bg-slate-900/80 backdrop-blur-md text-white border border-white/20 hover:bg-black transition-colors shadow-lg"
            aria-label="Share video"
          >
            <Share2 className="w-4 h-4 sm:w-6 sm:h-6" />
          </button>
          <span className="text-[9px] sm:text-xs font-black text-white drop-shadow-md bg-black/60 px-1.5 sm:px-2 py-0.5 rounded-full border border-white/10">
            {post.shares_count.toLocaleString()}
          </span>
        </div>

        {/* Report Button */}
        <div className="flex flex-col items-center gap-0.5 sm:gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowReportModal(true);
            }}
            className="p-2 sm:p-3.5 rounded-full bg-slate-900/80 backdrop-blur-md text-white border border-white/20 hover:bg-rose-600 transition-colors shadow-lg"
            aria-label="Report video"
            title="Report Video"
          >
            <Flag className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* View Count */}
        <div className="flex flex-col items-center gap-0.5 sm:gap-1 opacity-80">
          <div className="p-1.5 sm:p-2.5 rounded-full bg-slate-900/60 text-slate-300 border border-white/10">
            <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
          </div>
          <span className="text-[9px] sm:text-[10px] font-bold text-white drop-shadow-md">{post.views_count.toLocaleString()}</span>
        </div>
      </div>

      {/* Report Video Modal */}
      {showReportModal && (
        <ReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          targetType="video"
          targetId={post.id}
          targetTitle={post.caption}
        />
      )}
    </div>
  );
}

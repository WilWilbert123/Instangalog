'use client';

import React, { useState } from 'react';
import { Post } from '@/types/post';
import { usePlayerStore } from '@/stores/playerStore';
import { useAuthStore } from '@/stores/authStore';
import { useModalStore } from '@/stores/modalStore';
import { togglePostLike } from '@/lib/services/postService';
import { parseMediaUrl } from '@/lib/utils/mediaEmbed';
import { Play, Pause, Heart, MessageCircle, Share2, Disc, ShieldCheck, Edit3, Lock } from 'lucide-react';
import Link from 'next/link';

interface MusicCardProps {
  post: Post;
  onOpenComments?: (postId: string) => void;
  onEdit?: (post: Post) => void;
}

export function MusicCard({ post, onOpenComments, onEdit }: MusicCardProps) {
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayerStore();
  const { user, openAuthModal } = useAuthStore();
  const music = post.music;

  const SUPER_ADMIN_EMAIL = 'johnwilbertgamis2022@gmail.com';
  const canEdit = Boolean(
    user && (
      user.id === post.user_id ||
      user.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()
    )
  );

  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);

  if (!music) return null;

  const yt = parseMediaUrl(music.audio_url || '');
  const isYouTube = yt.type === 'youtube';
  const coverImage = music.cover_url || (yt.thumbnailUrl ? yt.thumbnailUrl : 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=600&auto=format&fit=crop&q=80');

  const isCurrentTrack = currentTrack?.audio_url === music.audio_url;

  const handlePlayClick = () => {
    if (isCurrentTrack) {
      togglePlay();
    } else {
      playTrack({
        ...music,
        cover_url: coverImage,
      });
    }
  };

  const { showAlert } = useModalStore();

  const handleLike = async () => {
    if (!user) {
      openAuthModal('Sign in to like tracks');
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
      setIsLiked(isLiked);
      setLikesCount((prev) => (isLiked ? prev + 1 : Math.max(0, prev - 1)));
      showAlert(err?.message || 'Failed to like post.', 'Error', 'error');
    }
  };

  const handleShare = () => {
    const shareUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/post/${post.id}`
      : `https://instangalog.online/post/${post.id}`;
    if (navigator.share) {
      navigator.share({ title: music.title, url: shareUrl }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert('Track link copied to clipboard!');
    }
  };

  const author = post.author || {
    display_name: music.artist,
    username: 'artist',
    avatar_url: '',
    role: 'user',
  };

  return (
    <div className="p-5 rounded-3xl glass-card border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 text-slate-900 dark:text-white space-y-4 shadow-xl hover:shadow-2xl transition-all relative overflow-hidden">
      {/* Hidden YouTube Iframe Player (Hides Video Box Completely, Only Audio Plays) */}
      {isYouTube && isCurrentTrack && isPlaying && yt.embedUrl && (
        <iframe
          src={yt.embedUrl.replace('mute=1', 'mute=0') + '&controls=0'}
          allow="autoplay; encrypted-media"
          title={music.title}
          className="w-0 h-0 opacity-0 pointer-events-none absolute -top-9999 -left-9999 invisible"
        />
      )}

      {/* Header Profile */}
      <div className="flex items-center justify-between">
        <Link href={`/profile/${author.username}`} className="flex items-center gap-3 group/user">
          <div className="w-10 h-10 rounded-full border border-slate-300 dark:border-slate-700 overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={author.avatar_url || coverImage} alt={author.display_name} className="w-full h-full object-cover" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover/user:underline flex items-center gap-1.5">
              <span>{author.display_name}</span>
              {author.role === 'admin' && (
                <span className="p-0.5 rounded-full bg-black text-white dark:bg-white dark:text-black">
                  <ShieldCheck className="w-3 h-3" />
                </span>
              )}
            </h4>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">@{author.username}</p>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          {post.visibility === 'private' && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px] font-bold flex items-center gap-1">
              <Lock className="w-3 h-3" />
              <span>Only Me</span>
            </span>
          )}
          {canEdit && onEdit && (
            <button
              type="button"
              onClick={() => onEdit(post)}
              className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-amber-500 transition-colors"
              title="Edit or Delete Track"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          )}
          <span className="px-3 py-1 text-[10px] font-bold rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            {music.genre || 'Music Audio'}
          </span>
        </div>
      </div>

      {/* Music Box / Vinyl Track Player Card */}
      <div className="relative flex items-center gap-4 p-3.5 rounded-2xl bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 overflow-hidden group">
        <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-slate-300 dark:border-slate-700 shadow-md">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={coverImage} alt={music.title} className="w-full h-full object-cover" />
          <button
            onClick={handlePlayClick}
            className="absolute inset-0 bg-black/40 group-hover:bg-black/60 flex items-center justify-center transition-colors cursor-pointer z-10"
            aria-label={isCurrentTrack && isPlaying ? 'Pause track' : 'Play track'}
          >
            <div className="w-10 h-10 rounded-full bg-black text-white dark:bg-white dark:text-black flex items-center justify-center shadow-lg transform group-hover:scale-105 transition-transform">
              {isCurrentTrack && isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current translate-x-0.5" />
              )}
            </div>
          </button>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">{music.title}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{music.artist} {music.album ? `• ${music.album}` : ''}</p>
          <div className="flex items-center gap-2 mt-2 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
            <Disc className={`w-4 h-4 text-amber-500 ${isCurrentTrack && isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
            <span>{isCurrentTrack && isPlaying ? 'Playing Audio...' : 'Click to Play'}</span>
          </div>
        </div>
      </div>

      {/* Caption */}
      {post.caption && (
        <p className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-relaxed">{post.caption}</p>
      )}

      {/* Action Bar */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800/80 text-xs">
        <div className="flex items-center gap-4">
          <button
            onClick={handleLike}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all ${
              isLiked
                ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-black dark:hover:text-white'
            }`}
          >
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
            <span>{likesCount}</span>
          </button>
          <button
            onClick={() => onOpenComments?.(post.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-black dark:hover:text-white transition-all"
          >
            <MessageCircle className="w-4 h-4" />
            <span>{post.comments_count || 0}</span>
          </button>
        </div>
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-black dark:hover:text-white transition-all"
        >
          <Share2 className="w-4 h-4" />
          <span>Share</span>
        </button>
      </div>
    </div>
  );
}


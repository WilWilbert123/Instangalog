'use client';

import React, { useState, useRef } from 'react';
import { Post } from '@/types/post';
import { approvePost, rejectPost } from '@/lib/services/adminService';
import { useAuthStore } from '@/stores/authStore';
import { getAvatarUrl, getCartoonAvatar } from '@/lib/utils/avatar';
import {
  Check,
  X,
  User,
  Calendar,
  Play,
  Pause,
  Maximize2,
  Volume2,
  VolumeX,
  Film,
  Image as ImageIcon,
  Music as MusicIcon,
  MessageSquare,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

interface VideoModerationCardProps {
  post: Post;
  onModerated: () => void;
}

export function VideoModerationCard({ post, onModerated }: VideoModerationCardProps) {
  const { user } = useAuthStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const modalVideoRef = useRef<HTMLVideoElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [hasVideoError, setHasVideoError] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const author = post.author || {
    display_name: 'User',
    username: 'user',
    avatar_url: '',
  };

  const handleTogglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setHasVideoError(true));
    }
  };

  const handleToggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleApprove = async () => {
    if (!user) return;
    setIsProcessing(true);
    await approvePost(post.id, user.id);
    setIsProcessing(false);
    onModerated();
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !rejectReason.trim()) return;
    setIsProcessing(true);
    await rejectPost(post.id, user.id, rejectReason.trim());
    setIsProcessing(false);
    onModerated();
  };

  const setQuickReason = (reason: string) => {
    setRejectReason(reason);
  };

  return (
    <>
      <div className="p-4 rounded-2xl glass-card border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/80 text-slate-900 dark:text-white space-y-4 shadow-xl flex flex-col justify-between">
        <div className="space-y-3">
          {/* Media Header Tag & User Info */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-300 dark:border-slate-700 shrink-0 bg-slate-100 dark:bg-slate-800">
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
              <div className="truncate">
                <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                  {author.display_name}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                  @{author.username}
                </span>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] font-bold tracking-wider uppercase shrink-0">
              Awaiting Approval
            </span>
          </div>

          {/* Media Player Container */}
          <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-200 dark:border-slate-800 group shadow-inner">
            {/* VIDEO POST */}
            {post.type === 'video' && post.video && (
              <>
                {post.video.video_url.includes('youtube.com') || post.video.video_url.includes('youtu.be') ? (
                  <iframe
                    src={post.video.video_url}
                    title={post.caption || 'YouTube Video'}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                ) : !hasVideoError ? (
                  <video
                    ref={videoRef}
                    src={post.video.video_url}
                    poster={post.video.thumbnail_url}
                    controls
                    playsInline
                    preload="metadata"
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onError={() => setHasVideoError(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="relative w-full h-full flex flex-col items-center justify-center p-4 text-center bg-slate-900 text-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={post.video.thumbnail_url}
                      alt={post.caption}
                      className="absolute inset-0 w-full h-full object-cover opacity-30"
                    />
                    <div className="relative z-10 space-y-2">
                      <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
                      <p className="text-xs font-bold">Video Preview Stream</p>
                      <a
                        href={post.video.video_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block px-3 py-1.5 text-[11px] font-bold rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-md text-white border border-white/20 transition-colors"
                      >
                        Open Direct Video Link ↗
                      </a>
                    </div>
                  </div>
                )}

                {/* Overlays */}
                <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                  <button
                    onClick={() => setIsPreviewOpen(true)}
                    className="p-1.5 rounded-lg bg-black/70 hover:bg-black text-white text-xs font-bold flex items-center gap-1 backdrop-blur-md transition-colors"
                    title="Fullscreen Preview"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Expand</span>
                  </button>
                </div>
              </>
            )}

            {/* IMAGE POST */}
            {post.type === 'image' && post.image && (
              <div className="relative w-full h-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={post.image.image_url}
                  alt={post.caption}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => setIsPreviewOpen(true)}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 hover:bg-black text-white text-xs font-bold flex items-center gap-1 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Zoom</span>
                </button>
              </div>
            )}

            {/* MUSIC POST */}
            {post.type === 'music' && post.music && (
              <div className="relative w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-indigo-900 via-slate-900 to-black text-white space-y-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={post.music.cover_url}
                  alt={post.music.title}
                  className="w-16 h-16 rounded-xl object-cover border border-white/20 shadow-lg"
                />
                <div>
                  <h4 className="text-xs font-bold truncate max-w-[200px]">{post.music.title}</h4>
                  <p className="text-[10px] text-slate-300 truncate">{post.music.artist}</p>
                </div>
                <audio src={post.music.audio_url} controls className="w-full max-w-[240px] h-8 text-xs" />
              </div>
            )}

            {/* STATUS POST */}
            {post.type === 'status' && (
              <div className="w-full h-full p-4 flex flex-col items-center justify-center text-center bg-slate-900 text-slate-100 space-y-2">
                <MessageSquare className="w-8 h-8 text-slate-400" />
                <p className="text-xs font-medium italic line-clamp-3">&ldquo;{post.caption}&rdquo;</p>
              </div>
            )}

            {/* Media Type Badge */}
            <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/70 text-white text-[10px] font-bold flex items-center gap-1 backdrop-blur-md">
              {post.type === 'video' && <Film className="w-3 h-3 text-amber-400" />}
              {post.type === 'image' && <ImageIcon className="w-3 h-3 text-emerald-400" />}
              {post.type === 'music' && <MusicIcon className="w-3 h-3 text-cyan-400" />}
              {post.type === 'status' && <MessageSquare className="w-3 h-3 text-purple-400" />}
              <span className="capitalize">{post.type}</span>
            </span>
          </div>

          {/* Caption & Metadata */}
          <div className="space-y-1">
            <p className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
              {post.caption}
            </p>
            <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-1">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(post.created_at).toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <span>ID: {post.id.slice(0, 8)}...</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
          {!showRejectForm ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleApprove}
                disabled={isProcessing}
                className="flex-1 py-2.5 rounded-xl bg-black text-white dark:bg-white dark:text-black font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 text-emerald-500" />}
                <span>Approve & Publish</span>
              </button>
              <button
                onClick={() => setShowRejectForm(true)}
                disabled={isProcessing}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-800 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              >
                <X className="w-4 h-4 text-red-500" />
                <span>Reject Content</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleReject} className="space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  Select Rejection Reason:
                </span>
                <button
                  type="button"
                  onClick={() => setShowRejectForm(false)}
                  className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline font-semibold"
                >
                  Cancel
                </button>
              </div>

              {/* Quick tags */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Inappropriate Content',
                  'Copyright Violation',
                  'Low Quality Video',
                  'Community Standards',
                ].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setQuickReason(tag)}
                    className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors border border-slate-200 dark:border-slate-700"
                  >
                    {tag}
                  </button>
                ))}
              </div>

              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={2}
                placeholder="Details for creator rejection notification..."
                required
                className="w-full p-2.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-black dark:focus:border-white transition-colors"
              />

              <button
                type="submit"
                disabled={isProcessing || !rejectReason.trim()}
                className="w-full py-2.5 text-xs font-bold rounded-xl bg-black text-white dark:bg-white dark:text-black hover:opacity-90 shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4 text-red-500" />}
                <span>Confirm Rejection</span>
              </button>
            </form>
          )}
        </div>
      </div>

      {/* FULLSCREEN / EXPANDED MEDIA PREVIEW MODAL */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl bg-slate-950 border border-slate-800 text-white shadow-2xl space-y-4 p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-700 bg-slate-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getAvatarUrl(author.avatar_url, author.username || author.display_name)}
                    alt={author.display_name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{author.display_name}</h3>
                  <p className="text-xs text-slate-400">@{author.username}</p>
                </div>
              </div>
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Player */}
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black flex items-center justify-center border border-slate-800">
              {post.type === 'video' && post.video && (
                post.video.video_url.includes('youtube.com') || post.video.video_url.includes('youtu.be') ? (
                  <iframe
                    src={post.video.video_url}
                    title={post.caption || 'YouTube Video'}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                ) : (
                  <video
                    ref={modalVideoRef}
                    src={post.video.video_url}
                    poster={post.video.thumbnail_url}
                    controls
                    autoPlay
                    playsInline
                    className="w-full h-full object-contain"
                  />
                )
              )}

              {post.type === 'image' && post.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.image.image_url}
                  alt={post.caption}
                  className="w-full h-full object-contain"
                />
              )}

              {post.type === 'music' && post.music && (
                <div className="p-8 text-center space-y-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={post.music.cover_url}
                    alt={post.music.title}
                    className="w-32 h-32 rounded-2xl object-cover mx-auto shadow-2xl border border-white/20"
                  />
                  <div>
                    <h4 className="text-base font-bold text-white">{post.music.title}</h4>
                    <p className="text-xs text-slate-400">{post.music.artist}</p>
                  </div>
                  <audio src={post.music.audio_url} controls autoPlay className="w-full max-w-md mx-auto" />
                </div>
              )}
            </div>

            <div className="space-y-2 pt-2">
              <p className="text-xs text-slate-200 leading-relaxed font-medium">{post.caption}</p>
              <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800 pt-3">
                <span>Submitted: {new Date(post.created_at).toLocaleString()}</span>
                <span className="capitalize font-bold text-amber-400">Status: {post.moderation_status}</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  handleApprove();
                  setIsPreviewOpen(false);
                }}
                className="flex-1 py-3 rounded-xl bg-white text-black font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors shadow-lg"
              >
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Approve & Publish Content</span>
              </button>
              <button
                onClick={() => {
                  setIsPreviewOpen(false);
                  setShowRejectForm(true);
                }}
                className="flex-1 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4 text-red-400" />
                <span>Reject Content</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


'use client';

import React, { useState, useRef } from 'react';
import { Post, PostType } from '@/types/post';
import { useAuthStore } from '@/stores/authStore';
import { createPost, togglePostLike } from '@/lib/services/postService';
import { getAvatarUrl, getCartoonAvatar } from '@/lib/utils/avatar';
import { parseMediaUrl } from '@/lib/utils/mediaEmbed';
import { uploadMediaToCloudinary } from '@/lib/services/cloudinary';
import { CommentDrawer } from '@/components/comments/CommentDrawer';
import { MusicCard } from '@/components/music/MusicCard';
import { FeedVideoPlayer } from '@/components/feed/FeedVideoPlayer';
import { ReportModal } from '@/components/modals/ReportModal';
import { ReportTargetType } from '@/types/report';
import {
  Users,
  Video,
  Image as ImageIcon,
  Music,
  Type,
  Send,
  Heart,
  MessageCircle,
  Share2,
  CheckCircle2,
  Clock,
  Sparkles,
  Loader2,
  Film,
  MessageSquare,
  ShieldCheck,
  Calendar,
  Grid,
  Flag,
  Upload,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface FollowingFeedClientProps {
  initialPosts: Post[];
}

export function FollowingFeedClient({ initialPosts }: FollowingFeedClientProps) {
  const searchParams = useSearchParams();
  const searchQueryParam = searchParams.get('q') || '';

  const { user, openAuthModal } = useAuthStore();
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [activeFilter, setActiveFilter] = useState<'all' | PostType>('all');

  // Quick Post State
  const [postType, setPostType] = useState<PostType>('status');
  const [caption, setCaption] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessNotice, setShowSuccessNotice] = useState(false);
  const [lastSubmittedType, setLastSubmittedType] = useState<PostType>('status');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active Comment Drawer & Report Modal
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<{ type: ReportTargetType; id: string; title?: string } | null>(null);

  // Likes tracking
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [likesCountMap, setLikesCountMap] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    initialPosts.forEach((p) => {
      initial[p.id] = p.likes_count || 0;
    });
    return initial;
  });

  const handleToggleLike = async (postId: string) => {
    if (!user) {
      openAuthModal('Sign in to like posts');
      return;
    }

    const currentlyLiked = Boolean(likedMap[postId]);
    const nextState = !currentlyLiked;

    setLikedMap((prev) => ({ ...prev, [postId]: nextState }));
    setLikesCountMap((prev) => ({
      ...prev,
      [postId]: nextState
        ? (prev[postId] || 0) + 1
        : Math.max(0, (prev[postId] || 1) - 1),
    }));

    await togglePostLike(postId, user.id, currentlyLiked);
  };

  const handleShare = (postId: string, captionText: string) => {
    const shareUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/post/${postId}`
      : `https://instangalog.online/post/${postId}`;
    if (navigator.share) {
      navigator.share({ title: captionText, url: shareUrl }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert('Link copied to clipboard!');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

    if (file.size > MAX_VIDEO_SIZE) {
      alert('The video MB are too big, make it less than 100MB.');
      e.target.value = '';
      return;
    }

    setSelectedFile(file);
    setMediaUrl(''); // Clear URL if local file is selected
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleQuickPublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      openAuthModal('Sign in to publish posts');
      return;
    }

    if (!caption.trim() && !mediaUrl.trim() && !selectedFile) {
      alert('Please write a caption or provide a media file/URL.');
      return;
    }

    setIsSubmitting(true);
    setLastSubmittedType(postType);
    let finalMediaUrl = mediaUrl.trim();
    let finalThumbnailUrl = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80';
    let mediaDuration = 15;

    try {
      if (selectedFile) {
        setUploadProgress(0);
        const resourceType = postType === 'video' ? 'video' : postType === 'image' ? 'image' : 'auto';
        const uploadRes = await uploadMediaToCloudinary(selectedFile, resourceType, (progress) => {
          setUploadProgress(progress);
        });

        finalMediaUrl = uploadRes.url;
        if (uploadRes.thumbnailUrl) {
          finalThumbnailUrl = uploadRes.thumbnailUrl;
        }
        if (uploadRes.duration) {
          mediaDuration = Math.round(uploadRes.duration);
        }
      } else if (postType === 'video' && finalMediaUrl) {
        const media = parseMediaUrl(finalMediaUrl);
        if (media.embedUrl) {
          finalMediaUrl = media.embedUrl;
          if (media.thumbnailUrl) {
            finalThumbnailUrl = media.thumbnailUrl;
          }
        }
      }

      const hashtagList = hashtags
        .split(',')
        .map((t) => t.trim().replace(/^#/, ''))
        .filter(Boolean);

      const created = await createPost({
        user_id: user.id,
        type: postType,
        caption: caption.trim(),
        hashtags: hashtagList,
        visibility: 'public',
        author: {
          id: user.id,
          username: user.username,
          display_name: user.display_name,
          avatar_url: user.avatar_url,
          role: user.role,
          status: user.status,
          followers_count: 0,
          following_count: 0,
          posts_count: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        video:
          postType === 'video'
            ? {
                video_url: finalMediaUrl,
                thumbnail_url: finalThumbnailUrl,
                duration: mediaDuration,
              }
            : undefined,
        image:
          postType === 'image'
            ? {
                image_url: finalMediaUrl || 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=1000&auto=format&fit=crop&q=80',
              }
            : undefined,
        music:
          postType === 'music'
            ? (() => {
                const media = parseMediaUrl(finalMediaUrl);
                return {
                  audio_url: media.embedUrl || finalMediaUrl || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
                  cover_url: media.thumbnailUrl || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=600&auto=format&fit=crop&q=80',
                  title: caption.trim() || selectedFile?.name || 'New Track',
                  artist: user.display_name,
                  genre: 'Music Audio',
                  duration: mediaDuration || 180,
                };
              })()
            : undefined,
        status:
          postType === 'status'
            ? {
                text: caption.trim(),
              }
            : undefined,
      });

      if (created) {
        if (created.moderation_status === 'approved') {
          setPosts((prev) => [created, ...prev]);
        }
        setCaption('');
        setMediaUrl('');
        setHashtags('');
        clearSelectedFile();
        setShowSuccessNotice(true);
        setTimeout(() => setShowSuccessNotice(false), 7000);
      }
    } catch (err: any) {
      alert(err?.message || 'Error creating post.');
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  const filteredPosts = posts.filter((p) => {
    const matchesType = activeFilter === 'all' || p.type === activeFilter;
    if (!matchesType) return false;
    if (!searchQueryParam.trim()) return true;
    const q = searchQueryParam.toLowerCase();
    const caption = (p.caption || '').toLowerCase();
    const authorName = (p.author?.display_name || '').toLowerCase();
    const username = (p.author?.username || '').toLowerCase();
    return caption.includes(q) || authorName.includes(q) || username.includes(q);
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6 text-slate-900 dark:text-white pb-12">
      {/* Search Query Active Indicator */}
      {searchQueryParam && (
        <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between gap-3 shadow-md">
          <span>Showing search results for &quot;<strong className="text-slate-900 dark:text-white">{searchQueryParam}</strong>&quot; ({filteredPosts.length} matches)</span>
          <Link href="/following" className="text-xs font-bold text-rose-500 hover:underline shrink-0">Clear Search</Link>
        </div>
      )}

      {/* Quick Status / Post Creator Box */}
      <form onSubmit={handleQuickPublish} className="p-5 rounded-3xl glass-card border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 text-slate-900 dark:text-white shadow-xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full border border-slate-300 dark:border-slate-700 overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getAvatarUrl(user?.avatar_url, user?.username || user?.display_name || 'user')}
                alt={user?.display_name || 'User'}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = getCartoonAvatar(user?.username || 'user');
                }}
              />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {user ? `What's on your mind, ${user.display_name}?` : 'Share a post or status...'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Publish video, image, music, or status directly to the feed
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-black text-white dark:bg-white dark:text-black hover:opacity-90 active:scale-95 transition-all shadow-md flex items-center gap-1.5 shrink-0"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {uploadProgress !== null && <span>{uploadProgress}%</span>}
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Publish</span>
              </>
            )}
          </button>
        </div>

        {/* Post Type Selector */}
        <div className="grid grid-cols-4 gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          {[
            { type: 'status', label: 'Status', icon: Type },
            { type: 'video', label: 'Video / YT', icon: Video },
            { type: 'image', label: 'Image', icon: ImageIcon },
            { type: 'music', label: 'Music', icon: Music },
          ].map(({ type, label, icon: Icon }) => (
            <button
              key={type}
              type="button"
              onClick={() => {
                setPostType(type as PostType);
                clearSelectedFile();
              }}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
                postType === type
                  ? 'bg-black text-white dark:bg-white dark:text-black shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={2}
            placeholder={
              postType === 'video'
                ? 'Write a caption or description for your video...'
                : postType === 'image'
                ? 'Write a caption for your image...'
                : postType === 'music'
                ? 'Write a title or thoughts about this track...'
                : "What's happening today?"
            }
            className="w-full p-3 text-xs rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-black dark:focus:border-white transition-colors"
          />

          {postType !== 'status' && (
            <div className="space-y-2">
              {/* File Upload Button & Status */}
              <input
                ref={fileInputRef}
                type="file"
                accept={
                  postType === 'video'
                    ? 'video/*'
                    : postType === 'image'
                    ? 'image/*'
                    : 'audio/*,video/*'
                }
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-200/80 dark:bg-slate-800/80 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors flex items-center gap-2 shrink-0 border border-slate-300/50 dark:border-slate-700/50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload from Device</span>
                </button>

                <span className="text-[11px] text-slate-500 dark:text-slate-400">or paste URL below</span>
              </div>

              {selectedFile && (
                <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                    <span className="truncate font-medium">{selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(1)} MB)</span>
                  </div>
                  <button
                    type="button"
                    onClick={clearSelectedFile}
                    className="p-1 rounded-md hover:bg-emerald-500/20 text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-300 shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {!selectedFile && (
                <input
                  type="url"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  placeholder={
                    postType === 'video'
                      ? 'Paste YouTube URL (e.g. https://youtu.be/...) or Video URL'
                      : postType === 'music'
                      ? 'Paste YouTube URL (e.g. https://youtu.be/...) or Audio URL'
                      : 'Paste Direct Image URL'
                  }
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-black dark:focus:border-white"
                />
              )}
            </div>
          )}
        </div>


        {showSuccessNotice && (
          lastSubmittedType === 'video' ? (
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs flex items-center gap-2 animate-in fade-in duration-200">
              <Clock className="w-4 h-4 shrink-0 text-amber-500" />
              <span>Submitted for Admin Moderation! Your video post is in the review queue and will appear live on the feed once approved by an Admin.</span>
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>Published Live! Your post is now live on the feed.</span>
            </div>
          )
        )}
      </form>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 hide-scrollbar">
        {[
          { key: 'all', label: 'All Feed', icon: Grid },
          { key: 'video', label: 'Videos & YT', icon: Video },
          { key: 'image', label: 'Images', icon: ImageIcon },
          { key: 'music', label: 'Music', icon: Music },
          { key: 'status', label: 'Statuses', icon: Type },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveFilter(key as any)}
            className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 border ${
              activeFilter === key
                ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-md'
                : 'bg-white/80 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-black dark:hover:text-white'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Posts List */}
      <div className="space-y-4">
        {filteredPosts.length === 0 ? (
          <div className="p-12 rounded-3xl glass-card border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-950/60 text-center space-y-2">
            <Users className="w-10 h-10 text-slate-400 mx-auto" />
            <p className="text-sm font-semibold text-slate-900 dark:text-white">No posts in this category yet</p>
            <p className="text-xs text-slate-500">Check back soon or follow more creators!</p>
          </div>
        ) : (
          filteredPosts.map((post) => {
            const author = post.author || {
              display_name: 'Creator',
              username: 'creator',
              avatar_url: '',
              role: 'user',
            };

            const ytInfo = post.video?.video_url ? parseMediaUrl(post.video.video_url, { autoplay: true, mute: true }) : { isEmbeddable: false, embedUrl: null };
            const isYouTube = ytInfo.isEmbeddable || Boolean(post.video?.video_url?.includes('youtube.com') || post.video?.video_url?.includes('youtu.be'));
            const youtubeSrc = ytInfo.embedUrl || post.video?.video_url || '';

            const isLiked = Boolean(likedMap[post.id]);
            const currentLikes = likesCountMap[post.id] ?? (post.likes_count || 0);

            if (post.type === 'music') {
              return (
                <MusicCard
                  key={post.id}
                  post={post}
                  onOpenComments={(postId) => {
                    if (!user) {
                      openAuthModal('Sign in to comment');
                      return;
                    }
                    setActiveCommentPostId(postId);
                  }}
                />
              );
            }

            return (
              <div
                key={post.id}
                className="p-5 rounded-3xl glass-card border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 text-slate-900 dark:text-white space-y-4 shadow-xl hover:shadow-2xl transition-all"
              >
                {/* Author Info Bar */}
                <div className="flex items-center justify-between">
                  <Link href={`/profile/${author.username}`} className="flex items-center gap-3 group/user">
                    <div className="w-10 h-10 rounded-full border border-slate-300 dark:border-slate-700 overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
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
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover/user:underline flex items-center gap-1.5">
                        <span>{author.display_name}</span>
                        {author.role === 'admin' && (
                          <span className="p-0.5 rounded-full bg-black text-white dark:bg-white dark:text-black">
                            <ShieldCheck className="w-3 h-3" />
                          </span>
                        )}
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">@{author.username}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1 font-mono mt-0.5">
                        <Calendar className="w-2.5 h-2.5" />
                        {new Date(post.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </Link>

                  <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 text-[10px] font-bold">
                    Following
                  </span>
                </div>

                {/* Caption Text */}
                {post.caption && (
                  <p className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                    {post.caption}
                  </p>
                )}

                {/* Media Container */}
                {post.type === 'video' && post.video && (
                  <FeedVideoPlayer
                    videoUrl={post.video.video_url}
                    thumbnailUrl={post.video.thumbnail_url}
                    caption={post.caption}
                  />
                )}

                {post.type === 'image' && post.image && (
                  <div className="relative rounded-2xl overflow-hidden bg-black border border-slate-200 dark:border-slate-800 max-h-[500px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={post.image.image_url}
                      alt={post.caption}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Hashtags */}
                {post.hashtags && post.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {post.hashtags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 text-[11px] font-medium border border-slate-200 dark:border-slate-800"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Action Bar (Like, Comment, Share) */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Like Button */}
                    <button
                      onClick={() => handleToggleLike(post.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        isLiked
                          ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                          : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-black dark:hover:text-white'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                      <span>{currentLikes}</span>
                    </button>

                    {/* Comment Button */}
                    <button
                      onClick={() => {
                        if (!user) {
                          openAuthModal('Sign in to comment');
                          return;
                        }
                        setActiveCommentPostId(post.id);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-black dark:hover:text-white transition-all"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>{post.comments_count || 0}</span>
                    </button>

                    {/* Share Button */}
                    <button
                      onClick={() => handleShare(post.id, post.caption)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-black dark:hover:text-white transition-all"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>Share</span>
                    </button>

                    {/* Report Button */}
                    <button
                      onClick={() => setReportTarget({ type: post.type, id: post.id, title: post.caption })}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
                      title="Report Content"
                    >
                      <Flag className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Active Comment Drawer */}
      {activeCommentPostId && (
        <CommentDrawer
          postId={activeCommentPostId}
          onClose={() => setActiveCommentPostId(null)}
        />
      )}

      {/* Report Content Modal */}
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

'use client';

import React, { useState } from 'react';
import { Post, PostType } from '@/types/post';
import { Profile } from '@/types/user';
import { useAuthStore } from '@/stores/authStore';
import { useModalStore } from '@/stores/modalStore';
import { togglePostLike } from '@/lib/services/postService';
import { getAvatarUrl, getCartoonAvatar } from '@/lib/utils/avatar';
import { parseMediaUrl } from '@/lib/utils/mediaEmbed';
import { CommentDrawer } from '@/components/comments/CommentDrawer';
import { MusicCard } from '@/components/music/MusicCard';
import { FeedVideoPlayer } from '@/components/feed/FeedVideoPlayer';
import {
  Compass,
  Search,
  Users,
  Video,
  Image as ImageIcon,
  Music,
  Type,
  Grid,
  Heart,
  MessageCircle,
  Share2,
  ShieldCheck,
  Calendar,
  Sparkles,
  Flame,
  UserPlus,
} from 'lucide-react';
import Link from 'next/link';

interface ExploreClientProps {
  initialPosts: Post[];
  initialProfiles: Profile[];
}

export function ExploreClient({ initialPosts, initialProfiles }: ExploreClientProps) {
  const { user, openAuthModal } = useAuthStore();
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [profiles] = useState<Profile[]>(initialProfiles);
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'users' | PostType>('all');

  // Comment Drawer State
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);

  // Like & Comment Map State
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [likesCountMap, setLikesCountMap] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    initialPosts.forEach((p) => {
      map[p.id] = p.likes_count || 0;
    });
    return map;
  });
  const [commentsCountMap, setCommentsCountMap] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    initialPosts.forEach((p) => {
      map[p.id] = p.comments_count || 0;
    });
    return map;
  });

  const { showAlert } = useModalStore();

  const handleToggleLike = async (postId: string) => {
    if (!user) {
      openAuthModal('Sign in to like posts');
      return;
    }
    if (user.status === 'suspended' || user.status === 'banned') {
      showAlert(`Your account is currently ${user.status}. You cannot like posts.`, 'Account Restricted', 'warning');
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

    try {
      await togglePostLike(postId, user.id, currentlyLiked);
    } catch (err: any) {
      // Revert optimistic update
      setLikedMap((prev) => ({ ...prev, [postId]: currentlyLiked }));
      setLikesCountMap((prev) => ({
        ...prev,
        [postId]: currentlyLiked
          ? (prev[postId] || 0) + 1
          : Math.max(0, (prev[postId] || 1) - 1),
      }));
      showAlert(err?.message || 'Failed to like post.', 'Error', 'error');
    }
  };

  const handleShare = (postId: string, captionText?: string) => {
    const shareUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/post/${postId}`
      : `https://instangalog.online/post/${postId}`;
    if (navigator.share) {
      navigator.share({ title: captionText || 'Check out this post', url: shareUrl }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert('Link copied to clipboard!');
    }
  };

  // Filter Posts based on query and tab
  const filteredPosts = posts.filter((p) => {
    if (activeTab !== 'all' && activeTab !== 'users' && p.type !== activeTab) {
      return false;
    }

    if (!query.trim()) return true;

    const q = query.toLowerCase().trim();
    const matchesCaption = p.caption?.toLowerCase().includes(q);
    const matchesHashtag = p.hashtags?.some((h) => h.toLowerCase().includes(q));
    const matchesAuthor =
      p.author?.display_name?.toLowerCase().includes(q) ||
      p.author?.username?.toLowerCase().includes(q);
    const matchesMusic =
      p.music?.title?.toLowerCase().includes(q) ||
      p.music?.artist?.toLowerCase().includes(q);

    return matchesCaption || matchesHashtag || matchesAuthor || matchesMusic;
  });

  // Filter Creators based on query
  const filteredCreators = profiles.filter((c) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase().trim();
    return (
      c.display_name?.toLowerCase().includes(q) ||
      c.username?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-slate-900 dark:text-white pb-12">
      {/* Search Bar & Header */}
      <div className="p-6 rounded-3xl glass-card border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 text-slate-900 dark:text-white shadow-xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-black text-white dark:bg-white dark:text-black flex items-center justify-center shadow-lg shrink-0">
            <Compass className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Explore & Discover</span>
              <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Search videos, tracks, images, and community creators
            </p>
          </div>
        </div>

        {/* Live Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search posts, hashtags (#music, #travel), or creators..."
            className="w-full pl-11 pr-4 py-3 text-xs md:text-sm rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-black dark:focus:border-white transition-colors"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filter Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 hide-scrollbar">
          {[
            { id: 'all', label: 'All Content', icon: Grid },
            { id: 'users', label: 'Creators', icon: Users },
            { id: 'video', label: 'Videos & YT', icon: Video },
            { id: 'music', label: 'Music', icon: Music },
            { id: 'image', label: 'Images', icon: ImageIcon },
            { id: 'status', label: 'Statuses', icon: Type },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 border ${
                activeTab === id
                  ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-md'
                  : 'bg-white/80 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-black dark:hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Community Creators Section */}
      {(activeTab === 'all' || activeTab === 'users') && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-500" />
              <span>Community Creators</span>
            </h2>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              {filteredCreators.length} Registered
            </span>
          </div>

          {filteredCreators.length === 0 ? (
            <div className="p-8 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 text-center text-xs text-slate-500">
              No creators found matching &quot;{query}&quot;
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredCreators.map((creator) => (
                <Link
                  key={creator.id}
                  href={`/profile/${creator.username}`}
                  className="p-4 rounded-3xl glass-card border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 hover:bg-white dark:hover:bg-slate-900 transition-all flex items-center gap-3 shadow-md hover:shadow-xl group"
                >
                  <div className="w-12 h-12 rounded-full border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getAvatarUrl(creator.avatar_url, creator.username || creator.display_name)}
                      alt={creator.display_name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = getCartoonAvatar(creator.username || creator.display_name);
                      }}
                    />
                  </div>
                  <div className="truncate flex-1">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:underline flex items-center gap-1.5">
                      <span className="truncate">{creator.display_name}</span>
                      {creator.role === 'admin' && (
                        <span className="p-0.5 rounded-full bg-black text-white dark:bg-white dark:text-black shrink-0">
                          <ShieldCheck className="w-3 h-3" />
                        </span>
                      )}
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">@{creator.username}</p>
                  </div>
                  <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 shrink-0">
                    {creator.followers_count || 0} fans
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Posts Section */}
      {activeTab !== 'users' && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Flame className="w-4 h-4 text-rose-500" />
              <span>Trending Discoveries</span>
            </h2>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              {filteredPosts.length} Posts
            </span>
          </div>

          {filteredPosts.length === 0 ? (
            <div className="p-12 rounded-3xl glass-card border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-950/60 text-center space-y-2">
              <Sparkles className="w-10 h-10 text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-slate-900 dark:text-white">No discoveries found</p>
              <p className="text-xs text-slate-500">Try searching for other tags or keywords!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPosts.map((post) => {
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
                    {/* Author Header */}
                    <div className="flex items-center justify-between">
                      <Link href={`/profile/${author.username}`} className="flex items-center gap-3 group/user">
                        <div className="w-9 h-9 rounded-full border border-slate-300 dark:border-slate-700 overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
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
                        </div>
                      </Link>

                      <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 text-[10px] font-bold capitalize">
                        {post.type}
                      </span>
                    </div>

                    {/* Caption */}
                    {post.caption && (
                      <p className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                        {post.caption}
                      </p>
                    )}

                    {/* Video Player / YouTube Embed */}
                    {post.type === 'video' && post.video && (
                      <FeedVideoPlayer
                        videoUrl={post.video.video_url}
                        thumbnailUrl={post.video.thumbnail_url}
                        caption={post.caption}
                      />
                    )}

                    {/* Image Preview */}
                    {post.type === 'image' && post.image && (
                      <div className="relative rounded-2xl overflow-hidden bg-black border border-slate-200 dark:border-slate-800 max-h-[400px]">
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

                    {/* Action Bar */}
                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleToggleLike(post.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all ${
                            isLiked
                              ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                              : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-black dark:hover:text-white'
                          }`}
                        >
                          <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                          <span>{currentLikes}</span>
                        </button>

                        <button
                          onClick={() => {
                            if (!user) {
                              openAuthModal('Sign in to comment');
                              return;
                            }
                            setActiveCommentPostId(post.id);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-black dark:hover:text-white transition-all"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span>{commentsCountMap[post.id] ?? post.comments_count ?? 0}</span>
                        </button>

                        <button
                          onClick={() => handleShare(post.id, post.caption)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-black dark:hover:text-white transition-all"
                        >
                          <Share2 className="w-4 h-4" />
                          <span>Share</span>
                        </button>
                      </div>

                      <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                        <Calendar className="w-3 h-3" />
                        {new Date(post.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Comment Drawer */}
      {activeCommentPostId && (
        <CommentDrawer
          postId={activeCommentPostId}
          onClose={() => setActiveCommentPostId(null)}
          onCommentAdded={(pId, count) => {
            setCommentsCountMap((prev) => ({ ...prev, [pId]: count }));
          }}
        />
      )}
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { Comment } from '@/types/comment';
import { Heart, Reply, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { getAvatarUrl, getCartoonAvatar } from '@/lib/utils/avatar';

interface CommentItemProps {
  comment: Comment;
  postAuthorId?: string;
  isNested?: boolean;
  onReply?: (commentId: string, authorName: string) => void;
}

function formatTimeAgo(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (isNaN(diffInSeconds) || diffInSeconds <= 5) return 'Just now';
  if (diffInSeconds < 60) return `${diffInSeconds}s`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function CommentItem({ comment, postAuthorId, isNested = false, onReply }: CommentItemProps) {
  const [isLiked, setIsLiked] = useState<boolean>(comment.is_liked || false);
  const [likesCount, setLikesCount] = useState<number>(comment.likes_count || 0);

  const author = comment.author || {
    id: comment.user_id,
    display_name: 'User',
    username: 'user',
    avatar_url: '',
  };

  const isOwner = Boolean(
    postAuthorId &&
      (comment.user_id === postAuthorId || (author && (author as any).id === postAuthorId))
  );

  const avatarSrc = getAvatarUrl(author.avatar_url, author.username || author.display_name);

  const handleLikeToggle = () => {
    setIsLiked((prev) => !prev);
    setLikesCount((prev) => (isLiked ? Math.max(0, prev - 1) : prev + 1));
  };

  return (
    <div className="flex gap-2.5 text-slate-800 dark:text-slate-200 group">
      {/* Avatar */}
      <Link href={`/profile/${author.username}`} className="shrink-0 mt-0.5">
        <div className={`rounded-full overflow-hidden border ${isNested ? 'w-7 h-7' : 'w-8 h-8'} ${
          isOwner
            ? 'border-indigo-500/60 ring-2 ring-indigo-500/20'
            : 'border-slate-300 dark:border-slate-700'
        } bg-slate-100 dark:bg-slate-800 transition-all`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatarSrc}
            alt={author.display_name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = getCartoonAvatar(author.username || author.display_name);
            }}
          />
        </div>
      </Link>

      <div className="flex-1 min-w-0">
        {/* Facebook-style Speech Bubble */}
        <div
          className={`inline-block max-w-full rounded-2xl px-3.5 py-2 text-xs transition-all ${
            isOwner
              ? 'bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/80 dark:border-indigo-800/60 shadow-sm'
              : 'bg-slate-100 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60'
          }`}
        >
          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
            <Link
              href={`/profile/${author.username}`}
              className={`font-semibold hover:underline ${
                isOwner
                  ? 'text-indigo-900 dark:text-indigo-200 font-bold'
                  : 'text-slate-900 dark:text-slate-100'
              }`}
            >
              {author.display_name}
            </Link>

            {isOwner && (
              <span className="px-1.5 py-0.5 text-[9px] font-extrabold rounded-md bg-indigo-600 text-white dark:bg-indigo-500 uppercase tracking-wider inline-flex items-center gap-0.5 shadow-sm">
                <ShieldCheck className="w-2.5 h-2.5" />
                Author
              </span>
            )}
          </div>

          <p className="text-slate-800 dark:text-slate-200 text-xs leading-relaxed break-words whitespace-pre-wrap">
            {comment.content}
          </p>
        </div>

        {/* Action Row: Timestamp, Like, Reply */}
        <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 pl-2 pt-1 font-medium">
          <span className="text-[10px] text-slate-400 dark:text-slate-500">
            {formatTimeAgo(comment.created_at)}
          </span>

          <button
            onClick={handleLikeToggle}
            className={`flex items-center gap-1 hover:underline transition-colors ${
              isLiked ? 'text-rose-500 font-bold' : 'hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Heart className={`w-3 h-3 ${isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
            <span>{likesCount > 0 ? likesCount : 'Like'}</span>
          </button>

          {onReply && (
            <button
              onClick={() => onReply(comment.id, author.display_name)}
              className="flex items-center gap-1 font-semibold hover:underline hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              <Reply className="w-3 h-3" />
              <span>Reply</span>
            </button>
          )}
        </div>

        {/* Facebook-style Nested Replies Thread */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="space-y-3 pt-2.5 pl-3 border-l-2 border-indigo-500/20 dark:border-indigo-500/30 ml-3.5 mt-2">
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                postAuthorId={postAuthorId}
                isNested={true}
                onReply={onReply}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import { Comment } from '@/types/comment';
import { Heart, Reply } from 'lucide-react';
import Link from 'next/link';

import { getAvatarUrl, getCartoonAvatar } from '@/lib/utils/avatar';

interface CommentItemProps {
  comment: Comment;
  onReply?: (commentId: string, authorName: string) => void;
}

export function CommentItem({ comment, onReply }: CommentItemProps) {
  const author = comment.author || {
    display_name: 'User',
    username: 'user',
    avatar_url: '',
  };

  const avatarSrc = getAvatarUrl(author.avatar_url, author.username || author.display_name);

  return (
    <div className="flex gap-3 text-slate-800 dark:text-slate-200">
      <Link href={`/profile/${author.username}`} className="shrink-0">
        <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
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
      <div className="flex-1 space-y-1">
        <div className="flex items-baseline justify-between">
          <Link href={`/profile/${author.username}`} className="text-xs font-bold text-slate-900 dark:text-white hover:underline">
            {author.display_name}
          </Link>
          <span className="text-[10px] text-slate-400">
            {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <p className="text-xs text-slate-700 dark:text-slate-300 leading-normal">{comment.content}</p>
        <div className="flex items-center gap-4 text-[10px] text-slate-500 dark:text-slate-400 pt-1">
          <button className="flex items-center gap-1 hover:text-rose-500">
            <Heart className="w-3 h-3" />
            <span>{comment.likes_count || 0}</span>
          </button>
          {onReply && (
            <button onClick={() => onReply(comment.id, author.display_name)} className="flex items-center gap-1 hover:text-black dark:hover:text-white">
              <Reply className="w-3 h-3" />
              <span>Reply</span>
            </button>
          )}
        </div>

        {/* Nested Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="space-y-3 pt-3 pl-4 border-l border-slate-200 dark:border-slate-800">
            {comment.replies.map((reply) => (
              <CommentItem key={reply.id} comment={reply} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

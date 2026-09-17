'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Comment } from '@/types/comment';
import { getCommentsForPost, addComment } from '@/lib/services/commentService';
import { useAuthStore } from '@/stores/authStore';
import { useModalStore } from '@/stores/modalStore';
import { CommentItem } from './CommentItem';
import { X, Send, CornerDownRight } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

interface CommentDrawerProps {
  postId: string;
  postAuthorId?: string;
  onClose: () => void;
  onCommentAdded?: (postId: string, newCount: number) => void;
}

function buildCommentTree(flatComments: Comment[]): Comment[] {
  const commentMap = new Map<string, Comment>();
  const rootComments: Comment[] = [];

  flatComments.forEach((c) => {
    commentMap.set(c.id, { ...c, replies: [] });
  });

  flatComments.forEach((c) => {
    const item = commentMap.get(c.id)!;
    if (c.parent_id && commentMap.has(c.parent_id)) {
      commentMap.get(c.parent_id)!.replies!.push(item);
    } else {
      rootComments.push(item);
    }
  });

  return rootComments;
}

export function CommentDrawer({ postId, postAuthorId, onClose, onCommentAdded }: CommentDrawerProps) {
  const { user, openAuthModal } = useAuthStore();
  const { showAlert } = useModalStore();
  const [comments, setComments] = useState<Comment[]>([]);
  const [authorId, setAuthorId] = useState<string | undefined>(postAuthorId);
  const [newCommentText, setNewCommentText] = useState('');
  const [replyTarget, setReplyTarget] = useState<{ id: string; authorName: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!postAuthorId) {
        const { data } = await supabase.from('posts').select('user_id').eq('id', postId).maybeSingle();
        const postData = data as any;
        if (postData?.user_id && isMounted) {
          setAuthorId(postData.user_id);
        }
      } else {
        setAuthorId(postAuthorId);
      }

      const fetchedComments = await getCommentsForPost(postId);
      if (isMounted) {
        setComments(fetchedComments);
      }
    }

    loadData();

    const channelName = `comments-${postId}-${Math.random().toString(36).substring(2, 7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: `post_id=eq.${postId}`,
        },
        async (payload) => {
          const newCommentRecord = payload.new as any;

          if (newCommentRecord.user_id) {
            const { data: authorProf } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', newCommentRecord.user_id)
              .maybeSingle();

            if (authorProf) {
              newCommentRecord.author = authorProf;
            }
          }

          setComments((prev) => {
            if (prev.some((c) => c.id === newCommentRecord.id)) return prev;
            const updated = [...prev, newCommentRecord as Comment];
            onCommentAdded?.(postId, updated.length);
            return updated;
          });
        }
      );

    channel.subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [postId, postAuthorId, onCommentAdded]);

  const commentTree = useMemo(() => buildCommentTree(comments), [comments]);

  const handleReplyClick = (commentId: string, authorName: string) => {
    setReplyTarget({ id: commentId, authorName });
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      openAuthModal('Sign in to leave a comment');
      return;
    }
    if (user.status === 'suspended' || user.status === 'banned') {
      showAlert(`Your account is currently ${user.status}. You cannot post comments.`, 'Account Restricted', 'warning');
      return;
    }
    if (!newCommentText.trim()) return;

    try {
      const created = await addComment(postId, user.id, newCommentText, replyTarget?.id);
      setComments((prev) => {
        if (prev.some((c) => c.id === created.id)) return prev;
        const updated = [...prev, created];
        onCommentAdded?.(postId, updated.length);
        return updated;
      });
      setNewCommentText('');
      setReplyTarget(null);
    } catch (err: any) {
      showAlert(err?.message || 'Failed to post comment.', 'Error', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full sm:max-w-md h-[80vh] sm:h-full bg-white dark:bg-slate-950 border-t sm:border-l border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between text-slate-900 dark:text-white shadow-2xl animate-in slide-in-from-bottom sm:slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Comments</h3>
            <p className="text-[11px] text-slate-400">{comments.length} total {comments.length === 1 ? 'comment' : 'comments'}</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-black dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-900">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comment List */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 hide-scrollbar">
          {commentTree.length === 0 ? (
            <p className="text-center text-xs text-slate-500 py-8">No comments yet. Be the first to comment!</p>
          ) : (
            commentTree.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                postAuthorId={authorId}
                onReply={handleReplyClick}
              />
            ))
          )}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSubmit} className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
          {replyTarget && (
            <div className="flex items-center justify-between text-xs text-indigo-900 dark:text-indigo-200 bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800/60 animate-in fade-in slide-in-from-bottom-1">
              <div className="flex items-center gap-1.5 font-medium">
                <CornerDownRight className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Replying to <span className="font-bold">@{replyTarget.authorName}</span></span>
              </div>
              <button
                onClick={() => setReplyTarget(null)}
                type="button"
                className="p-0.5 text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-200 rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder={
                replyTarget
                  ? `Reply to @${replyTarget.authorName}...`
                  : user
                  ? 'Add a comment...'
                  : 'Sign in to comment'
              }
              onClick={() => {
                if (!user) openAuthModal('Sign in to leave a comment');
              }}
              className="flex-1 px-4 py-2.5 text-xs rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-500 transition-colors"
            />
            <button
              type="submit"
              disabled={!newCommentText.trim()}
              className="p-2.5 rounded-full bg-indigo-600 text-white dark:bg-indigo-500 dark:text-white disabled:opacity-50 hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors shadow-sm"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

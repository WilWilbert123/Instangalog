'use client';

import React, { useState, useEffect } from 'react';
import { Comment } from '@/types/comment';
import { getCommentsForPost, addComment } from '@/lib/services/commentService';
import { useAuthStore } from '@/stores/authStore';
import { useModalStore } from '@/stores/modalStore';
import { CommentItem } from './CommentItem';
import { X, Send } from 'lucide-react';

import { supabase } from '@/lib/supabase/client';

interface CommentDrawerProps {
  postId: string;
  onClose: () => void;
  onCommentAdded?: (postId: string, newCount: number) => void;
}

export function CommentDrawer({ postId, onClose, onCommentAdded }: CommentDrawerProps) {
  const { user, openAuthModal } = useAuthStore();
  const { showAlert } = useModalStore();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [replyTarget, setReplyTarget] = useState<{ id: string; authorName: string } | null>(null);

  useEffect(() => {
    getCommentsForPost(postId).then(setComments);

    const channel = supabase
      .channel(`comments-${postId}`)
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
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId, onCommentAdded]);

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
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Comments ({comments.length})</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-black dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-900">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comment List */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 hide-scrollbar">
          {comments.length === 0 ? (
            <p className="text-center text-xs text-slate-500 py-8">No comments yet. Be the first to comment!</p>
          ) : (
            comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                onReply={(id, name) => setReplyTarget({ id, authorName: name })}
              />
            ))
          )}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSubmit} className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
          {replyTarget && (
            <div className="flex items-center justify-between text-xs text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-900 px-3 py-1 rounded-lg border border-slate-300 dark:border-slate-700">
              <span>Replying to @{replyTarget.authorName}</span>
              <button onClick={() => setReplyTarget(null)} type="button">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder={user ? 'Add a comment...' : 'Sign in to comment'}
              onClick={() => {
                if (!user) openAuthModal('Sign in to leave a comment');
              }}
              className="flex-1 px-4 py-2.5 text-xs rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-black dark:focus:border-white"
            />
            <button
              type="submit"
              disabled={!newCommentText.trim()}
              className="p-2.5 rounded-full bg-black text-white dark:bg-white dark:text-black disabled:opacity-50 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

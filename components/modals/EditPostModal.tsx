'use client';

import React, { useState } from 'react';
import { Post, Visibility } from '@/types/post';
import { useAuthStore } from '@/stores/authStore';
import { updatePost, deletePost } from '@/lib/services/postService';
import { X, Globe, Lock, Loader2, Edit3, Check, Trash2 } from 'lucide-react';

interface EditPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post;
  onPostUpdated: (updated: Post) => void;
  onPostDeleted?: (deletedPostId: string) => void;
}

export function EditPostModal({ isOpen, onClose, post, onPostUpdated, onPostDeleted }: EditPostModalProps) {
  const { user } = useAuthStore();
  const [caption, setCaption] = useState(post.caption || '');
  const [hashtags, setHashtags] = useState((post.hashtags || []).join(', '));
  const [visibility, setVisibility] = useState<Visibility>(post.visibility || 'public');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSaving(true);
    setErrorMsg(null);

    try {
      const hashtagList = hashtags
        .split(',')
        .map((t) => t.trim().replace(/^#/, ''))
        .filter(Boolean);

      const updated = await updatePost(
        post.id,
        {
          caption: caption.trim(),
          hashtags: hashtagList,
          visibility,
        },
        user.id,
        user.email
      );

      onPostUpdated(updated);
      onClose();
    } catch (err: any) {
      console.error('Failed to update post:', err);
      setErrorMsg(err?.message || 'Failed to update post. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    setIsDeleting(true);
    setErrorMsg(null);
    try {
      await deletePost(post.id, user.id, user.email);
      onPostDeleted?.(post.id);
      onClose();
    } catch (err: any) {
      console.error('Failed to delete post:', err);
      setErrorMsg(err?.message || 'Failed to delete post.');
    } finally {
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold">
            <Edit3 className="w-5 h-5 text-amber-500" />
            <h3 className="text-base">Edit Post</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          {/* Caption */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Caption
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={4}
              placeholder="What's on your mind?"
              className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-black dark:focus:border-white transition-colors resize-none"
            />
          </div>

          {/* Hashtags */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Hashtags (comma separated)
            </label>
            <input
              type="text"
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              placeholder="tangalog, bisayawa, funny"
              className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-black dark:focus:border-white transition-colors"
            />
          </div>

          {/* Privacy & Visibility */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Visibility
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setVisibility('public')}
                className={`p-3 rounded-2xl text-left border transition-all flex items-center gap-3 ${
                  visibility === 'public'
                    ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-md'
                    : 'bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                }`}
              >
                <Globe className="w-4 h-4 shrink-0" />
                <div>
                  <p className="text-xs font-bold leading-tight">Public</p>
                  <p className="text-[10px] opacity-75">Visible to everyone</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setVisibility('private')}
                className={`p-3 rounded-2xl text-left border transition-all flex items-center gap-3 ${
                  visibility === 'private'
                    ? 'bg-amber-500 text-white border-amber-500 shadow-md'
                    : 'bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                }`}
              >
                <Lock className="w-4 h-4 shrink-0" />
                <div>
                  <p className="text-xs font-bold leading-tight">Only Me / Private</p>
                  <p className="text-[10px] opacity-75">Only you & Super Admin</p>
                </div>
              </button>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            {/* Delete Option for Author or Super Admin */}
            {confirmDelete ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all disabled:opacity-50"
                >
                  {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span>Yes, Delete</span>
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  disabled={isDeleting}
                  className="px-2 py-1.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-semibold"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="px-3 py-2 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Post</span>
              </button>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving || isDeleting}
                className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-black text-white dark:bg-white dark:text-black font-bold text-xs shadow-md hover:opacity-90 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

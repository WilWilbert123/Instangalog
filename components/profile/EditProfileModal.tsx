'use client';

import React, { useState } from 'react';
import { Profile } from '@/types/user';
import { updateProfile } from '@/lib/services/profileService';
import { uploadImageToCloudinary } from '@/lib/services/cloudinary';
import { useAuthStore } from '@/stores/authStore';
import { getAvatarUrl, getCartoonAvatar } from '@/lib/utils/avatar';
import { X, Camera, Sparkles, Loader2, User, AtSign, AlignLeft, AlertCircle } from 'lucide-react';

interface EditProfileModalProps {
  profile: Profile;
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdated: (updatedProfile: Profile) => void;
}

export function EditProfileModal({
  profile,
  isOpen,
  onClose,
  onProfileUpdated,
}: EditProfileModalProps) {
  const { updateUserSession } = useAuthStore();

  const [displayName, setDisplayName] = useState(profile.display_name || '');
  const [username, setUsername] = useState(profile.username || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || '');
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);

  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Image file must be smaller than 5MB');
      return;
    }

    setErrorMessage(null);
    setIsUploadingAvatar(true);

    const reader = new FileReader();
    reader.onloadend = async () => {
      if (reader.result) {
        setAvatarUrl(reader.result as string);
      }

      try {
        const res = await uploadImageToCloudinary(file);
        if (res && res.url && res.url.startsWith('http')) {
          setAvatarUrl(res.url);
        }
      } catch (err: any) {
        console.warn('[Cloudinary Avatar Upload Warning]:', err?.message);
      } finally {
        setIsUploadingAvatar(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateCartoonAvatar = () => {
    const newAvatar = getCartoonAvatar(username || displayName || `avatar-${Date.now()}`);
    setAvatarUrl(newAvatar);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9._]/g, '');

    if (!cleanUsername) {
      setErrorMessage('Username cannot be empty');
      return;
    }

    if (!displayName.trim()) {
      setErrorMessage('Display name cannot be empty');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await updateProfile(
        profile.id,
        {
          display_name: displayName.trim(),
          username: cleanUsername,
          avatar_url: avatarUrl.trim(),
          bio: bio.trim(),
        },
        profile.username
      );

      if (!result.success || !result.data) {
        setErrorMessage(result.error || 'Failed to update profile');
        setIsSubmitting(false);
        return;
      }

      // Update Zustand auth store
      updateUserSession({
        display_name: result.data.display_name,
        username: result.data.username,
        avatar_url: getAvatarUrl(result.data.avatar_url, result.data.username),
      });

      onProfileUpdated(result.data);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'An error occurred while saving profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl glass-card border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 text-slate-900 dark:text-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-black text-white dark:bg-white dark:text-black flex items-center justify-center shadow-md">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Edit Profile</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Update your photo, username, and bio</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-black dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-5 mt-4 p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Avatar Edit Section */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative group w-24 h-24 rounded-full border-4 border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 overflow-hidden shadow-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getAvatarUrl(avatarUrl, username || displayName)}
                alt="Profile Avatar Preview"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = getCartoonAvatar(username || displayName);
                }}
              />

              {isUploadingAvatar ? (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                <label
                  htmlFor="avatar-upload-input"
                  className="absolute inset-0 bg-black/50 text-white flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-xs font-semibold"
                >
                  <Camera className="w-5 h-5" />
                  <span>Change</span>
                </label>
              )}

              <input
                id="avatar-upload-input"
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={isUploadingAvatar}
                className="hidden"
              />
            </div>

            {/* Quick Avatar Actions */}
            <div className="flex items-center gap-2">
              <label
                htmlFor="avatar-upload-input"
                className={`px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 cursor-pointer transition-colors ${
                  isUploadingAvatar ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                {isUploadingAvatar ? 'Uploading...' : 'Upload Photo'}
              </label>
              <button
                type="button"
                onClick={handleGenerateCartoonAvatar}
                disabled={isUploadingAvatar}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Generate Cartoon</span>
              </button>
              <button
                type="button"
                onClick={() => setShowUrlInput(!showUrlInput)}
                disabled={isUploadingAvatar}
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors disabled:opacity-50"
              >
                {showUrlInput ? 'Hide URL' : 'Image URL'}
              </button>
            </div>

            {showUrlInput && (
              <div className="w-full flex items-center gap-2">
                <input
                  type="url"
                  value={customUrlInput}
                  onChange={(e) => setCustomUrlInput(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-black dark:focus:border-white"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customUrlInput.trim()) {
                      setAvatarUrl(customUrlInput.trim());
                      setCustomUrlInput('');
                      setShowUrlInput(false);
                    }
                  }}
                  className="px-3 py-2 text-xs font-bold rounded-xl bg-black text-white dark:bg-white dark:text-black hover:opacity-90"
                >
                  Apply
                </button>
              </div>
            )}
          </div>

          {/* Form Inputs */}
          <div className="space-y-4">
            {/* Display Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                <span>Display Name</span>
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your Display Name"
                maxLength={40}
                required
                className="w-full px-3.5 py-2.5 text-xs font-medium rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-black dark:focus:border-white transition-colors"
              />
            </div>

            {/* Username */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <AtSign className="w-3.5 h-3.5" />
                <span>Username</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">@</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ''))}
                  placeholder="username"
                  maxLength={30}
                  required
                  className="w-full pl-8 pr-3.5 py-2.5 text-xs font-medium rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                />
              </div>
              <p className="text-[10px] text-slate-400">Unique handle: letters, numbers, dots, and underscores.</p>
            </div>

            {/* Bio */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <label className="flex items-center gap-1.5">
                  <AlignLeft className="w-3.5 h-3.5" />
                  <span>Bio</span>
                </label>
                <span className="text-[10px] text-slate-400 font-normal">{bio.length}/160</span>
              </div>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Write a short bio..."
                maxLength={160}
                rows={3}
                className="w-full px-3.5 py-2.5 text-xs font-medium rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-black dark:focus:border-white transition-colors resize-none"
              />
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isUploadingAvatar}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-xl bg-black text-white dark:bg-white dark:text-black hover:opacity-90 disabled:opacity-50 transition-all shadow-md"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

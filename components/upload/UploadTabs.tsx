'use client';

import React, { useState } from 'react';
import { PostType } from '@/types/post';
import { createPost } from '@/lib/services/postService';
import { uploadVideoToCloudinary, uploadImageToCloudinary } from '@/lib/services/cloudinary';
import { useAuthStore } from '@/stores/authStore';
import { Video, Image as ImageIcon, Music, Type, Clock, ShieldAlert, Upload, Loader2, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { parseMediaUrl } from '@/lib/utils/mediaEmbed';

export function UploadTabs() {
  const { user, openAuthModal } = useAuthStore();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<PostType>('video');
  const [caption, setCaption] = useState('');
  const [hashtagsInput, setHashtagsInput] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [uploadPercent, setUploadPercent] = useState<number>(0);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [genre, setGenre] = useState('Electronic');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  const tabs: { type: PostType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { type: 'video', label: 'Video', icon: Video },
    { type: 'image', label: 'Image', icon: ImageIcon },
    { type: 'music', label: 'Music', icon: Music },
    { type: 'status', label: 'Status', icon: Type },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      openAuthModal('Sign in to publish media');
      return;
    }

    if (activeTab === 'video' && !selectedFile && !mediaUrl.trim()) {
      alert('Please select a local video file or paste a YouTube / direct video URL.');
      return;
    }
    if (activeTab === 'image' && !selectedFile && !mediaUrl.trim()) {
      alert('Please select an image file or paste an image URL.');
      return;
    }
    if (activeTab === 'music' && !selectedFile && !mediaUrl.trim()) {
      alert('Please select an audio file or paste an audio URL.');
      return;
    }

    setIsSubmitting(true);
    setUploadPercent(0);
    let finalMediaUrl = mediaUrl.trim();
    let finalThumbnailUrl = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80';

    if (activeTab === 'video' && finalMediaUrl) {
      const media = parseMediaUrl(finalMediaUrl);
      if (media.embedUrl) {
        finalMediaUrl = media.embedUrl;
        if (media.thumbnailUrl) {
          finalThumbnailUrl = media.thumbnailUrl;
        }
      }
    }

    try {
      // 1. Direct Cloudinary Upload with real-time percentage tracking
      if (selectedFile) {
        if (activeTab === 'video') {
          setUploadProgress('Uploading video to Cloudinary CDN...');
          const result = await uploadVideoToCloudinary(selectedFile, (percent) => {
            setUploadPercent(percent);
          });
          finalMediaUrl = result.url;
          finalThumbnailUrl = result.thumbnailUrl;
        } else if (activeTab === 'image') {
          setUploadProgress('Uploading image to Cloudinary CDN...');
          const result = await uploadImageToCloudinary(selectedFile, (percent) => {
            setUploadPercent(percent);
          });
          finalMediaUrl = result.url;
        }
      }

      setUploadProgress('Saving post metadata to Supabase...');
      setUploadPercent(100);

      const hashtags = hashtagsInput
        .split(',')
        .map((t) => t.trim().replace(/^#/, ''))
        .filter(Boolean);

      // 2. Save to Supabase PostgreSQL database
      await createPost({
        user_id: user.id,
        type: activeTab,
        caption,
        hashtags,
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
          activeTab === 'video'
            ? {
                video_url: finalMediaUrl,
                thumbnail_url: finalThumbnailUrl,
                duration: 15,
              }
            : undefined,
        image:
          activeTab === 'image'
            ? {
                image_url: finalMediaUrl || 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=1000&auto=format&fit=crop&q=80',
              }
            : undefined,
        music:
          activeTab === 'music'
            ? (() => {
                const media = parseMediaUrl(finalMediaUrl);
                return {
                  audio_url: media.embedUrl || finalMediaUrl || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
                  cover_url: media.thumbnailUrl || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=600&auto=format&fit=crop&q=80',
                  title: title || 'New Track',
                  artist: artist || user.display_name,
                  genre,
                  duration: 180,
                };
              })()
            : undefined,
        status:
          activeTab === 'status'
            ? {
                text: caption,
              }
            : undefined,
      });

      setIsSubmitting(false);
      setSubmittedSuccess(true);
      setUploadProgress('');
      setUploadPercent(0);
    } catch (err: any) {
      alert(err.message || 'Error publishing content. Please try again.');
      setIsSubmitting(false);
      setUploadProgress('');
      setUploadPercent(0);
    }
  };

  if (submittedSuccess) {
    const isVideo = activeTab === 'video';
    return (
      <div className="w-full max-w-lg mx-auto p-8 rounded-2xl glass-card border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 text-slate-900 dark:text-white text-center space-y-4 shadow-xl">
        <div className="w-16 h-16 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white flex items-center justify-center border border-slate-300 dark:border-slate-700">
          {isVideo ? <Clock className="w-8 h-8 text-amber-500" /> : <CheckCircle2 className="w-8 h-8 text-emerald-500" />}
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">
          {isVideo ? 'Submitted for Admin Moderation' : 'Published Live Immediately!'}
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          {isVideo
            ? 'Your video has been submitted! Video uploads require Admin Review before appearing publicly on FYP & feeds.'
            : 'Your post is live! Statuses, images, and music uploads are approved automatically.'}
        </p>
        <div className="flex gap-3 pt-2">
          <button
            onClick={() => {
              setSubmittedSuccess(false);
              setCaption('');
              setMediaUrl('');
              setSelectedFile(null);
              setUploadPercent(0);
            }}
            className="flex-1 py-2.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-800"
          >
            Upload Another
          </button>
          <button
            onClick={() => router.push(isVideo ? '/fyp' : '/following')}
            className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-black text-white dark:bg-white dark:text-black shadow-md"
          >
            {isVideo ? 'Back to FYP' : 'View in Following Feed'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto p-6 rounded-2xl glass-card border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/80 text-slate-900 dark:text-white shadow-2xl space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Upload & Publish Content</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Direct Cloudinary video & image upload saved to Supabase</p>
      </div>

      {/* Category Tab Selector */}
      <div className="grid grid-cols-4 gap-2 p-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        {tabs.map(({ type, label, icon: Icon }) => (
          <button
            key={type}
            type="button"
            onClick={() => {
              setActiveTab(type);
              setSelectedFile(null);
            }}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === type
                ? 'bg-black text-white dark:bg-white dark:text-black shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Specific Fields for Music */}
        {activeTab === 'music' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Track Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Neon Horizon"
                required
                className="w-full px-3 py-2.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-black dark:focus:border-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Artist Name</label>
              <input
                type="text"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                placeholder="e.g. Ocean Pulse"
                required
                className="w-full px-3 py-2.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-black dark:focus:border-white"
              />
            </div>
          </div>
        )}

        {/* Local File Picker (Direct Cloudinary Upload) */}
        {activeTab !== 'status' && (
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Select Local File ({activeTab.toUpperCase()})
            </label>
            <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4 text-center hover:border-black dark:hover:border-white transition-colors cursor-pointer bg-slate-50 dark:bg-slate-900/50">
              <input
                type="file"
                accept={activeTab === 'video' ? 'video/*' : activeTab === 'image' ? 'image/*' : 'audio/*'}
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center gap-1 text-slate-600 dark:text-slate-400">
                <Upload className="w-6 h-6 text-slate-400" />
                {selectedFile ? (
                  <span className="text-xs font-bold text-black dark:text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                  </span>
                ) : (
                  <span className="text-xs">Click to browse or drop file here</span>
                )}
              </div>
            </div>

            {/* Manual URL Input Option */}
            <div className="pt-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {activeTab === 'video' || activeTab === 'music'
                  ? 'Or Paste YouTube / Media URL'
                  : 'Or Paste Direct Image URL'}
              </label>
              <input
                type="url"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder={
                  activeTab === 'video'
                    ? 'Paste YouTube URL (e.g. https://youtu.be/...) or Video URL'
                    : activeTab === 'music'
                    ? 'Paste YouTube URL (e.g. https://youtu.be/...) or Audio URL'
                    : 'Paste Direct Image URL'
                }
                className="w-full px-3 py-2.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-black dark:focus:border-white"
              />
            </div>
          </div>
        )}

        {/* Caption Field */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Caption / Description</label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={3}
            placeholder="Write a caption or status text..."
            required
            className="w-full px-3 py-2.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-black dark:focus:border-white"
          />
        </div>
        {/* Live Percentage Progress Bar */}
        {isSubmitting && (
          <div className="space-y-1.5 p-3.5 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white text-xs border border-slate-300 dark:border-slate-700">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {uploadProgress || 'Uploading...'}
              </span>
              <span>{uploadPercent}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-black dark:bg-white transition-all duration-200 ease-out"
                style={{ width: `${uploadPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Safety Notice */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-[11px]">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Content will undergo automated & Admin review before public publication.</span>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 font-bold text-xs rounded-xl bg-black text-white dark:bg-white dark:text-black hover:opacity-90 transition-all shadow-md flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Uploading ({uploadPercent}%)...</span>
            </>
          ) : (
            'Publish Content'
          )}
        </button>
      </form>
    </div>
  );
}


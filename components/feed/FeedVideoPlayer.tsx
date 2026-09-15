'use client';

import React, { useRef, useState, useEffect } from 'react';
import { parseYouTubeUrl } from '@/lib/utils/youtube';
import { Volume2, VolumeX } from 'lucide-react';

interface FeedVideoPlayerProps {
  videoUrl: string;
  thumbnailUrl?: string;
  caption?: string;
}

export function FeedVideoPlayer({ videoUrl, thumbnailUrl, caption }: FeedVideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsVisible(entry.isIntersecting && entry.intersectionRatio >= 0.5);
        });
      },
      {
        threshold: [0, 0.5, 0.8, 1.0],
      }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, []);

  const ytInfo = parseYouTubeUrl(videoUrl, { autoplay: isVisible, mute: isMuted });
  const isYouTube = ytInfo.isYouTube || Boolean(videoUrl?.includes('youtube.com') || videoUrl?.includes('youtu.be'));
  const youtubeSrc = isYouTube ? (ytInfo.embedUrl || videoUrl) : '';

  useEffect(() => {
    if (isYouTube || !videoRef.current) return;

    if (isVisible) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => { });
      }
    } else {
      videoRef.current.pause();
    }
  }, [isVisible, isYouTube]);

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-slate-200 dark:border-slate-800 shadow-inner group"
    >
      {isYouTube ? (
        <iframe
          src={youtubeSrc}
          title={caption || 'YouTube Video'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="w-full h-full border-0 pointer-events-auto"
        />
      ) : (
        <video
          ref={videoRef}
          src={videoUrl}
          poster={thumbnailUrl}
          controls
          muted={isMuted}
          loop
          playsInline
          className="w-full h-full object-cover"
        />
      )}

      {/* Persistent Floating Sound Toggle */}
      <button
        onClick={toggleMute}
        className="absolute top-3 right-3 p-2 rounded-full bg-slate-900/80 backdrop-blur-md text-white border border-white/20 hover:bg-black transition-all z-30 shadow-xl active:scale-95 flex items-center justify-center"
        aria-label={isMuted ? 'Unmute video' : 'Mute video'}
        title={isMuted ? 'Click to unmute' : 'Click to mute'}
      >
        {isMuted ? <VolumeX className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4 text-white" />}
      </button>
    </div>
  );
}

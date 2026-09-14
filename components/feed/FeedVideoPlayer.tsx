'use client';

import React, { useRef, useState, useEffect } from 'react';
import { parseYouTubeUrl } from '@/lib/utils/youtube';

interface FeedVideoPlayerProps {
  videoUrl: string;
  thumbnailUrl?: string;
  caption?: string;
}

export function FeedVideoPlayer({ videoUrl, thumbnailUrl, caption }: FeedVideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Video autoplays only when 60% or more visible in the viewport
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

  const ytInfo = parseYouTubeUrl(videoUrl, { autoplay: isVisible, mute: true });
  const isYouTube = ytInfo.isYouTube || Boolean(videoUrl?.includes('youtube.com') || videoUrl?.includes('youtu.be'));
  const youtubeSrc = isYouTube ? (ytInfo.embedUrl || videoUrl) : '';

  useEffect(() => {
    if (isYouTube || !videoRef.current) return;

    if (isVisible) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {});
      }
    } else {
      videoRef.current.pause();
    }
  }, [isVisible, isYouTube]);

  return (
    <div
      ref={containerRef}
      className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-slate-200 dark:border-slate-800 shadow-inner"
    >
      {isYouTube ? (
        <iframe
          src={youtubeSrc}
          title={caption || 'YouTube Video'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="w-full h-full border-0"
        />
      ) : (
        <video
          ref={videoRef}
          src={videoUrl}
          poster={thumbnailUrl}
          controls
          muted
          loop
          playsInline
          className="w-full h-full object-cover"
        />
      )}
    </div>
  );
}

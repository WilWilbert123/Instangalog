'use client';

import React, { useRef, useState, useEffect } from 'react';
import { parseMediaUrl } from '@/lib/utils/mediaEmbed';
import { Volume2, VolumeX, Music, Image as ImageIcon, Play } from 'lucide-react';

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

  const embedInfo = parseMediaUrl(videoUrl, { autoplay: isVisible, mute: isMuted });

  useEffect(() => {
    if (embedInfo.isEmbeddable || embedInfo.isDirectImage || !videoRef.current) return;

    if (isVisible) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => { });
      }
    } else {
      videoRef.current.pause();
    }
  }, [isVisible, embedInfo.isEmbeddable, embedInfo.isDirectImage]);

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-slate-200 dark:border-slate-800 shadow-inner group flex items-center justify-center"
    >
      {embedInfo.isEmbeddable ? (
        isVisible ? (
          <iframe
            src={embedInfo.embedUrl}
            title={caption || `${embedInfo.type} player`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="w-full h-full border-0 pointer-events-auto"
          />
        ) : (
          <div className="relative w-full h-full flex flex-col items-center justify-center bg-slate-900 p-4 text-center">
            {(thumbnailUrl || embedInfo.thumbnailUrl) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thumbnailUrl || embedInfo.thumbnailUrl || ''}
                alt={caption || 'Video preview'}
                className="absolute inset-0 w-full h-full object-cover opacity-60"
              />
            )}
            <div className="relative z-10 w-10 h-10 rounded-full bg-black/70 backdrop-blur-md flex items-center justify-center border border-white/20 text-white">
              <Play className="w-5 h-5 fill-white translate-x-0.5" />
            </div>
          </div>
        )
      ) : embedInfo.isDirectImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={embedInfo.rawUrl}
          alt={caption || 'Shared Media'}
          className="w-full h-full object-contain"
        />
      ) : embedInfo.isDirectAudio ? (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 p-6 text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center animate-pulse">
            <Music className="w-8 h-8" />
          </div>
          <p className="text-xs font-bold text-white max-w-xs line-clamp-1">{caption || 'Audio Track'}</p>
          <audio src={embedInfo.rawUrl} controls className="w-full max-w-sm h-10" />
        </div>
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
    </div>
  );
}

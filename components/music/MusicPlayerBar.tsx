'use client';

import React, { useRef, useEffect } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { Play, Pause, Volume2, VolumeX, X, Disc, RotateCcw, RotateCw } from 'lucide-react';

export function MusicPlayerBar() {
  const { currentTrack, isPlaying, progress, duration, volume, togglePlay, setProgress, setDuration, setVolume, closePlayer } = usePlayerStore();
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!audioRef.current || !currentTrack) return;

    if (isPlaying) {
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, currentTrack]);

  if (!currentTrack) return null;

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setProgress(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setProgress(time);
    }
  };

  const handleRewind = () => {
    if (audioRef.current) {
      const newTime = Math.max(0, audioRef.current.currentTime - 10);
      audioRef.current.currentTime = newTime;
      setProgress(newTime);
    }
  };

  const handleFastForward = () => {
    if (audioRef.current) {
      const maxDuration = duration || audioRef.current.duration || 9999;
      const newTime = Math.min(maxDuration, audioRef.current.currentTime + 10);
      audioRef.current.currentTime = newTime;
      setProgress(newTime);
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds <= 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="fixed bottom-16 md:bottom-4 left-4 right-4 md:left-68 md:right-8 z-40 p-3 rounded-2xl glass-card border border-slate-300 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 text-slate-900 dark:text-white shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
      <audio
        ref={audioRef}
        src={currentTrack.audio_url}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => usePlayerStore.getState().pauseTrack()}
        onError={() => usePlayerStore.getState().pauseTrack()}
      />

      <div className="flex items-center justify-between gap-4">
        {/* Track Info & Cover */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shrink-0 bg-slate-100 dark:bg-slate-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={currentTrack.cover_url} alt={currentTrack.title} className="w-full h-full object-cover" />
            <div className={`absolute inset-0 bg-black/40 flex items-center justify-center ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '8s' }}>
              <Disc className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="truncate">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{currentTrack.title}</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{currentTrack.artist}</p>
          </div>
        </div>

        {/* Player Controls & Seekbar */}
        <div className="hidden sm:flex flex-col items-center flex-1 max-w-md gap-1">
          <div className="flex items-center gap-3">
            <button
              onClick={handleRewind}
              className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-black dark:hover:text-white transition-colors"
              title="Rewind 10s"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={togglePlay}
              className="p-2.5 rounded-full bg-black text-white dark:bg-white dark:text-black shadow-md hover:opacity-90 transition-transform active:scale-95"
              aria-label={isPlaying ? 'Pause music' : 'Play music'}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current translate-x-0.5" />}
            </button>

            <button
              onClick={handleFastForward}
              className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-black dark:hover:text-white transition-colors"
              title="Fast Forward 10s"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-2 w-full text-[10px] text-slate-500 dark:text-slate-400">
            <span>{formatTime(progress)}</span>
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={progress}
              onChange={handleSeek}
              className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-black dark:accent-white"
            />
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Mobile Controls & Close */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleRewind}
            className="sm:hidden p-1.5 text-slate-500 dark:text-slate-400 hover:text-black dark:hover:text-white"
            title="Rewind 10s"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={togglePlay}
            className="sm:hidden p-2.5 rounded-full bg-black text-white dark:bg-white dark:text-black shadow-md"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current translate-x-0.5" />}
          </button>

          <button
            onClick={handleFastForward}
            className="sm:hidden p-1.5 text-slate-500 dark:text-slate-400 hover:text-black dark:hover:text-white"
            title="Fast Forward 10s"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setVolume(volume === 0 ? 0.8 : 0)}
            className="hidden lg:block p-2 text-slate-400 hover:text-black dark:hover:text-white"
          >
            {volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            onClick={closePlayer}
            className="p-1.5 text-slate-400 hover:text-black dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-white/10"
            aria-label="Close music player"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

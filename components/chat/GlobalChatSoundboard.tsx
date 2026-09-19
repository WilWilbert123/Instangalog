'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Radio, ChevronUp, Play, Music2 } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { sendSoundBroadcast, SoundBroadcastPayload } from '@/lib/services/chatService';

export interface SoundItem {
  id: string;
  label: string;
  filename: string;
  url: string;
}

export const SOUND_BOARD_ITEMS: SoundItem[] = [
  { id: 'hahagago', label: 'Haha Gago', filename: 'hahagago.mp3', url: '/sounds/hahagago.mp3' },
  { id: 'hahaha', label: 'Hahaha', filename: 'hahaha.mp3', url: '/sounds/hahaha.mp3' },
  { id: 'hoybakla', label: 'Hoy Bakla', filename: 'hoybakla.mp3', url: '/sounds/hoybakla.mp3' },
  { id: 'masonako', label: 'Mason Ako', filename: 'masonako.mp3', url: '/sounds/masonako.mp3' },
  { id: 'maysayad', label: 'May Sayad', filename: 'maysayad.mp3', url: '/sounds/maysayad.mp3' },
  { id: 'potanginamoka', label: 'Potanginamoka', filename: 'potanginamoka.mp3', url: '/sounds/potanginamoka.mp3' },
];

interface GlobalChatSoundboardProps {
  onSoundTriggered?: (sound: SoundItem, onEnded?: () => void) => void;
  isMuted?: boolean;
  onToggleMute?: () => void;
}

const COOLDOWN_SECONDS = 5;

export function GlobalChatSoundboard({
  onSoundTriggered,
  isMuted = false,
  onToggleMute,
}: GlobalChatSoundboardProps) {
  const { user, openAuthModal } = useAuthStore();
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const [activeSoundId, setActiveSoundId] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const cooldownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const localAudioRef = useRef<HTMLAudioElement | null>(null);

  // Close dropdown menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  // Clean up timer and audio on unmount
  useEffect(() => {
    return () => {
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current);
      }
      if (localAudioRef.current) {
        localAudioRef.current.pause();
        localAudioRef.current = null;
      }
    };
  }, []);

  const isLocked = isPlayingAudio || cooldownRemaining > 0;

  const triggerSound = (sound: SoundItem) => {
    if (!user) {
      openAuthModal('Sign in to play sound effects in Global Chat');
      return;
    }

    // Per user: only 1 sound can be played at a time until finished + min 5s cooldown
    if (isLocked) return;

    setIsPlayingAudio(true);
    setActiveSoundId(sound.id);
    setCooldownRemaining(COOLDOWN_SECONDS);

    if (cooldownIntervalRef.current) {
      clearInterval(cooldownIntervalRef.current);
    }

    const startTime = Date.now();
    let soundCompleted = false;

    const handleEnded = () => {
      soundCompleted = true;
      setIsPlayingAudio(false);
      // If 5s cooldown is already finished, unlock activeSoundId
      if (Date.now() - startTime >= COOLDOWN_SECONDS * 1000) {
        setActiveSoundId(null);
      }
    };

    cooldownIntervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const rem = Math.max(0, Math.ceil(COOLDOWN_SECONDS - elapsed));
      setCooldownRemaining(rem);

      if (rem <= 0 && soundCompleted) {
        if (cooldownIntervalRef.current) {
          clearInterval(cooldownIntervalRef.current);
          cooldownIntervalRef.current = null;
        }
        setActiveSoundId(null);
      }
    }, 200);

    // 1. Play audio locally through parent mixer (with onEnded callback)
    if (onSoundTriggered) {
      onSoundTriggered(sound, handleEnded);
    } else if (!isMuted) {
      try {
        if (localAudioRef.current) {
          localAudioRef.current.pause();
          localAudioRef.current.currentTime = 0;
        }
        const audio = new Audio(sound.url);
        audio.volume = 0.85;
        localAudioRef.current = audio;
        audio.onended = handleEnded;
        audio.onerror = handleEnded;
        audio.play().catch((err) => {
          console.warn('[Soundboard] Local audio play prevented:', err);
          handleEnded();
        });
      } catch (e) {
        console.warn('[Soundboard] Audio init error:', e);
        handleEnded();
      }
    }

    // 2. Broadcast sound in real-time to all connected users in Global Chat
    const payload: SoundBroadcastPayload = {
      soundId: sound.id,
      soundName: sound.label,
      soundUrl: sound.url,
      senderId: user.id,
      senderName: user.display_name || user.username || 'User',
      senderAvatar: user.avatar_url,
      timestamp: Date.now(),
    };

    sendSoundBroadcast(payload);

    // Close menu if open
    setIsMenuOpen(false);
  };

  return (
    <div className="relative flex items-center shrink-0" ref={menuRef}>
      {/* Soundboard Button: Icon-only on mobile to maximize text input width */}
      <button
        type="button"
        onClick={() => setIsMenuOpen((prev) => !prev)}
        title="More Sounds (Global Soundboard)"
        className={`p-2 sm:px-3 sm:py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 sm:gap-1.5 border transition-all active:scale-95 shrink-0 ${
          isMenuOpen
            ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-md'
            : isLocked
            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
            : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 shadow-sm'
        }`}
      >
        <Volume2 className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 shrink-0 ${isPlayingAudio ? 'animate-pulse' : ''}`} />
        
        {/* Text on larger screens */}
        <span className="text-xs font-bold hidden sm:inline">
          {isPlayingAudio ? 'Playing' : (cooldownRemaining > 0 ? `${cooldownRemaining}s` : 'More')}
        </span>

        {/* Small countdown on mobile only when cooling down */}
        {cooldownRemaining > 0 && !isPlayingAudio && (
          <span className="text-[10px] font-mono font-bold sm:hidden text-amber-500">
            {cooldownRemaining}s
          </span>
        )}

        <ChevronUp
          className={`w-3 h-3 text-slate-400 transition-transform duration-200 hidden sm:block ${
            isMenuOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Floating Soundboard Popover with all 6 sounds */}
      {isMenuOpen && (
        <div className="absolute bottom-full right-0 mb-2 w-64 sm:w-72 p-2.5 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center justify-between px-2 py-1.5 mb-1.5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5">
              <Music2 className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-xs font-bold text-slate-900 dark:text-white">Soundboard</span>
            </div>
            <div className="flex items-center gap-1">
              {onToggleMute && (
                <button
                  type="button"
                  onClick={onToggleMute}
                  title={isMuted ? 'Unmute sounds' : 'Mute sounds'}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition"
                >
                  {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-500" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-500" />}
                </button>
              )}
              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                {isPlayingAudio
                  ? 'Playing...'
                  : cooldownRemaining > 0
                  ? `${cooldownRemaining}s cooldown`
                  : '1 at a time'}
              </span>
            </div>
          </div>

          {/* 6 Sounds Grid */}
          <div className="grid grid-cols-2 gap-1.5 p-0.5">
            {SOUND_BOARD_ITEMS.map((sound) => {
              const isActive = activeSoundId === sound.id;
              return (
                <button
                  key={sound.id}
                  type="button"
                  disabled={isLocked}
                  onClick={() => triggerSound(sound)}
                  className={`px-2.5 py-2 rounded-xl text-left text-xs font-medium flex items-center justify-between border transition-all active:scale-95 disabled:cursor-not-allowed ${
                    isActive
                      ? 'bg-amber-500 text-white border-amber-400 shadow-md shadow-amber-500/20 font-bold'
                      : isLocked
                      ? 'bg-slate-50 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 border-slate-200/50 dark:border-slate-800/50 opacity-60'
                      : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/70 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700/60'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Play className={`w-3 h-3 shrink-0 ${isActive ? 'text-white' : 'text-amber-500'}`} />
                    <span className="truncate font-semibold">{sound.label}</span>
                  </div>
                  {isActive && isLocked && (
                    <span className="text-[10px] font-mono font-bold ml-1">
                      {isPlayingAudio ? '♪' : `${cooldownRemaining}s`}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Clean status footer: Removed "Plays in real-time to all users in chat" */}
          {isLocked && (
            <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800 px-1 flex items-center justify-between text-[10px] text-amber-500 font-bold">
              <span>{isPlayingAudio ? 'Sound is playing...' : 'Cooldown active'}</span>
              <span className="font-mono">{isPlayingAudio ? '1 sound at a time' : `${cooldownRemaining}s`}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

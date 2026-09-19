'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChatMessage } from '@/types/chat';
import {
  getGlobalChatMessages,
  sendChatMessage,
  subscribeToGlobalChat,
  sendTypingBroadcast,
  TypingUser,
  SoundBroadcastPayload,
  FloatingReactionPayload,
  sendReactionBroadcast,
} from '@/lib/services/chatService';
import { useAuthStore } from '@/stores/authStore';
import { getAvatarUrl, getCartoonAvatar } from '@/lib/utils/avatar';
import { Send, Users, Sparkles, MessageSquare, Mail, Radio, Volume2, VolumeX } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Import Tab Components
import { DirectMessagesTab } from './DirectMessagesTab';
import { MusicLoungeTab } from './MusicLoungeTab';
import { GlobalChatSoundboard } from './GlobalChatSoundboard';

interface GlobalChatDrawerProps {
  className?: string;
  simpleMode?: boolean;
}

type TabType = 'chat' | 'dms' | 'music';

function getUniqueUserColor(identifier: string) {
  if (!identifier) {
    return {
      textColor: 'hsl(38, 95%, 55%)',
      bgStyle: { backgroundColor: 'hsla(38, 95%, 55%, 0.08)', borderColor: 'hsla(38, 95%, 55%, 0.25)' },
      ringStyle: { boxShadow: '0 0 0 2px hsla(38, 95%, 55%, 0.5)' },
    };
  }

  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = identifier.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hue = Math.abs(hash) % 360;
  // High saturation (85%) & balanced lightness (55%) ensure ultra-vibrant colors per user
  const textColor = `hsl(${hue}, 85%, 55%)`;
  const bgStyle = {
    backgroundColor: `hsla(${hue}, 85%, 55%, 0.07)`,
    borderColor: `hsla(${hue}, 85%, 55%, 0.22)`,
  };
  const ringStyle = {
    boxShadow: `0 0 0 2px hsla(${hue}, 85%, 55%, 0.45)`,
  };

  return { textColor, bgStyle, ringStyle };
}

function cleanDisplayName(name: string): string {
  if (!name) return 'Someone';
  return name.replace(/\s*\([^)]*\)/g, '').trim() || name;
}

function formatTypingStatus(users: TypingUser[]): { text: string; primaryUser?: TypingUser } {
  if (users.length === 0) return { text: '' };

  const names = users.map((u) => cleanDisplayName(u.displayName));
  const primaryUser = users[0];

  if (users.length === 1) {
    return { text: `${names[0]} is typing`, primaryUser };
  }
  if (users.length === 2) {
    return { text: `${names[0]} and ${names[1]} are typing`, primaryUser };
  }
  return { text: `${names[0]}, ${names[1]}, and ${users.length - 2} others are typing`, primaryUser };
}

export function GlobalChatDrawer({ className, simpleMode = false }: GlobalChatDrawerProps = {}) {
  const { user, openAuthModal } = useAuthStore();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const [sendError, setSendError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playingSoundToast, setPlayingSoundToast] = useState<{
    senderName: string;
    soundName: string;
  } | null>(null);

  interface FloatingSound {
    id: string;
    soundName: string;
    senderName: string;
    x: number;
  }
  const [floatingSounds, setFloatingSounds] = useState<FloatingSound[]>([]);

  interface FloatingPngItem {
    id: string;
    imageUrl: string;
    x: number;
  }
  const [floatingPngs, setFloatingPngs] = useState<FloatingPngItem[]>([]);
  const lastPngSentRef = useRef<number>(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const soundToastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeVoicesRef = useRef<{ id: string; soundId: string; audio: HTMLAudioElement }[]>([]);
  const lastPlayedSoundTimesRef = useRef<Record<string, number>>({});
  const isMutedRef = useRef(isMuted);

  const pathnameRef = useRef(pathname);
  const activeTabRef = useRef(activeTab);
  const simpleModeRef = useRef(simpleMode);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    simpleModeRef.current = simpleMode;
  }, [simpleMode]);

  // When switching tabs inside the drawer (e.g. going to Pagpag Party or DMs), immediately stop all playing soundboard audio
  useEffect(() => {
    activeTabRef.current = activeTab;
    if (!simpleMode && activeTab !== 'chat') {
      activeVoicesRef.current.forEach((v) => {
        try {
          v.audio.pause();
          v.audio.currentTime = 0;
        } catch {
          // ignore
        }
      });
      activeVoicesRef.current = [];
    }
  }, [activeTab, simpleMode]);

  // When navigating away from /chat or home (with simpleMode), immediately stop all playing soundboard audio
  useEffect(() => {
    pathnameRef.current = pathname;
    const isGlobalChatAllowed = simpleMode || pathname === '/chat' || pathname?.startsWith('/chat/');
    if (!isGlobalChatAllowed) {
      activeVoicesRef.current.forEach((v) => {
        try {
          v.audio.pause();
          v.audio.currentTime = 0;
        } catch {
          // ignore
        }
      });
      activeVoicesRef.current = [];
    }
  }, [pathname, simpleMode]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // Spawn smooth floating PNG reaction (no background, scales small to slightly big)
  const spawnFloatingPng = useCallback((imageUrl: string) => {
    const randomX = Math.floor(Math.random() * 55) + 20; // random 20% to 75%
    const newPng: FloatingPngItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      imageUrl,
      x: randomX,
    };
    setFloatingPngs((prev) => [...prev.slice(-10), newPng]);
    setTimeout(() => {
      setFloatingPngs((prev) => prev.filter((item) => item.id !== newPng.id));
    }, 3100);
  }, []);

  const handleTriggerPngReaction = (type: 'bai' | 'pagpag') => {
    if (!user) {
      openAuthModal('Sign in to react in Global Chat');
      return;
    }
    const now = Date.now();
    if (now - lastPngSentRef.current < 350) return; // debounce
    lastPngSentRef.current = now;

    const imageUrl = type === 'bai' ? '/instabai/bai.png' : '/instabai/pagpag.png';

    // 1. Spawn locally
    spawnFloatingPng(imageUrl);

    // 2. Broadcast in real-time to all connected users in Global Chat
    sendReactionBroadcast({
      reactionId: type,
      imageUrl,
      senderId: user.id,
      senderName: user.display_name || user.username || 'User',
      timestamp: now,
    });
  };

  // Spawn smooth floating sound reaction badge that drifts upwards across chat
  const spawnFloatingSound = useCallback((soundName: string, senderName: string) => {
    const randomX = Math.floor(Math.random() * 55) + 15; // random 15% to 70%
    const newFloating: FloatingSound = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      soundName,
      senderName,
      x: randomX,
    };
    setFloatingSounds((prev) => [...prev.slice(-6), newFloating]);
    setTimeout(() => {
      setFloatingSounds((prev) => prev.filter((item) => item.id !== newFloating.id));
    }, 2600);
  }, []);

  // Check if current view is actively inside Global Chat (either on /chat route or embedded on Home)
  const checkIsInsideGlobalChat = useCallback(() => {
    // If in simpleMode (e.g. embedded on Home split-view)
    if (simpleModeRef.current) {
      if (typeof window !== 'undefined' && containerRef.current) {
        // If hidden by responsive CSS (e.g. mobile hidden lg:grid)
        if (containerRef.current.offsetParent === null && window.innerWidth < 1024) {
          return false;
        }
      }
      return true;
    }
    // Standard full mode on /chat
    return (pathnameRef.current === '/chat' || pathnameRef.current?.startsWith('/chat/')) && activeTabRef.current === 'chat';
  }, []);

  // Smart Concurrency Limiter & Dynamic Ducking Audio Mixer
  const playManagedSound = useCallback((soundUrl: string, soundId: string, onEnded?: () => void) => {
    // Plays audio if user is inside Global Chat (either /chat page or embedded on Home)
    const isInsideGlobalChat = checkIsInsideGlobalChat();
    if (!isInsideGlobalChat || isMutedRef.current) {
      onEnded?.();
      return;
    }

    const now = Date.now();
    const lastTime = lastPlayedSoundTimesRef.current[soundId] || 0;

    // 1. Anti-Echo / Phasing Filter:
    // If the EXACT same sound was started within 350ms, skip duplicate audio
    // to avoid screeching robotic comb-filter echo.
    if (now - lastTime < 350) {
      onEnded?.();
      return;
    }
    lastPlayedSoundTimesRef.current[soundId] = now;

    // 2. Clean up ended or paused voices from pool
    activeVoicesRef.current = activeVoicesRef.current.filter((voice) => {
      return !voice.audio.ended && !voice.audio.paused;
    });

    // 3. Concurrency Limiter: Max 2 simultaneous voices
    // If already at limit, gracefully stop the oldest voice
    if (activeVoicesRef.current.length >= 2) {
      const oldest = activeVoicesRef.current.shift();
      if (oldest) {
        try {
          oldest.audio.volume = 0;
          oldest.audio.pause();
        } catch {
          // ignore
        }
      }
    }

    // 4. Dynamic Volume Ducking (Inverse Multi-Speaker Scaling):
    // 1 active sound = 0.85 (clear, punchy)
    // 2 active sounds = dynamically duck down to 0.48 each so mix never clips or annoys
    const activeCount = activeVoicesRef.current.length + 1;
    const duckedVolume = activeCount === 1 ? 0.85 : 0.48;

    activeVoicesRef.current.forEach((voice) => {
      try {
        voice.audio.volume = duckedVolume;
      } catch {
        // ignore
      }
    });

    // 5. Play new sound instance
    try {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.setAttribute('playsinline', 'true');
      audio.src = soundUrl;
      audio.volume = duckedVolume;
      const voiceInstance = {
        id: `${now}-${Math.random()}`,
        soundId,
        audio,
      };
      activeVoicesRef.current.push(voiceInstance);

      let endedCalled = false;
      const triggerEnded = () => {
        if (!endedCalled) {
          endedCalled = true;
          onEnded?.();
        }
      };

      audio.onended = () => {
        activeVoicesRef.current = activeVoicesRef.current.filter((v) => v.id !== voiceInstance.id);
        activeVoicesRef.current.forEach((v) => {
          try {
            v.audio.volume = 0.85;
          } catch {
            // ignore
          }
        });
        triggerEnded();
      };

      audio.onerror = () => {
        activeVoicesRef.current = activeVoicesRef.current.filter((v) => v.id !== voiceInstance.id);
        triggerEnded();
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('[GlobalChat] Audio play prevented by browser policy:', err);
          triggerEnded();
        });
      }
    } catch (err) {
      console.warn('[GlobalChat] Audio init error:', err);
      onEnded?.();
    }
  }, [checkIsInsideGlobalChat]);

  useEffect(() => {
    // Unlock browser audio permissions on user's first click/touch anywhere
    const unlockAudio = () => {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          if (ctx.state === 'suspended') {
            ctx.resume();
          }
        }
      } catch {
        // ignore
      }
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };

    window.addEventListener('click', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });
    window.addEventListener('touchstart', unlockAudio, { once: true });

    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      if (soundToastTimeoutRef.current) clearTimeout(soundToastTimeoutRef.current);
      activeVoicesRef.current.forEach((v) => {
        try {
          v.audio.pause();
        } catch {
          // ignore
        }
      });
      activeVoicesRef.current = [];
    };
  }, []);

  useEffect(() => {
    // Fetch initial message history
    getGlobalChatMessages().then(setMessages);

    // Subscribe to Supabase Realtime WebSockets
    const currentUserPayload = user
      ? { id: user.id, display_name: user.display_name }
      : null;

    const unsubscribe = subscribeToGlobalChat(
      currentUserPayload,
      (newMsg) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      },
      (typingList) => {
        setTypingUsers(
          typingList.filter((item) => {
            if (user?.id && item.userId === user.id) return false;
            return true;
          })
        );
      },
      (count) => {
        setOnlineCount(count);
      },
      undefined,
      (soundPayload: SoundBroadcastPayload) => {
        // Sounds play if the user is inside Global Chat (/chat or embedded on Home)
        const isInsideGlobalChat = checkIsInsideGlobalChat();
        if (!isInsideGlobalChat) return;

        // Show real-time announcement toast
        setPlayingSoundToast({
          senderName: soundPayload.senderName,
          soundName: soundPayload.soundName,
        });
        if (soundToastTimeoutRef.current) clearTimeout(soundToastTimeoutRef.current);
        soundToastTimeoutRef.current = setTimeout(() => {
          setPlayingSoundToast(null);
        }, 3500);

        // Spawn smooth floating sound badge
        spawnFloatingSound(soundPayload.soundName, soundPayload.senderName);

        // Do not double-play if local user was the sender
        if (user?.id && soundPayload.senderId === user.id) return;

        // Play audio through smart concurrency & dynamic ducking mixer
        playManagedSound(soundPayload.soundUrl, soundPayload.soundId);
      },
      (reactionPayload: FloatingReactionPayload) => {
        // Floating PNG reactions display if the user is inside Global Chat
        const isInsideGlobalChat = checkIsInsideGlobalChat();
        if (!isInsideGlobalChat) return;

        if (reactionPayload?.imageUrl) {
          spawnFloatingPng(reactionPayload.imageUrl);
        }
      }
    );

    return () => {
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.display_name, spawnFloatingSound, spawnFloatingPng, playManagedSound, checkIsInsideGlobalChat]);

  useEffect(() => {
    if (activeTab === 'chat' || simpleMode) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, typingUsers, activeTab, simpleMode]);

  useEffect(() => {
    if (sendError) {
      const t = setTimeout(() => setSendError(null), 4000);
      return () => clearTimeout(t);
    }
  }, [sendError]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const text = e.target.value;
      setInputText(text);

      if (user) {
        if (text.trim().length > 0) {
          sendTypingBroadcast({ id: user.id, display_name: user.display_name }, true);

          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => {
            sendTypingBroadcast({ id: user.id, display_name: user.display_name }, false);
          }, 3000);
        } else {
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          sendTypingBroadcast({ id: user.id, display_name: user.display_name }, false);
        }
      }
    },
    [user]
  );

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      openAuthModal('Sign in to send chat messages');
      return;
    }
    if (!inputText.trim()) return;

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    sendTypingBroadcast({ id: user.id, display_name: user.display_name }, false);

    try {
      const sent = await sendChatMessage(user.id, inputText);
      if (sent) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === sent.id)) return prev;
          return [...prev, sent];
        });
      }
      setInputText('');
      setSendError(null);
    } catch (err: any) {
      setSendError(err?.message || 'Failed to send message');
    }
  };

  const handleBroadcastFromTab = async (msgText: string) => {
    if (!user) {
      openAuthModal('Sign in to share game score');
      return;
    }
    try {
      const sent = await sendChatMessage(user.id, msgText);
      if (sent) {
        setMessages((prev) => [...prev, sent]);
      }
    } catch {
      // ignore
    }
  };

  const typingInfo = formatTypingStatus(typingUsers);

  return (
    <div
      ref={containerRef}
      className={`w-full flex flex-col rounded-2xl glass-card border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/80 text-slate-900 dark:text-white shadow-2xl overflow-hidden min-h-0 transition-colors duration-200 ${className || 'max-w-4xl mx-auto h-[calc(100dvh-10rem)] md:h-[calc(100vh-6rem)]'}`}
    >

      {/* Main Header with Logo & Online Counter */}
      <div className="px-3 sm:px-6 py-1.5 sm:py-3.5 glass-header flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/80 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-7 h-7 sm:w-10 sm:h-10 flex items-center justify-center bg-transparent shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/pagpag.png" alt="Pagpag Logo" className="w-full h-full object-contain bg-transparent" />
          </div>
          <div>
            <h2 className="text-xs sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5 sm:gap-2">
              {simpleMode ? 'Global Chat' : 'Community Hub'}
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 animate-pulse" />
            </h2>
            <p className="text-[9px] sm:text-[11px] text-slate-500 dark:text-slate-400">Tangalog Bisayawa Lounge</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsMuted((prev) => !prev)}
            title={isMuted ? 'Global Soundboard Muted (Click to Unmute)' : 'Global Soundboard Active (Click to Mute)'}
            className={`px-2 py-1 rounded-full text-[10px] sm:text-xs font-semibold border flex items-center gap-1 transition-all active:scale-95 ${isMuted
                ? 'bg-rose-500/10 text-rose-500 border-rose-500/30 hover:bg-rose-500/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:text-amber-500'
              }`}
          >
            {isMuted ? <VolumeX className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-rose-500" /> : <Volume2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-500" />}
            <span className="hidden sm:inline font-bold">{isMuted ? 'Muted' : 'SFX'}</span>
          </button>

          <div className="flex items-center gap-1 text-[10px] sm:text-xs font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 shadow-sm shrink-0" title={`${onlineCount} Online Now`}>
            <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-emerald-500" />
            </span>
            <span>{onlineCount} Online</span>
          </div>
        </div>
      </div>

      {/* Interactive Tabs Navigation Bar (Hidden in Simple Mode) - Compact on Mobile */}
      {!simpleMode && (
        <div className="px-1.5 sm:px-4 py-1.5 sm:py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/60 flex items-center justify-between gap-1 sm:gap-1.5 shrink-0">
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-1.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1 sm:gap-2 transition flex-1 min-w-0 ${activeTab === 'chat'
                ? 'bg-black text-white dark:bg-white dark:text-black shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
          >
            <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">Global Chat</span>
          </button>

          <button
            onClick={() => setActiveTab('dms')}
            className={`px-1.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1 sm:gap-2 transition flex-1 min-w-0 ${activeTab === 'dms'
                ? 'bg-black text-white dark:bg-white dark:text-black shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
          >
            <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">Direct Messages</span>
          </button>

          <button
            onClick={() => setActiveTab('music')}
            className={`px-1.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1 sm:gap-2 transition flex-1 min-w-0 ${activeTab === 'music'
                ? 'bg-black text-white dark:bg-white dark:text-black shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/pagpag.png" alt="Pagpag" className="w-3.5 h-3.5 sm:w-4 sm:h-4 object-contain bg-transparent shrink-0" />
            <span className="truncate">Pagpag Party</span>
          </button>
        </div>
      )}

      {/* Tab Contents View */}
      {activeTab === 'chat' && (
        <div className="relative flex-1 min-h-0 flex flex-col">
          {/* Floating Sound Badges Drifting Smoothly Upwards from Button */}
          <div className="absolute inset-x-0 bottom-14 pointer-events-none z-30 overflow-hidden h-[340px]">
            {floatingSounds.map((item) => (
              <div
                key={item.id}
                style={{ left: `${item.x}%` }}
                className="absolute bottom-0 px-3 py-1.5 rounded-full bg-slate-900/95 dark:bg-black/95 text-white border border-amber-500/50 shadow-2xl shadow-amber-500/20 text-xs font-bold flex items-center gap-1.5 animate-floatUpSound backdrop-blur-md"
              >
                <Volume2 className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-bounce" />
                <span className="text-amber-400 font-bold">{item.soundName}</span>
                <span className="text-slate-400 text-[10px] font-normal">• {item.senderName}</span>
              </div>
            ))}
          </div>

          {/* Floating Pure PNG Reactions (Bai & Pagpag) - No background, no borders, scales small to slightly big */}
          <div className="absolute inset-x-0 bottom-14 pointer-events-none z-40 overflow-hidden h-[480px]">
            {floatingPngs.map((item) => (
              <div
                key={item.id}
                style={{ left: `${item.x}%` }}
                className="absolute bottom-0 pointer-events-none animate-floatUpPng select-none z-40"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.imageUrl}
                  alt="Floating Reaction"
                  className={
                    item.imageUrl.includes('pagpag')
                      ? 'w-24 h-24 sm:w-32 sm:h-32 scale-135 object-contain drop-shadow-2xl select-none'
                      : 'w-16 h-16 sm:w-20 sm:h-20 object-contain drop-shadow-2xl select-none'
                  }
                />
              </div>
            ))}
          </div>

          {/* Message History */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4 hide-scrollbar bg-slate-50/50 dark:bg-slate-950/50">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-3 text-slate-500 dark:text-slate-400">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center shadow-sm">
                  <MessageSquare className="w-6 h-6 text-slate-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">No real messages yet</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mt-0.5">Be the first to send a live message to the Instangalog community!</p>
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = Boolean(user && (user.id === msg.user_id || user.username.toLowerCase() === msg.author?.username?.toLowerCase()));
                const author = isMe && user
                  ? {
                    display_name: user.display_name,
                    username: user.username,
                    avatar_url: user.avatar_url,
                    role: user.role,
                  }
                  : msg.author || {
                    display_name: 'Member',
                    username: 'member',
                    avatar_url: '',
                    role: 'user',
                  };

                const avatarSrc = getAvatarUrl(author.avatar_url, author.username || author.display_name || 'user');
                const userColor = getUniqueUserColor(author.username || author.display_name || 'user');

                return (
                  <div key={msg.id} className={`flex items-start gap-2.5 sm:gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                    <Link href={`/profile/${author.username}`} className="shrink-0 group">
                      <div
                        style={author.role === 'admin' ? undefined : userColor.ringStyle}
                        className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 transition-transform group-hover:scale-105 shadow-sm ${author.role === 'admin'
                            ? 'ring-2 ring-amber-400 dark:ring-amber-500'
                            : ''
                          }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={avatarSrc}
                          alt={author.display_name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = getCartoonAvatar(author.username || author.display_name || 'user');
                          }}
                        />
                      </div>
                    </Link>

                    <div className={`max-w-[80%] sm:max-w-md space-y-1 flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className={`flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 ${isMe ? 'flex-row-reverse' : ''}`}>
                        <span
                          style={isMe ? undefined : { color: userColor.textColor }}
                          className={`font-extrabold transition-colors ${isMe ? 'text-slate-900 dark:text-white' : ''}`}
                        >
                          {author.display_name}
                        </span>

                        {author.role === 'admin' && (
                          <span className="px-1.5 py-0.2 text-[9px] rounded-md bg-gradient-to-r from-amber-500 to-orange-500 text-black font-black shadow-sm tracking-wider">
                            ADMIN
                          </span>
                        )}

                        <span className="text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-500">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div
                        style={isMe ? undefined : userColor.bgStyle}
                        className={`p-3 rounded-2xl text-xs sm:text-sm leading-relaxed transition-all shadow-sm w-fit max-w-full break-words ${isMe
                            ? 'bg-gradient-to-r from-slate-900 to-black text-white dark:bg-gradient-to-r dark:from-white dark:to-slate-100 dark:text-black rounded-tr-xs border border-slate-700 dark:border-slate-300 ml-auto'
                            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-xs hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                      >
                        {msg.message}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Typing Indicator */}
          {typingUsers.length > 0 && typingInfo.primaryUser && (
            <div className="px-4 py-1.5 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800/50 flex items-center gap-2 shrink-0">
              <div className="w-4 h-4 rounded-full overflow-hidden border border-emerald-500/40 bg-slate-100 dark:bg-slate-800 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getCartoonAvatar(typingInfo.primaryUser.displayName)}
                  alt="Typing..."
                  className="w-full h-full object-cover"
                />
              </div>

              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {typingInfo.text}
              </span>

              <div className="flex items-center gap-[2px]">
                <span className="w-1 h-1 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.32s] [animation-duration:0.6s]" />
                <span className="w-1 h-1 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.16s] [animation-duration:0.6s]" />
                <span className="w-1 h-1 rounded-full bg-emerald-500 animate-bounce [animation-duration:0.6s]" />
              </div>
            </div>
          )}

          {/* Real-time Playing Sound Notification Banner */}
          {playingSoundToast && (
            <div className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent border-t border-amber-500/30 flex items-center justify-between shrink-0 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center gap-2 min-w-0">
                <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 shrink-0 animate-bounce" />
                <span className="text-[11px] sm:text-xs text-slate-800 dark:text-slate-200 truncate">
                  <strong className="text-slate-900 dark:text-white font-bold">{playingSoundToast.senderName}</strong> played{' '}
                  <span className="font-bold text-amber-600 dark:text-amber-400">&quot;{playingSoundToast.soundName}&quot;</span>
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-2">
                <span className="w-1 h-3 rounded-full bg-amber-500 animate-pulse" />
                <span className="w-1 h-4 rounded-full bg-amber-500 animate-[pulse_0.4s_infinite]" />
                <span className="w-1 h-2 rounded-full bg-amber-500 animate-[pulse_0.2s_infinite]" />
              </div>
            </div>
          )}

          {sendError && (
            <div className="px-4 py-2 bg-rose-500/10 border-t border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium text-center shrink-0">
              {sendError}
            </div>
          )}

          {/* Input Footer */}
          <form onSubmit={handleSend} className="p-2 sm:p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-1 sm:gap-2 shrink-0">
            <input
              type="text"
              value={inputText}
              onChange={handleInputChange}
              placeholder={user ? 'Type a message...' : 'Sign in to chat...'}
              onClick={() => {
                if (!user) openAuthModal('Sign in to chat with the Instangalog community');
              }}
              className="flex-1 min-w-0 px-2.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-black dark:focus:border-white transition-colors"
            />

            {/* Bai PNG Button (Compact on mobile) */}
            <button
              type="button"
              onClick={() => handleTriggerPngReaction('bai')}
              title="React Bai"
              className="w-7 h-7 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-90 shrink-0 select-none p-0.5"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/instabai/bai.png"
                alt="Bai"
                className="w-full h-full object-contain select-none pointer-events-none hover:scale-110 transition-transform"
              />
            </button>

            {/* Pagpag PNG Button (Compact on mobile) */}
            <button
              type="button"
              onClick={() => handleTriggerPngReaction('pagpag')}
              title="React Pagpag"
              className="w-8 h-7 sm:w-10 sm:h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-90 shrink-0 select-none p-0.5 overflow-visible"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/instabai/pagpag.png"
                alt="Pagpag"
                className="w-full h-full object-contain select-none pointer-events-none hover:scale-125 transition-transform scale-125 sm:scale-135"
              />
            </button>

            <GlobalChatSoundboard
              isMuted={isMuted}
              onToggleMute={() => setIsMuted((prev) => !prev)}
              onSoundTriggered={(sound, onEnded) => {
                const myName = user?.display_name || user?.username || 'You';
                setPlayingSoundToast({
                  senderName: myName,
                  soundName: sound.label,
                });
                if (soundToastTimeoutRef.current) clearTimeout(soundToastTimeoutRef.current);
                soundToastTimeoutRef.current = setTimeout(() => {
                  setPlayingSoundToast(null);
                }, 3500);

                // 1. Spawn smooth floating sound reaction badge from button upwards
                spawnFloatingSound(sound.label, myName);

                // 2. Play local audio through smart mixer with dynamic ducking and concurrency limiter
                playManagedSound(sound.url, sound.id, onEnded);
              }}
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              title="Send message"
              className="p-2 sm:px-4 sm:py-2.5 rounded-xl bg-black text-white dark:bg-white dark:text-black font-bold text-xs shadow-md disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-1 sm:gap-1.5 shrink-0"
            >
              <span className="hidden sm:inline">Send</span>
              <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </form>
        </div>
      )}

      {activeTab === 'dms' && <DirectMessagesTab />}
      {activeTab === 'music' && <MusicLoungeTab />}

    </div>
  );
}

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Radio,
  Flame,
  Heart,
  Sparkles,
  Disc,
  Headphones,
  LogOut,
  Users,
  Music2,
  Send,
  ListMusic,
  Crown,
  Shuffle,
  Repeat,
  Repeat1,
  Plus,
  UploadCloud,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { getAvatarUrl, getCartoonAvatar } from '@/lib/utils/avatar';
import { supabase } from '@/lib/supabase/client';
import { parseMediaUrl } from '@/lib/utils/mediaEmbed';

interface AudioTrack {
  id: string;
  title: string;
  artist: string;
  cover: string;
  url: string;
  genre?: string;
  duration?: number;
}

interface StudioParticipant {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
}

interface FloatingVibe {
  id: string;
  type: 'fire' | 'love' | 'vibe' | 'pagpag';
  x: number; // percentage across studio
}

interface FloatingRequest {
  id: string;
  username: string;
  displayName: string;
  songTitle: string;
  x: number;
}

interface SongRequestItem {
  id: string;
  user_id: string;
  song_title: string;
  status: string;
  created_at: string;
  requester?: {
    username?: string;
    display_name?: string;
    avatar_url?: string;
  };
}

const PARTY_STUDIO_CHANNEL = 'pagpag-party-studio-room';

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function MusicLoungeTab() {
  const { user, openAuthModal } = useAuthStore();
  const [inStudio, setInStudio] = useState(false);
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  
  // Track audio playback state & progress
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Real-time floating elements
  const [floatingVibes, setFloatingVibes] = useState<FloatingVibe[]>([]);
  const [floatingRequests, setFloatingRequests] = useState<FloatingRequest[]>([]);

  // Data lists
  const [loadingTracks, setLoadingTracks] = useState(true);
  const [activeUsers, setActiveUsers] = useState<StudioParticipant[]>([]);
  const [songRequestInput, setSongRequestInput] = useState('');
  const [requestQueue, setRequestQueue] = useState<SongRequestItem[]>([]);
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [submittingRequest, setSubmittingRequest] = useState(false);

  // Admin upload track state
  const [showAddTrackForm, setShowAddTrackForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newArtist, setNewArtist] = useState('');
  const [newAudioUrl, setNewAudioUrl] = useState('');
  const [newCoverUrl, setNewCoverUrl] = useState('');
  const [newGenre, setNewGenre] = useState('');
  const [addingTrack, setAddingTrack] = useState(false);
  const [addTrackMsg, setAddTrackMsg] = useState('');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const channelRef = useRef<any>(null);
  const lastPresenceTimeUpdateRef = useRef<number>(0);

  const isAdmin = Boolean(
    user && (user.role === 'admin' || user.email?.toLowerCase() === 'johnwilbertgamis2022@gmail.com')
  );

  const tracksRef = useRef<AudioTrack[]>([]);
  useEffect(() => {
    tracksRef.current = tracks;
  }, [tracks]);

  const isAdminRef = useRef(isAdmin);
  useEffect(() => {
    isAdminRef.current = isAdmin;
  }, [isAdmin]);

  // 1. Fetch real music tracks from Supabase API route
  const fetchRealMusic = useCallback(async () => {
    setLoadingTracks(true);
    try {
      const res = await fetch('/api/music');
      const data = await res.json();
      if (data?.success && Array.isArray(data.music) && data.music.length > 0) {
        const mapped: AudioTrack[] = data.music.map((m: any) => ({
          id: m.id,
          title: m.title || 'Community Track',
          artist: m.artist || 'Community Artist',
          cover: m.coverUrl || '',
          url: m.audioUrl,
          genre: m.genre || 'Supabase Music',
          duration: m.duration || 0,
        }));
        setTracks(mapped);
      } else {
        setTracks([]);
      }
    } catch {
      setTracks([]);
    } finally {
      setLoadingTracks(false);
    }
  }, []);

  useEffect(() => {
    fetchRealMusic();
  }, [fetchRealMusic]);

  // 2. Fetch real active community members & song requests queue
  const fetchSongRequestsQueue = useCallback(async () => {
    try {
      const res = await fetch('/api/music/request');
      const data = await res.json();
      if (data?.success && Array.isArray(data.requests)) {
        setRequestQueue(data.requests);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchSongRequestsQueue();
  }, [fetchSongRequestsQueue]);

  const currentTrack = tracks[currentTrackIndex] || null;
  const currentEmbed = currentTrack
    ? parseMediaUrl(currentTrack.url, { autoplay: isPlaying, mute: isMuted, startTime: currentTime })
    : null;
  const isEmbeddableTrack = Boolean(currentEmbed?.isEmbeddable);

  // 3. Supabase Realtime WebSocket Connection with Presence for Pagpag Party Studio
  useEffect(() => {
    if (!inStudio || !user) return;

    const channel = supabase.channel(PARTY_STUDIO_CHANNEL, {
      config: {
        presence: {
          key: user.id,
        },
        broadcast: { self: true },
      },
    });

    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const presenceParticipants: StudioParticipant[] = [];
        let djPresence: any = null;

        Object.keys(state).forEach((key) => {
          const presences = state[key] as any[];
          if (presences && presences.length > 0) {
            const p = presences[0];
            presenceParticipants.push({
              id: p.user_id || key,
              username: p.username || 'member',
              displayName: p.displayName || p.username || 'Listener',
              avatar: p.avatar || '',
            });
            if (p.isDj) {
              djPresence = p;
            }
          }
        });

        setActiveUsers(presenceParticipants);

        // Auto-sync listener player to Admin DJ's playing track, state & currentTime
        if (!isAdminRef.current && djPresence) {
          const currentTracks = tracksRef.current;
          let targetIdx = -1;
          if (djPresence.trackId && currentTracks.length > 0) {
            targetIdx = currentTracks.findIndex((t) => t.id === djPresence.trackId);
          }
          if (
            targetIdx === -1 &&
            typeof djPresence.trackIndex === 'number' &&
            currentTracks[djPresence.trackIndex]
          ) {
            targetIdx = djPresence.trackIndex;
          }
          if (targetIdx !== -1) {
            setCurrentTrackIndex(targetIdx);
          }
          if (typeof djPresence.isPlaying === 'boolean') {
            setIsPlaying(djPresence.isPlaying);
          }
          if (typeof djPresence.currentTime === 'number' && djPresence.currentTime > 0) {
            setCurrentTime(djPresence.currentTime);
            if (audioRef.current && Math.abs(audioRef.current.currentTime - djPresence.currentTime) > 2) {
              audioRef.current.currentTime = djPresence.currentTime;
            }
          }
        }
      })
      .on('broadcast', { event: 'song_request' }, (payload) => {
        const { username, displayName, songTitle } = payload.payload || {};
        if (songTitle) {
          const newFloatReq: FloatingRequest = {
            id: `req-${Date.now()}-${Math.random()}`,
            username: username || 'listener',
            displayName: displayName || username || 'Listener',
            songTitle,
            x: Math.floor(Math.random() * 50) + 20,
          };
          setFloatingRequests((prev) => [...prev, newFloatReq]);

          setTimeout(() => {
            setFloatingRequests((prev) => prev.filter((r) => r.id !== newFloatReq.id));
          }, 4500);

          fetchSongRequestsQueue();
        }
      })
      .on('broadcast', { event: 'vibe_reaction' }, (payload) => {
        const { type, x } = payload.payload || {};
        if (type) {
          const newVibe: FloatingVibe = {
            id: `vibe-${Date.now()}-${Math.random()}`,
            type,
            x: typeof x === 'number' ? x : Math.floor(Math.random() * 60) + 20,
          };
          setFloatingVibes((prev) => [...prev, newVibe]);

          setTimeout(() => {
            setFloatingVibes((prev) => prev.filter((v) => v.id !== newVibe.id));
          }, 2200);
        }
      })
      .on('broadcast', { event: 'admin_track_change' }, (payload) => {
        const { trackIndex, trackId, isPlaying: targetIsPlaying, currentTime: targetTime } = payload.payload || {};
        const currentTracks = tracksRef.current;
        let targetIdx = -1;

        if (trackId && currentTracks.length > 0) {
          targetIdx = currentTracks.findIndex((t) => t.id === trackId);
        }
        if (
          targetIdx === -1 &&
          typeof trackIndex === 'number' &&
          currentTracks[trackIndex]
        ) {
          targetIdx = trackIndex;
        }

        if (targetIdx !== -1) {
          setCurrentTrackIndex(targetIdx);
        }
        if (typeof targetIsPlaying === 'boolean') {
          setIsPlaying(targetIsPlaying);
        }
        if (typeof targetTime === 'number' && targetTime > 0) {
          setCurrentTime(targetTime);
          if (audioRef.current && Math.abs(audioRef.current.currentTime - targetTime) > 2) {
            audioRef.current.currentTime = targetTime;
          }
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user.id,
            username: user.username,
            displayName: user.display_name,
            avatar: user.avatar_url,
            isDj: isAdmin,
            trackIndex: currentTrackIndex,
            trackId: currentTrack?.id,
            isPlaying,
            currentTime: audioRef.current?.currentTime || currentTime || 0,
          });
        }
      });

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [inStudio, user, fetchSongRequestsQueue, isAdmin]);

  // Sync listener player when tracks finish loading
  useEffect(() => {
    if (!inStudio || isAdmin || tracks.length === 0 || !channelRef.current) return;
    const state = channelRef.current.presenceState?.();
    if (!state) return;

    let djPresence: any = null;
    Object.keys(state).forEach((key) => {
      const presences = state[key] as any[];
      if (presences && presences.length > 0 && presences[0].isDj) {
        djPresence = presences[0];
      }
    });

    if (djPresence) {
      let targetIdx = -1;
      if (djPresence.trackId) {
        targetIdx = tracks.findIndex((t) => t.id === djPresence.trackId);
      }
      if (
        targetIdx === -1 &&
        typeof djPresence.trackIndex === 'number' &&
        tracks[djPresence.trackIndex]
      ) {
        targetIdx = djPresence.trackIndex;
      }
      if (targetIdx !== -1) {
        setCurrentTrackIndex(targetIdx);
      }
      if (typeof djPresence.isPlaying === 'boolean') {
        setIsPlaying(djPresence.isPlaying);
      }
      if (typeof djPresence.currentTime === 'number' && djPresence.currentTime > 0) {
        setCurrentTime(djPresence.currentTime);
        if (audioRef.current && Math.abs(audioRef.current.currentTime - djPresence.currentTime) > 2) {
          audioRef.current.currentTime = djPresence.currentTime;
        }
      }
    }
  }, [tracks, inStudio, isAdmin]);

  // 4. Audio Event Listeners for Live Time Update
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const cur = audioRef.current.currentTime;
      setCurrentTime(cur);
      setDuration(audioRef.current.duration || 0);

      // Periodically update Admin DJ's currentTime in presence (once every 4s)
      if (isAdminRef.current && channelRef.current && user && isPlaying) {
        const now = Date.now();
        if (now - lastPresenceTimeUpdateRef.current > 4000) {
          lastPresenceTimeUpdateRef.current = now;
          channelRef.current.track({
            user_id: user.id,
            username: user.username,
            displayName: user.display_name,
            avatar: user.avatar_url,
            isDj: true,
            trackIndex: currentTrackIndex,
            trackId: currentTrack?.id,
            isPlaying: true,
            currentTime: cur,
          });
        }
      }
    }
  };

  // 5. Stop audio completely when user leaves studio or unmounts component
  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, [stopAudio]);

  // 6. Handle Join / Leave Studio
  const handleJoinStudio = () => {
    if (!user) {
      openAuthModal('Sign in to join the Pagpag Party Studio!');
      return;
    }
    setInStudio(true);
    setIsPlaying(true);
    setTimeout(() => {
      if (audioRef.current && !isEmbeddableTrack) {
        audioRef.current.play().catch(() => {});
      }
    }, 250);
  };

  const handleLeaveStudio = () => {
    stopAudio();
    setInStudio(false);
  };

  // 7. Admin DJ Controls (Shuffle, Repeat, Next, Prev, Play/Pause)
  const togglePlay = () => {
    if (!isAdmin || !currentTrack) return;

    const nextState = !isPlaying;
    setIsPlaying(nextState);

    if (!isEmbeddableTrack && audioRef.current) {
      if (nextState) {
        audioRef.current.play().catch(() => {});
      } else {
        audioRef.current.pause();
      }
    }

    if (channelRef.current && user) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'admin_track_change',
        payload: {
          trackIndex: currentTrackIndex,
          trackId: currentTrack.id,
          isPlaying: nextState,
          currentTime: audioRef.current?.currentTime || currentTime || 0,
        },
      });
      channelRef.current.track({
        user_id: user.id,
        username: user.username,
        displayName: user.display_name,
        avatar: user.avatar_url,
        isDj: true,
        trackIndex: currentTrackIndex,
        trackId: currentTrack.id,
        isPlaying: nextState,
        currentTime: audioRef.current?.currentTime || currentTime || 0,
      });
    }
  };

  const handleNextTrack = () => {
    if (!isAdmin || tracks.length === 0) return;

    let nextIdx: number;
    if (repeatMode === 'one') {
      nextIdx = currentTrackIndex;
    } else if (isShuffle) {
      nextIdx = Math.floor(Math.random() * tracks.length);
    } else {
      nextIdx = (currentTrackIndex + 1) % tracks.length;
    }

    const nextTrack = tracks[nextIdx];
    setCurrentTrackIndex(nextIdx);
    setIsPlaying(true);

    if (channelRef.current && user) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'admin_track_change',
        payload: {
          trackIndex: nextIdx,
          trackId: nextTrack?.id,
          isPlaying: true,
          currentTime: 0,
        },
      });
      channelRef.current.track({
        user_id: user.id,
        username: user.username,
        displayName: user.display_name,
        avatar: user.avatar_url,
        isDj: true,
        trackIndex: nextIdx,
        trackId: nextTrack?.id,
        isPlaying: true,
        currentTime: 0,
      });
    }
  };

  const handlePrevTrack = () => {
    if (!isAdmin || tracks.length === 0) return;
    const prevIdx = (currentTrackIndex - 1 + tracks.length) % tracks.length;
    const prevTrack = tracks[prevIdx];
    setCurrentTrackIndex(prevIdx);
    setIsPlaying(true);

    if (channelRef.current && user) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'admin_track_change',
        payload: {
          trackIndex: prevIdx,
          trackId: prevTrack?.id,
          isPlaying: true,
          currentTime: 0,
        },
      });
      channelRef.current.track({
        user_id: user.id,
        username: user.username,
        displayName: user.display_name,
        avatar: user.avatar_url,
        isDj: true,
        trackIndex: prevIdx,
        trackId: prevTrack?.id,
        isPlaying: true,
        currentTime: 0,
      });
    }
  };

  const handleSelectTrack = (index: number) => {
    if (!isAdmin || !tracks[index]) return;
    const targetTrack = tracks[index];
    setCurrentTrackIndex(index);
    setIsPlaying(true);

    const parsed = parseMediaUrl(targetTrack.url);
    if (!parsed.isEmbeddable && audioRef.current) {
      audioRef.current.play().catch(() => {});
    }

    if (channelRef.current && user) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'admin_track_change',
        payload: {
          trackIndex: index,
          trackId: targetTrack.id,
          isPlaying: true,
          currentTime: 0,
        },
      });
      channelRef.current.track({
        user_id: user.id,
        username: user.username,
        displayName: user.display_name,
        avatar: user.avatar_url,
        isDj: true,
        trackIndex: index,
        trackId: targetTrack.id,
        isPlaying: true,
        currentTime: 0,
      });
    }
  };

  const toggleShuffle = () => {
    if (!isAdmin) return;
    setIsShuffle((prev) => !prev);
  };

  const toggleRepeatMode = () => {
    if (!isAdmin) return;
    setRepeatMode((prev) => (prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off'));
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin || !audioRef.current) return;
    const newTime = parseFloat(e.target.value);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);

    if (channelRef.current && user) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'admin_track_change',
        payload: {
          trackIndex: currentTrackIndex,
          trackId: currentTrack?.id,
          isPlaying,
          currentTime: newTime,
        },
      });
      channelRef.current.track({
        user_id: user.id,
        username: user.username,
        displayName: user.display_name,
        avatar: user.avatar_url,
        isDj: true,
        trackIndex: currentTrackIndex,
        trackId: currentTrack?.id,
        isPlaying,
        currentTime: newTime,
      });
    }
  };

  useEffect(() => {
    if (!inStudio || !audioRef.current || isEmbeddableTrack) return;
    if (isPlaying && currentTrack) {
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, [currentTrackIndex, inStudio, currentTrack, isPlaying, isEmbeddableTrack]);

  // 8. Admin Add Track Handler
  const handleAddStudioTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newArtist.trim() || !newAudioUrl.trim() || addingTrack) return;

    setAddingTrack(true);
    setAddTrackMsg('');

    try {
      const res = await fetch('/api/music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          artist: newArtist.trim(),
          audioUrl: newAudioUrl.trim(),
          coverUrl: newCoverUrl.trim(),
          genre: newGenre.trim() || 'Studio Exclusive',
        }),
      });

      const data = await res.json();
      if (data?.success) {
        setAddTrackMsg('Track added to Pagpag Party Studio!');
        setNewTitle('');
        setNewArtist('');
        setNewAudioUrl('');
        setNewCoverUrl('');
        setNewGenre('');
        fetchRealMusic();
        setTimeout(() => {
          setShowAddTrackForm(false);
          setAddTrackMsg('');
        }, 1200);
      } else {
        setAddTrackMsg(`Error: ${data?.error || 'Failed to add track'}`);
      }
    } catch (err: any) {
      setAddTrackMsg(`Error: ${err?.message || 'Network error'}`);
    } finally {
      setAddingTrack(false);
    }
  };

  // 9. Handle Listener Song Request Submission
  const handleSubmitSongRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      openAuthModal('Sign in to request a song in Pagpag Party');
      return;
    }
    if (!songRequestInput.trim() || submittingRequest) return;

    const titleToReq = songRequestInput.trim();
    setSongRequestInput('');
    setSubmittingRequest(true);

    try {
      const res = await fetch('/api/music/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          songTitle: titleToReq,
        }),
      });

      const data = await res.json();
      if (data?.success) {
        // Broadcast via Realtime WebSocket to all users in studio
        if (channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'song_request',
            payload: {
              username: user.username,
              displayName: user.display_name,
              songTitle: titleToReq,
            },
          });
        }
      }
    } catch {
      setSongRequestInput(titleToReq);
    } finally {
      setSubmittingRequest(false);
    }
  };

  // 9. Trigger React Vibe Floating Animation
  const triggerReaction = (type: 'fire' | 'love' | 'vibe' | 'pagpag') => {
    const xPos = Math.floor(Math.random() * 60) + 20;

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'vibe_reaction',
        payload: {
          type,
          x: xPos,
        },
      });
    } else {
      const newVibe: FloatingVibe = {
        id: `vibe-${Date.now()}-${Math.random()}`,
        type,
        x: xPos,
      };
      setFloatingVibes((prev) => [...prev, newVibe]);

      setTimeout(() => {
        setFloatingVibes((prev) => prev.filter((v) => v.id !== newVibe.id));
      }, 2200);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-black text-white p-3 md:p-6 overflow-y-auto relative font-sans">
      {/* Audio Playback Element (HTML5 Audio for direct files OR background iframe for YouTube URLs) */}
      {currentTrack && (
        isEmbeddableTrack ? (
          isPlaying ? (
            <iframe
              key={currentTrack.id}
              src={currentEmbed?.embedUrl}
              title={currentTrack.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              className="w-0 h-0 opacity-0 pointer-events-none absolute inset-0 z-0"
            />
          ) : null
        ) : (
          <audio
            ref={audioRef}
            src={currentTrack.url}
            onEnded={handleNextTrack}
            onTimeUpdate={handleTimeUpdate}
            muted={isMuted}
          />
        )
      )}

      {/* Floating Reactions & Small Song Request Texts Overlay */}
      <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
        {/* Floating Vibe Icons */}
        {floatingVibes.map((v) => (
          <div
            key={v.id}
            style={{ left: `${v.x}%` }}
            className="absolute bottom-24 p-2.5 rounded-full bg-zinc-900 border border-zinc-700 shadow-2xl animate-floatUpReaction"
          >
            {v.type === 'fire' && <Flame className="w-5 h-5 text-white fill-white" />}
            {v.type === 'love' && <Heart className="w-5 h-5 text-white fill-white" />}
            {v.type === 'vibe' && <Sparkles className="w-5 h-5 text-white fill-white" />}
            {v.type === 'pagpag' && <Disc className="w-5 h-5 text-white animate-spin" />}
          </div>
        ))}

        {/* Small Real-time Floating Song Requests Drifting Slowly Upward */}
        {floatingRequests.map((req) => (
          <div
            key={req.id}
            style={{ left: `${req.x}%` }}
            className="absolute bottom-28 px-3 py-1.5 rounded-xl bg-zinc-900/90 border border-zinc-700 shadow-2xl text-[10px] font-mono text-zinc-200 flex items-center gap-1.5 animate-floatUpSlow backdrop-blur-md"
          >
            <Disc className="w-3 h-3 text-white animate-spin shrink-0" />
            <span>
              <strong className="text-white">@{req.username}</strong> requested: &quot;{req.songTitle}&quot;
            </span>
          </div>
        ))}
      </div>

      {/* Header Banner (Strict Black & White) */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center p-2">
            <Radio className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-sm md:text-base font-bold text-white font-mono uppercase tracking-wider">
              Pagpag Party
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {inStudio && isAdmin && (
            <button
              onClick={() => setShowPlaylistModal((prev) => !prev)}
              className="px-3 py-1.5 rounded-xl bg-white text-black hover:bg-zinc-200 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shadow-md"
            >
              <Music2 className="w-3.5 h-3.5 text-black" />
              <span>Select Music ({tracks.length})</span>
            </button>
          )}

          {inStudio && (
            <button
              onClick={() => setShowQueueModal((prev) => !prev)}
              className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
            >
              <ListMusic className="w-3.5 h-3.5 text-white" />
              <span>Requests ({requestQueue.length})</span>
            </button>
          )}

          {inStudio && (
            <button
              onClick={handleLeaveStudio}
              className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700 text-white hover:bg-zinc-800 text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
            >
              <LogOut className="w-3.5 h-3.5" /> Leave Studio
            </button>
          )}
        </div>
      </div>

      {!inStudio ? (
        /* LOBBY STATE - Strict Black & White Studio Invitation */
        <div className="my-6 flex-1 max-w-xl mx-auto w-full flex flex-col items-center justify-center p-8 rounded-3xl border border-zinc-800 bg-zinc-950 text-center shadow-2xl relative overflow-hidden">
          <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-700 flex items-center justify-center mb-4 shadow-inner">
            <Headphones className="w-8 h-8 text-white" />
          </div>

          <h3 className="text-lg font-black text-white mb-1 font-mono uppercase">Pagpag Party Studio</h3>
          <p className="text-xs text-zinc-400 max-w-sm mb-6">
            Join the live Pagpag Party studio! Listen synchronously as the Admin DJ plays community audio, react live, and request your favorite songs!
          </p>

          {loadingTracks ? (
            <div className="p-4 text-xs font-mono text-zinc-500">Loading Supabase music tracks...</div>
          ) : currentTrack ? (
            <div className="w-full max-w-sm p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 mb-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden bg-black border border-zinc-700 shrink-0 flex items-center justify-center">
                {currentTrack.cover ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={getAvatarUrl(currentTrack.cover, currentTrack.artist)} alt="Cover" className="w-full h-full object-cover" />
                ) : (
                  <Music2 className="w-5 h-5 text-zinc-400" />
                )}
              </div>
              <div className="text-left min-w-0 flex-1">
                <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider block font-mono">Real Supabase Audio</span>
                <h4 className="text-xs font-bold text-white truncate">{currentTrack.title}</h4>
                <p className="text-[10px] text-zinc-400 truncate">{currentTrack.artist}</p>
              </div>
            </div>
          ) : (
            <div className="p-4 text-xs font-mono text-zinc-500 mb-4">No audio tracks uploaded in public.music table yet.</div>
          )}

          <button
            onClick={handleJoinStudio}
            className="w-full max-w-sm py-3.5 rounded-2xl bg-white hover:bg-zinc-200 text-black font-black text-sm shadow-2xl flex items-center justify-center gap-2 transition transform active:scale-95"
          >
            <Headphones className="w-5 h-5 text-black" /> JOIN MUSIC STUDIO
          </button>
        </div>
      ) : (
        /* LIVE PARTY STUDIO STATE - Split View: Left Sidebar/Top Mobile = Members, Right Area = Audio Waveform Spectrum & Player */
        <div className="my-2 md:my-4 flex-1 flex flex-col md:flex-row border border-zinc-800 rounded-3xl bg-zinc-950 overflow-hidden shadow-2xl relative min-h-0">
          
          {/* LEFT SIDEBAR (Mobile = Horizontal Top Bar, Desktop = Vertical Sidebar) */}
          <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-zinc-800 bg-black/90 p-2.5 md:p-4 flex flex-col shrink-0">
            <div className="flex items-center justify-between pb-1.5 md:pb-3 border-b border-zinc-800/80 mb-2 md:mb-3">
              <h4 className="text-[11px] md:text-xs font-black uppercase text-zinc-300 tracking-wider font-mono flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-white" /> Studio Party ({activeUsers.length})
              </h4>
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            </div>

            <div className="flex md:flex-col overflow-x-auto md:overflow-y-auto gap-2 md:space-y-2.5 hide-scrollbar max-h-16 md:max-h-none shrink-0 flex-1">
              {activeUsers.length === 0 ? (
                <div className="p-2 md:p-4 text-center text-xs font-mono text-zinc-500">
                  Connecting...
                </div>
              ) : (
                activeUsers.map((m) => {
                  const isSelf = user?.id === m.id;
                  const avatarSrc = getAvatarUrl(m.avatar, m.username);
                  return (
                    <div
                      key={m.id}
                      className={`flex items-center gap-2 p-1.5 md:p-2 rounded-xl shrink-0 min-w-[120px] md:min-w-0 ${
                        isSelf ? 'bg-zinc-900 border border-zinc-700' : 'bg-zinc-950 border border-zinc-800/80'
                      }`}
                    >
                      <div className="w-6 h-6 md:w-7 md:h-7 rounded-full overflow-hidden border border-zinc-700 bg-zinc-800 shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={avatarSrc}
                          alt={m.displayName}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = getCartoonAvatar(m.username);
                          }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h5 className="text-[11px] md:text-xs font-bold text-white truncate flex items-center gap-1">
                          {m.displayName}
                          {isSelf && isAdmin && <Crown className="w-3 h-3 text-white fill-white" />}
                        </h5>
                        <span className="text-[9px] text-zinc-400 block truncate font-mono">
                          {isSelf && isAdmin ? 'Admin DJ' : `@${m.username}`}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT MAIN AREA: Dynamic Moving Audio Waveform Spectrum & Live DJ Deck Controls */}
          <div className="flex-1 p-3 md:p-5 flex flex-col justify-between bg-black relative overflow-y-auto min-h-0 space-y-3">
            
            {/* Admin Music Track Selector Modal */}
            {showPlaylistModal && (
              <div className="absolute inset-4 z-40 bg-zinc-950/95 backdrop-blur-md border border-zinc-800 rounded-2xl p-4 flex flex-col animate-fadeIn">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-3">
                  <h4 className="text-xs font-black uppercase text-white font-mono flex items-center gap-2">
                    <Music2 className="w-4 h-4 text-white" /> Admin DJ Music Library ({tracks.length})
                  </h4>
                  <div className="flex items-center gap-2">
                    {isAdmin && (
                      <button
                        onClick={() => setShowAddTrackForm((prev) => !prev)}
                        className="text-xs text-black font-bold px-2.5 py-1 bg-white hover:bg-zinc-200 rounded-lg flex items-center gap-1 transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {showAddTrackForm ? 'Cancel' : 'Add Track'}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setShowPlaylistModal(false);
                        setShowAddTrackForm(false);
                      }}
                      className="text-xs text-zinc-400 hover:text-white px-2 py-1 bg-zinc-900 border border-zinc-800 rounded-lg"
                    >
                      Close
                    </button>
                  </div>
                </div>

                {/* Admin Upload / Add Track Form Accordion */}
                {isAdmin && showAddTrackForm && (
                  <form onSubmit={handleAddStudioTrack} className="mb-4 p-3 rounded-xl bg-zinc-900 border border-zinc-700 space-y-2.5 font-mono">
                    <h5 className="text-[11px] font-bold text-white uppercase flex items-center gap-1.5">
                      <UploadCloud className="w-3.5 h-3.5 text-white" /> Add Music Track (Studio Playlist Only)
                    </h5>

                    {addTrackMsg && (
                      <p className={`text-[10px] ${addTrackMsg.startsWith('Error') ? 'text-red-400' : 'text-emerald-400'}`}>
                        {addTrackMsg}
                      </p>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Song Title *"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        required
                        className="px-2.5 py-1.5 rounded-lg bg-black border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                      />
                      <input
                        type="text"
                        placeholder="Artist / DJ Name *"
                        value={newArtist}
                        onChange={(e) => setNewArtist(e.target.value)}
                        required
                        className="px-2.5 py-1.5 rounded-lg bg-black border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                      />
                    </div>

                    <input
                      type="text"
                      placeholder="Audio URL or YouTube Link (e.g. https://youtu.be/...) *"
                      value={newAudioUrl}
                      onChange={(e) => setNewAudioUrl(e.target.value)}
                      required
                      className="w-full px-2.5 py-1.5 rounded-lg bg-black border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Optional Cover Image URL"
                        value={newCoverUrl}
                        onChange={(e) => setNewCoverUrl(e.target.value)}
                        className="px-2.5 py-1.5 rounded-lg bg-black border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                      />
                      <input
                        type="text"
                        placeholder="Genre (e.g. Budots, Remix, Pop)"
                        value={newGenre}
                        onChange={(e) => setNewGenre(e.target.value)}
                        className="px-2.5 py-1.5 rounded-lg bg-black border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={addingTrack || !newTitle.trim() || !newArtist.trim() || !newAudioUrl.trim()}
                      className="w-full py-1.5 rounded-lg bg-white text-black font-bold text-xs hover:bg-zinc-200 transition disabled:opacity-50"
                    >
                      {addingTrack ? 'Adding Track...' : 'Save Track to Studio Playlist'}
                    </button>
                  </form>
                )}

                <div className="flex-1 overflow-y-auto space-y-2">
                  {tracks.length === 0 ? (
                    <div className="p-8 text-center text-xs font-mono text-zinc-500">
                      No music uploaded to public.music table yet. Upload tracks in Supabase to expand the Pagpag Party DJ Library!
                    </div>
                  ) : (
                    tracks.map((track, idx) => {
                      const isCurrent = idx === currentTrackIndex;
                      return (
                        <div
                          key={track.id || idx}
                          onClick={() => {
                            handleSelectTrack(idx);
                            setShowPlaylistModal(false);
                          }}
                          className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                            isCurrent
                              ? 'bg-white text-black border-white font-bold shadow-lg'
                              : 'bg-zinc-900 border-zinc-800 text-white hover:bg-zinc-800'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-10 h-10 rounded-lg overflow-hidden border ${isCurrent ? 'border-black' : 'border-zinc-700'} bg-black shrink-0 flex items-center justify-center`}>
                              {track.cover ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img src={getAvatarUrl(track.cover, track.artist)} alt={track.title} className="w-full h-full object-cover" />
                              ) : (
                                <Music2 className={`w-5 h-5 ${isCurrent ? 'text-black' : 'text-zinc-400'}`} />
                              )}
                            </div>
                            <div className="min-w-0">
                              <h5 className="text-xs font-bold truncate">{track.title}</h5>
                              <p className={`text-[10px] truncate ${isCurrent ? 'text-zinc-700' : 'text-zinc-400'}`}>{track.artist} • {track.genre || 'Music'}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {isCurrent && isPlaying ? (
                              <span className="text-[10px] font-mono font-black uppercase px-2.5 py-1 bg-black text-white rounded-lg animate-pulse">
                                PLAYING LIVE
                              </span>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectTrack(idx);
                                  setShowPlaylistModal(false);
                                }}
                                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                                  isCurrent
                                    ? 'bg-black text-white hover:bg-zinc-800'
                                    : 'bg-white text-black hover:bg-zinc-200'
                                }`}
                              >
                                Play Now
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Song Request Queue Modal Overlay for Admin & Users */}
            {showQueueModal && (
              <div className="absolute inset-4 z-40 bg-zinc-950/95 backdrop-blur-md border border-zinc-800 rounded-2xl p-4 flex flex-col animate-fadeIn">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-3">
                  <h4 className="text-xs font-black uppercase text-white font-mono flex items-center gap-2">
                    <ListMusic className="w-4 h-4 text-white" /> Requested Songs Queue ({requestQueue.length})
                  </h4>
                  <button
                    onClick={() => setShowQueueModal(false)}
                    className="text-xs text-zinc-400 hover:text-white px-2 py-1 bg-zinc-900 border border-zinc-800 rounded-lg"
                  >
                    Close
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2">
                  {requestQueue.length === 0 ? (
                    <div className="p-8 text-center text-xs font-mono text-zinc-500">
                      No song requests submitted yet. Use the request input below to ask for a song!
                    </div>
                  ) : (
                    requestQueue.map((req) => (
                      <div key={req.id} className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <Disc className="w-4 h-4 text-white shrink-0" />
                          <div>
                            <h5 className="text-xs font-bold text-white font-mono">&quot;{req.song_title}&quot;</h5>
                            <p className="text-[10px] text-zinc-400">
                              Requested by @{req.requester?.username || 'listener'}
                            </p>
                          </div>
                        </div>

                        <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                          {req.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* HIGH-TECH MOVING AUDIO WAVEFORM SPECTRUM BARS (Matching User's Reference Screenshot!) */}
            <div className="w-full bg-zinc-950/90 border border-zinc-800 p-3 rounded-2xl mb-3 flex flex-col items-center shadow-inner relative overflow-hidden">
              <div className="w-full flex items-center justify-between text-[10px] font-mono text-zinc-400 mb-2">
                <span className="flex items-center gap-1">
                  <Disc className={`w-3 h-3 text-white ${isPlaying ? 'animate-spin' : ''}`} />
                  NOW PLAYING SPECTRUM
                </span>
                <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
              </div>

              {/* Dynamic 44-Bar Moving Audio Spectrum Visualizer */}
              <div className="w-full flex items-end justify-center gap-[3px] h-16 px-2 py-1">
                {Array.from({ length: 44 }).map((_, i) => {
                  const norm = Math.sin((i / 43) * Math.PI);
                  const height = Math.max(8, Math.floor(norm * 52));
                  const duration = 0.5 + (i % 7) * 0.11;
                  const delay = (i % 11) * 0.07;

                  return (
                    <div
                      key={i}
                      className={`w-1 rounded-full bg-white transition-opacity duration-300 shadow-[0_0_8px_rgba(255,255,255,0.6)] ${
                        isPlaying ? 'animate-spectrumBounce opacity-100' : 'opacity-30'
                      }`}
                      style={{
                        height: `${height}px`,
                        animationDuration: `${duration}s`,
                        animationDelay: `${delay}s`,
                      }}
                    />
                  );
                })}
              </div>

              {/* Live Track Seek Bar */}
              <div className="w-full mt-2 flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleSeek}
                  disabled={!isAdmin}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Track Info Card */}
            {currentTrack ? (
              <div className="flex items-center gap-3 w-full p-2.5 rounded-2xl bg-zinc-900 border border-zinc-800 mb-3">
                <div className={`w-12 h-12 rounded-xl overflow-hidden border border-zinc-700 bg-black shrink-0 relative ${isPlaying ? 'animate-pulse' : ''}`}>
                  {currentTrack.cover || currentEmbed?.thumbnailUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={currentTrack.cover || currentEmbed?.thumbnailUrl || getAvatarUrl('', currentTrack.artist)} alt={currentTrack.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music2 className="w-6 h-6 text-zinc-500" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <h3 className="text-xs font-bold text-white truncate font-mono">{currentTrack.title}</h3>
                  <p className="text-[10px] text-zinc-400 truncate">{currentTrack.artist}</p>
                </div>
              </div>
            ) : (
              <div className="text-center text-xs text-zinc-500 font-mono mb-3">
                No real tracks uploaded in public.music table.
              </div>
            )}

            {/* Admin POV DJ Deck Controls (Shuffle, Repeat, Prev, Play/Pause, Next, Mute) OR Listener View */}
            {isAdmin ? (
              <div className="flex items-center gap-3 mb-3">
                {/* Shuffle Button */}
                <button
                  onClick={toggleShuffle}
                  className={`p-2 rounded-xl border text-xs font-bold transition active:scale-95 ${
                    isShuffle ? 'bg-white text-black border-white' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                  title="Admin: Toggle Shuffle"
                >
                  <Shuffle className="w-4 h-4" />
                </button>

                {/* Repeat Button */}
                <button
                  onClick={toggleRepeatMode}
                  className={`p-2 rounded-xl border text-xs font-bold transition active:scale-95 ${
                    repeatMode !== 'off' ? 'bg-white text-black border-white' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                  title={`Admin: Repeat (${repeatMode})`}
                >
                  {repeatMode === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
                </button>

                {/* Previous Track */}
                <button
                  onClick={handlePrevTrack}
                  disabled={tracks.length === 0}
                  className="p-2.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white disabled:opacity-30 transition active:scale-95"
                  title="Admin: Previous Track"
                >
                  <SkipBack className="w-4 h-4" />
                </button>

                {/* Play / Pause */}
                <button
                  onClick={togglePlay}
                  disabled={!currentTrack}
                  className="w-12 h-12 rounded-2xl bg-white text-black font-black flex items-center justify-center shadow-xl hover:bg-zinc-200 disabled:opacity-30 transition transform active:scale-95"
                  title="Admin: Play / Pause Studio Audio"
                >
                  {isPlaying ? <Pause className="w-5 h-5 fill-black" /> : <Play className="w-5 h-5 fill-black translate-x-0.5" />}
                </button>

                {/* Next Track */}
                <button
                  onClick={handleNextTrack}
                  disabled={tracks.length === 0}
                  className="p-2.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white disabled:opacity-30 transition active:scale-95"
                  title="Admin: Next Track"
                >
                  <SkipForward className="w-4 h-4" />
                </button>

                {/* Volume / Mute */}
                <button
                  onClick={() => setIsMuted((prev) => !prev)}
                  className="p-2.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white transition active:scale-95"
                >
                  {isMuted ? <VolumeX className="w-4 h-4 text-zinc-500" /> : <Volume2 className="w-4 h-4 text-white" />}
                </button>
              </div>
            ) : (
              <div className="mb-3 px-4 py-1.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-zinc-300 text-xs font-mono flex items-center gap-2">
                <Crown className="w-3.5 h-3.5 text-white" />
                <span>Admin DJ is playing studio audio (Listening Live)</span>
              </div>
            )}

            {/* Listener Song Request Input Box & React Vibe Row (Hidden for Admin, Visible for Users) */}
            {!isAdmin && (
              <>
                <form onSubmit={handleSubmitSongRequest} className="w-full max-w-md mb-3 flex items-center gap-2">
                  <input
                    type="text"
                    value={songRequestInput}
                    onChange={(e) => setSongRequestInput(e.target.value)}
                    placeholder="Type a song title to request..."
                    className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:border-white font-mono"
                  />
                  <button
                    type="submit"
                    disabled={!songRequestInput.trim() || submittingRequest}
                    className="px-3.5 py-2 rounded-xl bg-white text-black font-bold text-xs shadow-md disabled:opacity-50 flex items-center gap-1.5 transition active:scale-95 shrink-0"
                  >
                    <span>Request</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>

                <div className="w-full pt-2 border-t border-zinc-800/80 flex flex-wrap items-center justify-center gap-2">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono mr-1">React Vibe:</span>

                  <button
                    onClick={() => triggerReaction('fire')}
                    className="px-3 py-1 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-white text-xs font-bold flex items-center gap-1.5 transition active:scale-95 text-white"
                  >
                    <Flame className="w-3.5 h-3.5 text-white" /> Fire
                  </button>

                  <button
                    onClick={() => triggerReaction('love')}
                    className="px-3 py-1 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-white text-xs font-bold flex items-center gap-1.5 transition active:scale-95 text-white"
                  >
                    <Heart className="w-3.5 h-3.5 text-white" /> Love
                  </button>

                  <button
                    onClick={() => triggerReaction('vibe')}
                    className="px-3 py-1 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-white text-xs font-bold flex items-center gap-1.5 transition active:scale-95 text-white"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-white" /> Vibe
                  </button>

                  <button
                    onClick={() => triggerReaction('pagpag')}
                    className="px-3 py-1 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-white text-xs font-bold flex items-center gap-1.5 transition active:scale-95 text-white"
                  >
                    <Disc className="w-3.5 h-3.5 text-white" /> Pagpag
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

import { create } from 'zustand';
import { MusicMetadata } from '@/types/post';

interface PlayerStore {
  currentTrack: MusicMetadata | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  playTrack: (track: MusicMetadata) => void;
  pauseTrack: () => void;
  togglePlay: () => void;
  setProgress: (progress: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  closePlayer: () => void;
}

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  currentTrack: null,
  isPlaying: false,
  progress: 0,
  duration: 0,
  volume: 0.8,

  playTrack: (track) => set({ currentTrack: track, isPlaying: true, progress: 0 }),
  pauseTrack: () => set({ isPlaying: false }),
  togglePlay: () => {
    const { isPlaying, currentTrack } = get();
    if (currentTrack) {
      set({ isPlaying: !isPlaying });
    }
  },
  setProgress: (progress) => set({ progress }),
  setDuration: (duration) => set({ duration }),
  setVolume: (volume) => set({ volume }),
  closePlayer: () => set({ currentTrack: null, isPlaying: false }),
}));

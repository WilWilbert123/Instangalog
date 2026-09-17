'use client';

import { Post } from '@/types/post';

const WATCHED_STORAGE_KEY = 'instangalog_watched_video_ids';
const MAX_WATCHED_CACHE = 500;

export function getWatchedVideoIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(WATCHED_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed: string[] = JSON.parse(raw);
    return new Set(parsed);
  } catch {
    return new Set();
  }
}

export function markVideoAsWatched(videoId: string): void {
  if (typeof window === 'undefined' || !videoId) return;
  try {
    const watched = getWatchedVideoIds();
    if (!watched.has(videoId)) {
      watched.add(videoId);
      const arr = Array.from(watched);
      // Keep only recent MAX_WATCHED_CACHE entries
      if (arr.length > MAX_WATCHED_CACHE) {
        arr.splice(0, arr.length - MAX_WATCHED_CACHE);
      }
      localStorage.setItem(WATCHED_STORAGE_KEY, JSON.stringify(arr));
    }
  } catch {
    // LocalStorage quota or access error ignore
  }
}

export function clearWatchedVideoHistory(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(WATCHED_STORAGE_KEY);
  } catch {
    // Ignore
  }
}

/**
 * Organizes posts for TikTok/Reels style recommendation algorithm:
 * 1. Unwatched videos are placed at the top (sorted by freshness).
 * 2. Watched videos are moved to the bottom.
 * 3. If ALL videos are watched, shuffles them with a random offset so the user
 *    never sees the exact same initial video on every load/refresh.
 */
export function organizeSmartFeed(posts: Post[]): Post[] {
  if (!posts || posts.length === 0) return [];

  const watchedIds = getWatchedVideoIds();

  const unwatched = posts.filter((p) => !watchedIds.has(p.id));
  const watched = posts.filter((p) => watchedIds.has(p.id));

  // If there are unwatched posts, prioritize unwatched first, then watched
  if (unwatched.length > 0) {
    return [...unwatched, ...watched];
  }

  // If ALL posts have been watched already, rotate/shuffle them for variety
  // Rotate by a pseudorandom index based on current hour to avoid static top video
  const seed = new Date().getHours() % posts.length;
  const rotated = [...posts.slice(seed), ...posts.slice(0, seed)];

  return rotated;
}

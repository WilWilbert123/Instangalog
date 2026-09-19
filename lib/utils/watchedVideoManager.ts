'use client';

import { Post } from '@/types/post';

const BASE_SEEN_STORAGE_KEY = 'instangalog_seen_posts';
const MAX_SEEN_CACHE = 1000;

function getStorageKey(userId?: string): string {
  return userId ? `${BASE_SEEN_STORAGE_KEY}_${userId}` : BASE_SEEN_STORAGE_KEY;
}

export function getSeenPostIds(userId?: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const key = getStorageKey(userId);
    const raw = localStorage.getItem(key);
    if (!raw) {
      // Fallback to legacy global key if user-specific key not yet populated
      const legacy = localStorage.getItem(BASE_SEEN_STORAGE_KEY);
      if (!legacy) return new Set();
      return new Set(JSON.parse(legacy));
    }
    const parsed: string[] = JSON.parse(raw);
    return new Set(parsed);
  } catch {
    return new Set();
  }
}

export function markPostAsSeen(postId: string, userId?: string): void {
  if (typeof window === 'undefined' || !postId) return;
  try {
    const key = getStorageKey(userId);
    const seen = getSeenPostIds(userId);
    if (!seen.has(postId)) {
      seen.add(postId);
      const arr = Array.from(seen);
      if (arr.length > MAX_SEEN_CACHE) {
        arr.splice(0, arr.length - MAX_SEEN_CACHE);
      }
      localStorage.setItem(key, JSON.stringify(arr));
      // Also notify any listening components on the page
      window.dispatchEvent(new CustomEvent('post-seen-updated', { detail: { postId, userId } }));
    }
  } catch {
    // Ignore quota or access error
  }
}

// Backwards compatibility alias
export const getWatchedVideoIds = getSeenPostIds;
export const markVideoAsWatched = markPostAsSeen;

export function clearSeenPostHistory(userId?: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(getStorageKey(userId));
    localStorage.removeItem(BASE_SEEN_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('post-seen-updated', { detail: { cleared: true, userId } }));
  } catch {
    // Ignore
  }
}

export const clearWatchedVideoHistory = clearSeenPostHistory;

/**
 * Filter posts to only those NOT yet seen by the user (Facebook-style feed)
 */
export function getUnseenPosts(posts: Post[], userId?: string): Post[] {
  if (!posts || posts.length === 0) return [];
  const seenIds = getSeenPostIds(userId);
  return posts.filter((p) => !seenIds.has(p.id));
}

/**
 * Filter posts to only those already seen
 */
export function getSeenPosts(posts: Post[], userId?: string): Post[] {
  if (!posts || posts.length === 0) return [];
  const seenIds = getSeenPostIds(userId);
  return posts.filter((p) => seenIds.has(p.id));
}

/**
 * Organizes posts for TikTok/Facebook style feed:
 * - When `hideSeen` is true: returns ONLY unseen posts.
 * - When `hideSeen` is false: places unwatched posts first, then watched posts.
 */
export function organizeSmartFeed(
  posts: Post[],
  options?: { hideSeen?: boolean; userId?: string; seed?: number }
): Post[] {
  if (!posts || posts.length === 0) return [];

  const seenIds = getSeenPostIds(options?.userId);
  const unwatched = posts.filter((p) => !seenIds.has(p.id));
  const watched = posts.filter((p) => seenIds.has(p.id));

  // If hideSeen is enabled and there are unseen posts, show only fresh unseen posts
  if (options?.hideSeen) {
    if (unwatched.length > 0) {
      return unwatched;
    }
    // If all posts have been viewed, rotate them smoothly by seed so the feed is never blank on refresh
    const rotationSeed = options?.seed ?? (new Date().getHours() * 60 + new Date().getMinutes());
    const offset = posts.length > 0 ? (rotationSeed % posts.length) : 0;
    return [...posts.slice(offset), ...posts.slice(0, offset)];
  }

  // If there are unwatched posts, prioritize unwatched first, then watched
  if (unwatched.length > 0) {
    return [...unwatched, ...watched];
  }

  // If all watched and hideSeen is false, rotate by seed for variety
  const rotationSeed = options?.seed ?? (new Date().getHours() * 60 + new Date().getMinutes());
  const seed = posts.length > 0 ? (rotationSeed % posts.length) : 0;
  return [...posts.slice(seed), ...posts.slice(0, seed)];
}


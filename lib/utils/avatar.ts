/**
 * Utility functions for user profile avatars.
 * Generates cartoon avatar URLs via DiceBear API for missing or broken avatars.
 */

export type CartoonStyle = 'adventurer' | 'avataaars' | 'bottts' | 'lorelei' | 'fun-emoji';

const CARTOON_STYLES: CartoonStyle[] = ['adventurer', 'avataaars', 'bottts', 'lorelei', 'fun-emoji'];

/**
 * Returns a cartoon avatar SVG URL based on a seed string (e.g. username, email, display_name or ID).
 * Picks a deterministic cartoon style so each user has a distinct, fun avatar.
 */
export function getCartoonAvatar(seed: string = 'user'): string {
  const cleanSeed = encodeURIComponent(seed.trim() || 'user');
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const style = CARTOON_STYLES[Math.abs(hash) % CARTOON_STYLES.length];
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${cleanSeed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
}

/**
 * Resolves avatar URL. If input url is empty, points to a legacy placeholder, or is a temporary blob URL, returns a cartoon avatar.
 */
export function getAvatarUrl(url?: string | null, seed: string = 'user'): string {
  if (
    url &&
    url.trim().length > 0 &&
    !url.includes('/icons/logo.svg') &&
    !url.startsWith('blob:')
  ) {
    return url.trim();
  }
  return getCartoonAvatar(seed);
}

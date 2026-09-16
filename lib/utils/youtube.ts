import { parseMediaUrl, MediaEmbedInfo } from './mediaEmbed';

export interface YouTubeInfo {
  isYouTube: boolean;
  videoId: string | null;
  embedUrl: string | null;
  thumbnailUrl: string | null;
  embedInfo?: MediaEmbedInfo;
}

export function parseYouTubeUrl(
  url: string,
  options?: { autoplay?: boolean; mute?: boolean }
): YouTubeInfo {
  if (!url || typeof url !== 'string') {
    return { isYouTube: false, videoId: null, embedUrl: null, thumbnailUrl: null };
  }

  const embedInfo = parseMediaUrl(url, options);
  if (embedInfo.type === 'youtube') {
    return {
      isYouTube: true,
      videoId: embedInfo.embedUrl?.split('/embed/')[1]?.split('?')[0] || null,
      embedUrl: embedInfo.embedUrl,
      thumbnailUrl: embedInfo.thumbnailUrl,
      embedInfo,
    };
  }

  // If it's another embeddable video platform (Facebook, Instagram, TikTok, Vimeo, etc.), return embedUrl
  if (embedInfo.isEmbeddable) {
    return {
      isYouTube: false,
      videoId: null,
      embedUrl: embedInfo.embedUrl,
      thumbnailUrl: embedInfo.thumbnailUrl,
      embedInfo,
    };
  }

  return { isYouTube: false, videoId: null, embedUrl: null, thumbnailUrl: null, embedInfo };
}

export { parseMediaUrl };
export type { MediaEmbedInfo };

export interface MediaEmbedInfo {
  isEmbeddable: boolean;
  isDirectVideo: boolean;
  isDirectAudio: boolean;
  isDirectImage: boolean;
  type:
    | 'youtube'
    | 'facebook'
    | 'instagram'
    | 'tiktok'
    | 'vimeo'
    | 'dailymotion'
    | 'soundcloud'
    | 'spotify'
    | 'direct_video'
    | 'direct_audio'
    | 'direct_image'
    | 'unknown';
  embedUrl: string;
  rawUrl: string;
  thumbnailUrl: string | null;
}

export function parseMediaUrl(
  url: string,
  options?: { autoplay?: boolean; mute?: boolean }
): MediaEmbedInfo {
  const defaultInfo: MediaEmbedInfo = {
    isEmbeddable: false,
    isDirectVideo: false,
    isDirectAudio: false,
    isDirectImage: false,
    type: 'unknown',
    embedUrl: url || '',
    rawUrl: url || '',
    thumbnailUrl: null,
  };

  if (!url || typeof url !== 'string') {
    return defaultInfo;
  }

  const cleanUrl = url.trim();
  const autoplay = options?.autoplay ?? true;
  const mute = options?.mute ?? true;

  // 0. Check if URL is ALREADY an embed plugin URL to avoid double-encoding
  if (cleanUrl.includes('facebook.com/plugins/video.php')) {
    return {
      isEmbeddable: true,
      isDirectVideo: false,
      isDirectAudio: false,
      isDirectImage: false,
      type: 'facebook',
      embedUrl: cleanUrl,
      rawUrl: cleanUrl,
      thumbnailUrl: null,
    };
  }

  if (cleanUrl.includes('youtube.com/embed/')) {
    const match = cleanUrl.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/);
    const videoId = match ? match[1] : null;
    return {
      isEmbeddable: true,
      isDirectVideo: false,
      isDirectAudio: false,
      isDirectImage: false,
      type: 'youtube',
      embedUrl: cleanUrl,
      rawUrl: cleanUrl,
      thumbnailUrl: videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null,
    };
  }

  if (cleanUrl.includes('instagram.com/') && cleanUrl.endsWith('/embed')) {
    return {
      isEmbeddable: true,
      isDirectVideo: false,
      isDirectAudio: false,
      isDirectImage: false,
      type: 'instagram',
      embedUrl: cleanUrl,
      rawUrl: cleanUrl,
      thumbnailUrl: null,
    };
  }

  if (cleanUrl.includes('tiktok.com/embed/')) {
    return {
      isEmbeddable: true,
      isDirectVideo: false,
      isDirectAudio: false,
      isDirectImage: false,
      type: 'tiktok',
      embedUrl: cleanUrl,
      rawUrl: cleanUrl,
      thumbnailUrl: null,
    };
  }

  // 1. YouTube
  const ytRegExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|&v=)([^#&?]*).*/i;
  const ytMatch = cleanUrl.match(ytRegExp);
  if (ytMatch && ytMatch[2].length === 11) {
    const videoId = ytMatch[2];
    const autoplayParam = autoplay ? '1' : '0';
    const muteParam = mute ? '1' : '0';
    return {
      isEmbeddable: true,
      isDirectVideo: false,
      isDirectAudio: false,
      isDirectImage: false,
      type: 'youtube',
      embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=${autoplayParam}&mute=${muteParam}&rel=0&enablejsapi=1&playsinline=1`,
      rawUrl: cleanUrl,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    };
  }

  // 2. Facebook Videos & Reels
  if (/facebook\.com|fb\.watch|fb\.com/i.test(cleanUrl)) {
    const autoplayParam = autoplay ? '1' : '0';
    return {
      isEmbeddable: true,
      isDirectVideo: false,
      isDirectAudio: false,
      isDirectImage: false,
      type: 'facebook',
      embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(cleanUrl)}&show_text=false&autoplay=${autoplayParam}`,
      rawUrl: cleanUrl,
      thumbnailUrl: null,
    };
  }

  // 3. Instagram Reels & Posts
  const igMatch = cleanUrl.match(/instagram\.com\/(?:reel|p)\/([a-zA-Z0-9_-]+)/i);
  if (igMatch) {
    const code = igMatch[1];
    return {
      isEmbeddable: true,
      isDirectVideo: false,
      isDirectAudio: false,
      isDirectImage: false,
      type: 'instagram',
      embedUrl: `https://www.instagram.com/p/${code}/embed`,
      rawUrl: cleanUrl,
      thumbnailUrl: null,
    };
  }
  if (/instagram\.com|instagr\.am/i.test(cleanUrl)) {
    return {
      isEmbeddable: true,
      isDirectVideo: false,
      isDirectAudio: false,
      isDirectImage: false,
      type: 'instagram',
      embedUrl: `${cleanUrl.replace(/\/$/, '')}/embed`,
      rawUrl: cleanUrl,
      thumbnailUrl: null,
    };
  }

  // 4. TikTok Videos
  const ttMatch = cleanUrl.match(/tiktok\.com\/@[\w.-]+\/video\/(\d+)/i) || cleanUrl.match(/tiktok\.com\/v\/(\d+)/i);
  if (ttMatch) {
    const videoId = ttMatch[1];
    return {
      isEmbeddable: true,
      isDirectVideo: false,
      isDirectAudio: false,
      isDirectImage: false,
      type: 'tiktok',
      embedUrl: `https://www.tiktok.com/embed/v2/${videoId}`,
      rawUrl: cleanUrl,
      thumbnailUrl: null,
    };
  }
  if (/tiktok\.com/i.test(cleanUrl)) {
    return {
      isEmbeddable: true,
      isDirectVideo: false,
      isDirectAudio: false,
      isDirectImage: false,
      type: 'tiktok',
      embedUrl: `https://www.tiktok.com/embed/v2/?url=${encodeURIComponent(cleanUrl)}`,
      rawUrl: cleanUrl,
      thumbnailUrl: null,
    };
  }

  // 5. Vimeo
  const vimeoMatch = cleanUrl.match(/vimeo\.com\/(\d+)/i);
  if (vimeoMatch) {
    const videoId = vimeoMatch[1];
    return {
      isEmbeddable: true,
      isDirectVideo: false,
      isDirectAudio: false,
      isDirectImage: false,
      type: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${videoId}?autoplay=${autoplay ? 1 : 0}&muted=${mute ? 1 : 0}`,
      rawUrl: cleanUrl,
      thumbnailUrl: null,
    };
  }

  // 6. Dailymotion
  const dmMatch = cleanUrl.match(/dailymotion\.com\/video\/([a-zA-Z0-9]+)/i);
  if (dmMatch) {
    const videoId = dmMatch[1];
    return {
      isEmbeddable: true,
      isDirectVideo: false,
      isDirectAudio: false,
      isDirectImage: false,
      type: 'dailymotion',
      embedUrl: `https://www.dailymotion.com/embed/video/${videoId}`,
      rawUrl: cleanUrl,
      thumbnailUrl: null,
    };
  }

  // 7. SoundCloud
  if (/soundcloud\.com/i.test(cleanUrl)) {
    return {
      isEmbeddable: true,
      isDirectVideo: false,
      isDirectAudio: true,
      isDirectImage: false,
      type: 'soundcloud',
      embedUrl: `https://w.soundcloud.com/player/?url=${encodeURIComponent(cleanUrl)}&color=%23ff5500&auto_play=${autoplay ? 'true' : 'false'}&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false`,
      rawUrl: cleanUrl,
      thumbnailUrl: null,
    };
  }

  // 8. Spotify
  const spotifyMatch = cleanUrl.match(/open\.spotify\.com\/(track|album|playlist|episode)\/([a-zA-Z0-9]+)/i);
  if (spotifyMatch) {
    const mediaType = spotifyMatch[1];
    const mediaId = spotifyMatch[2];
    return {
      isEmbeddable: true,
      isDirectVideo: false,
      isDirectAudio: true,
      isDirectImage: false,
      type: 'spotify',
      embedUrl: `https://open.spotify.com/embed/${mediaType}/${mediaId}`,
      rawUrl: cleanUrl,
      thumbnailUrl: null,
    };
  }

  // 9. Direct Image URLs
  if (/\.(jpg|jpeg|png|gif|webp|svg|avif)($|\?)/i.test(cleanUrl) || /unsplash\.com|imgur\.com|cloudinary\.com\/.*\/image/i.test(cleanUrl)) {
    return {
      isEmbeddable: false,
      isDirectVideo: false,
      isDirectAudio: false,
      isDirectImage: true,
      type: 'direct_image',
      embedUrl: cleanUrl,
      rawUrl: cleanUrl,
      thumbnailUrl: cleanUrl,
    };
  }

  // 10. Direct Audio URLs
  if (/\.(mp3|wav|aac|m4a|flac|ogg)($|\?)/i.test(cleanUrl)) {
    return {
      isEmbeddable: false,
      isDirectVideo: false,
      isDirectAudio: true,
      isDirectImage: false,
      type: 'direct_audio',
      embedUrl: cleanUrl,
      rawUrl: cleanUrl,
      thumbnailUrl: null,
    };
  }

  // 11. Direct Video URLs
  if (
    /\.(mp4|webm|mov|m3u8|ogv)($|\?)/i.test(cleanUrl) ||
    /commondatastorage|cloudinary\.com\/.*\/video|firebasestorage|amazonaws\.com/i.test(cleanUrl)
  ) {
    return {
      isEmbeddable: false,
      isDirectVideo: true,
      isDirectAudio: false,
      isDirectImage: false,
      type: 'direct_video',
      embedUrl: cleanUrl,
      rawUrl: cleanUrl,
      thumbnailUrl: null,
    };
  }

  // Default fallback (assumed direct media/video)
  return {
    isEmbeddable: false,
    isDirectVideo: true,
    isDirectAudio: false,
    isDirectImage: false,
    type: 'unknown',
    embedUrl: cleanUrl,
    rawUrl: cleanUrl,
    thumbnailUrl: null,
  };
}

export function detectPostTypeFromUrl(url: string): 'video' | 'image' | 'music' | null {
  if (!url || typeof url !== 'string' || !url.trim().startsWith('http')) return null;
  const parsed = parseMediaUrl(url);
  if (parsed.isDirectImage) return 'image';
  if (parsed.isDirectAudio || parsed.type === 'soundcloud' || parsed.type === 'spotify') return 'music';
  if (parsed.isEmbeddable || parsed.isDirectVideo || parsed.type === 'youtube' || parsed.type === 'facebook' || parsed.type === 'instagram' || parsed.type === 'tiktok' || parsed.type === 'vimeo' || parsed.type === 'dailymotion') return 'video';
  return null;
}

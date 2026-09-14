export interface YouTubeInfo {
  isYouTube: boolean;
  videoId: string | null;
  embedUrl: string | null;
  thumbnailUrl: string | null;
}

export function parseYouTubeUrl(
  url: string,
  options?: { autoplay?: boolean; mute?: boolean }
): YouTubeInfo {
  if (!url || typeof url !== 'string') {
    return { isYouTube: false, videoId: null, embedUrl: null, thumbnailUrl: null };
  }

  // Regex patterns for standard watch URLs, short URLs, shorts, embeds
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);

  if (match && match[2].length === 11) {
    const videoId = match[2];
    const autoplay = options?.autoplay ?? true;
    const mute = options?.mute ?? true;
    const autoplayParam = autoplay ? '1' : '0';
    const muteParam = mute ? '1' : '0';
    return {
      isYouTube: true,
      videoId,
      embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=${autoplayParam}&mute=${muteParam}&rel=0&enablejsapi=1&playsinline=1`,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    };
  }

  return { isYouTube: false, videoId: null, embedUrl: null, thumbnailUrl: null };
}

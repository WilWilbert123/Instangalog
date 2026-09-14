import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Instangalog Multimedia Social Platform',
    short_name: 'Instangalog',
    description: 'A modern multimedia social platform for video, music, images, statuses, and realtime community chat.',
    start_url: '/',
    display: 'standalone',
    background_color: '#090D16',
    theme_color: '#7C3AED',
    orientation: 'portrait',
    categories: ['social', 'entertainment', 'music', 'video'],
    lang: 'en',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}

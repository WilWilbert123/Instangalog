import { NextResponse } from 'next/server';
import { getFYPVideos } from '@/lib/services/postService';

export async function GET() {
  const videos = await getFYPVideos();
  return NextResponse.json({ success: true, videos });
}

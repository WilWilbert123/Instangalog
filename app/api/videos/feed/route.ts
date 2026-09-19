import { NextRequest, NextResponse } from 'next/server';
import { getFYPVideos } from '@/lib/services/postService';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId') || undefined;
  const userEmail = searchParams.get('userEmail') || undefined;

  const currentUser = (userId || userEmail) ? { id: userId, email: userEmail } : null;
  const videos = await getFYPVideos(currentUser);
  return NextResponse.json({ success: true, videos });
}


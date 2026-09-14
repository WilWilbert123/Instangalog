import { NextRequest, NextResponse } from 'next/server';
import { checkIsFollowing } from '@/lib/services/followService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const followerId = searchParams.get('followerId');
    const followingId = searchParams.get('followingId');

    if (!followerId || !followingId) {
      return NextResponse.json({ isFollowing: false });
    }

    const isFollowing = await checkIsFollowing(followerId, followingId);
    return NextResponse.json({ isFollowing });
  } catch {
    return NextResponse.json({ isFollowing: false });
  }
}

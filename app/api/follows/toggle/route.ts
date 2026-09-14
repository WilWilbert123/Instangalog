import { NextRequest, NextResponse } from 'next/server';
import { toggleFollow } from '@/lib/services/followService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { followerId, followingId, followerProfile } = body;

    if (!followerId || !followingId) {
      return NextResponse.json({ error: 'Missing followerId or followingId' }, { status: 400 });
    }

    const result = await toggleFollow(followerId, followingId, followerProfile || {});
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error('[API /api/follows/toggle error]:', err?.message);
    return NextResponse.json({ error: err?.message || 'Failed to toggle follow' }, { status: 500 });
  }
}

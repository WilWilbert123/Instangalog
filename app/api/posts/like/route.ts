import { NextRequest, NextResponse } from 'next/server';
import { togglePostLike } from '@/lib/services/postService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { postId, userId, currentlyLiked } = body;

    if (!postId || !userId) {
      return NextResponse.json({ error: 'Missing postId or userId' }, { status: 400 });
    }

    const isLiked = await togglePostLike(postId, userId, currentlyLiked);
    return NextResponse.json({ success: true, isLiked });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to toggle like' }, { status: 500 });
  }
}

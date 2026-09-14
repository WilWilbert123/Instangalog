import { NextRequest, NextResponse } from 'next/server';
import { getUserPendingPosts } from '@/lib/services/postService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const posts = await getUserPendingPosts(userId);
    return NextResponse.json({ success: true, posts });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to fetch user pending posts' }, { status: 500 });
  }
}

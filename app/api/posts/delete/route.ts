import { NextRequest, NextResponse } from 'next/server';
import { deletePost } from '@/lib/services/postService';

export async function POST(request: NextRequest) {
  try {
    const { postId, userId, userEmail } = await request.json();

    if (!postId || !userId) {
      return NextResponse.json(
        { error: 'Post ID and User ID are required.' },
        { status: 400 }
      );
    }

    const result = await deletePost(postId, userId, userEmail);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[API /api/posts/delete error]:', err?.message);
    return NextResponse.json(
      { error: err?.message || 'Failed to delete post' },
      { status: 500 }
    );
  }
}

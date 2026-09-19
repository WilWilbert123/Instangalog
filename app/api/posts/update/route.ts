import { NextRequest, NextResponse } from 'next/server';
import { updatePost } from '@/lib/services/postService';

export async function POST(request: NextRequest) {
  try {
    const { postId, updates, userId, userEmail } = await request.json();

    if (!postId || !userId) {
      return NextResponse.json(
        { error: 'Post ID and User ID are required.' },
        { status: 400 }
      );
    }

    const updated = await updatePost(postId, updates, userId, userEmail);
    return NextResponse.json({ success: true, post: updated });
  } catch (err: any) {
    console.error('[API /api/posts/update error]:', err?.message);
    return NextResponse.json(
      { error: err?.message || 'Failed to update post' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { addComment } from '@/lib/services/commentService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { postId, userId, content, parentId } = body;

    if (!postId || !userId || !content) {
      return NextResponse.json({ error: 'Missing postId, userId, or content' }, { status: 400 });
    }

    const comment = await addComment(postId, userId, content, parentId);
    return NextResponse.json({ success: true, comment });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to add comment' }, { status: 403 });
  }
}

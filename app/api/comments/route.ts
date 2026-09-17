import { NextRequest, NextResponse } from 'next/server';
import { getCommentsForPost, addComment } from '@/lib/services/commentService';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const postId = searchParams.get('postId');

  if (!postId) {
    return NextResponse.json({ error: 'postId parameter required' }, { status: 400 });
  }

  const comments = await getCommentsForPost(postId);
  return NextResponse.json({ comments });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { postId, userId, content, parentId } = body;

    if (!postId || !userId || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const comment = await addComment(postId, userId, content, parentId);
    return NextResponse.json({ success: true, comment });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to create comment' }, { status: 403 });
  }
}

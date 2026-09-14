import { NextRequest, NextResponse } from 'next/server';
import { createPost } from '@/lib/services/postService';

export async function POST(request: NextRequest) {
  try {
    const postData = await request.json();
    const createdPost = await createPost(postData);
    return NextResponse.json({ success: true, post: createdPost });
  } catch (err: any) {
    console.error('[API /api/posts/create error]:', err?.message);
    return NextResponse.json({ error: err?.message || 'Failed to create post' }, { status: 500 });
  }
}

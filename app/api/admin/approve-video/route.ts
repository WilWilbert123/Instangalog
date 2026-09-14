import { NextRequest, NextResponse } from 'next/server';
import { approvePost } from '@/lib/services/adminService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { postId, adminId } = body;

    if (!postId || !adminId) {
      return NextResponse.json({ error: 'Missing postId or adminId' }, { status: 400 });
    }

    const post = await approvePost(postId, adminId);
    return NextResponse.json({ success: true, post });
  } catch {
    return NextResponse.json({ error: 'Failed to approve content' }, { status: 500 });
  }
}

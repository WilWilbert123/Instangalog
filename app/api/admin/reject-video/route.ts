import { NextRequest, NextResponse } from 'next/server';
import { rejectPost } from '@/lib/services/adminService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { postId, adminId, reason } = body;

    if (!postId || !adminId || !reason) {
      return NextResponse.json({ error: 'Missing postId, adminId or reason' }, { status: 400 });
    }

    const post = await rejectPost(postId, adminId, reason);
    return NextResponse.json({ success: true, post });
  } catch {
    return NextResponse.json({ error: 'Failed to reject content' }, { status: 500 });
  }
}

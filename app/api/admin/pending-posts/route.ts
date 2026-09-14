import { NextResponse } from 'next/server';
import { getPendingPosts } from '@/lib/services/adminService';

export async function GET() {
  try {
    const posts = await getPendingPosts();
    return NextResponse.json({ success: true, posts });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to fetch pending posts' }, { status: 500 });
  }
}

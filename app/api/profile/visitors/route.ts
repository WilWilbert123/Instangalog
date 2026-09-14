import { NextRequest, NextResponse } from 'next/server';
import { getProfileVisitors } from '@/lib/services/visitorService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const profileId = searchParams.get('profileId');

    if (!profileId) {
      return NextResponse.json({ error: 'Missing profileId' }, { status: 400 });
    }

    const visitors = await getProfileVisitors(profileId);
    return NextResponse.json({ success: true, visitors });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to fetch visitors' }, { status: 500 });
  }
}

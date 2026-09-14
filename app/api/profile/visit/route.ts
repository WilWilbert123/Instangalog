import { NextRequest, NextResponse } from 'next/server';
import { recordProfileVisit } from '@/lib/services/visitorService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { profileId, visitorId } = body;

    if (!profileId || !visitorId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const ok = await recordProfileVisit(profileId, visitorId);
    return NextResponse.json({ success: ok });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to record visit' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getSystemSettings, updateSystemSettings } from '@/lib/services/systemSettings';

export async function GET() {
  try {
    const settings = await getSystemSettings();
    return NextResponse.json({ success: true, settings });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { requireVideoApproval, autoApproveImageStatus, enableChatRateLimit, enableSpamFilter } = body;

    const updated = await updateSystemSettings({
      ...(typeof requireVideoApproval === 'boolean' && { requireVideoApproval }),
      ...(typeof autoApproveImageStatus === 'boolean' && { autoApproveImageStatus }),
      ...(typeof enableChatRateLimit === 'boolean' && { enableChatRateLimit }),
      ...(typeof enableSpamFilter === 'boolean' && { enableSpamFilter }),
    });

    return NextResponse.json({ success: true, settings: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to save settings' }, { status: 500 });
  }
}

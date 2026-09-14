import { NextRequest, NextResponse } from 'next/server';
import { createReport } from '@/lib/services/adminService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reporterId, targetType, targetId, reason, description } = body;

    if (!reporterId || !targetType || !targetId || !reason) {
      return NextResponse.json({ error: 'Missing required report parameters' }, { status: 400 });
    }

    const ok = await createReport({
      reporter_id: reporterId,
      target_type: targetType,
      target_id: targetId,
      reason,
      description,
    });

    if (!ok) {
      return NextResponse.json({ error: 'Failed to record report in database' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[API /api/reports/create error]:', err?.message);
    return NextResponse.json({ error: err?.message || 'Server error creating report' }, { status: 500 });
  }
}

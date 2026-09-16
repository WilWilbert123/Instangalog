import { NextRequest, NextResponse } from 'next/server';
import { getPagpagLeaderboard, submitPagpagScore } from '@/lib/services/gameService';

export async function GET() {
  try {
    const leaderboard = await getPagpagLeaderboard();
    return NextResponse.json({ success: true, leaderboard });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to fetch leaderboard' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, score } = body;

    if (!userId || typeof score !== 'number') {
      return NextResponse.json({ error: 'Missing userId or score' }, { status: 400 });
    }

    const result = await submitPagpagScore(userId, score);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to submit score' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getPagpagRaceLeaderboard, submitPagpagRaceResult } from '@/lib/services/gameService';

export async function GET() {
  try {
    const leaderboard = await getPagpagRaceLeaderboard();
    return NextResponse.json({ success: true, leaderboard });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to fetch race leaderboard' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, raceTime, placement } = body;

    if (!userId || typeof raceTime !== 'number' || typeof placement !== 'number') {
      return NextResponse.json({ error: 'Missing userId, raceTime, or placement' }, { status: 400 });
    }

    const result = await submitPagpagRaceResult(userId, raceTime, placement);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to submit race result' }, { status: 500 });
  }
}

import { supabase } from '@/lib/supabase/client';
import { supabaseAdmin } from '@/lib/supabase/admin';

export interface LeaderboardItem {
  userId: string;
  username: string;
  displayName: string;
  score: number;
  avatar: string;
}

export interface RaceLeaderboardItem {
  userId: string;
  username: string;
  displayName: string;
  bestTime: number;
  winsCount: number;
  racesCount: number;
  avatar: string;
}

// ---------------------------------------------------------------------------
// Pagpag Hunt Arcade High Scores
// ---------------------------------------------------------------------------
export async function getPagpagLeaderboard(): Promise<LeaderboardItem[]> {
  try {
    const { data, error } = await (supabase
      .from('pagpag_game_scores') as any)
      .select(`
        score,
        user_id,
        author:profiles (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .order('score', { ascending: false })
      .limit(10);

    if (error || !data) {
      return [];
    }

    const formatted: LeaderboardItem[] = data.map((item: any) => ({
      userId: item.user_id,
      username: item.author?.username || 'user',
      displayName: item.author?.display_name || 'Player',
      score: item.score || 0,
      avatar: item.author?.avatar_url || '',
    }));

    return formatted;
  } catch {
    return [];
  }
}

export async function submitPagpagScore(userId: string, newScore: number): Promise<{ success: boolean; personalHighScore: number; leaderboard: LeaderboardItem[] }> {
  try {
    const { data: existing } = await (supabaseAdmin
      .from('pagpag_game_scores') as any)
      .select('score')
      .eq('user_id', userId)
      .maybeSingle();

    let personalHighScore = newScore;

    if (existing) {
      if (newScore > existing.score) {
        await (supabaseAdmin.from('pagpag_game_scores') as any)
          .update({ score: newScore, updated_at: new Date().toISOString() })
          .eq('user_id', userId);
        personalHighScore = newScore;
      } else {
        personalHighScore = existing.score;
      }
    } else {
      await (supabaseAdmin.from('pagpag_game_scores') as any).upsert(
        {
          user_id: userId,
          score: newScore,
        },
        { onConflict: 'user_id' }
      );
    }

    const leaderboard = await getPagpagLeaderboard();
    return { success: true, personalHighScore, leaderboard };
  } catch (err: any) {
    console.warn('[gameService] submitPagpagScore warning:', err?.message);
    const leaderboard = await getPagpagLeaderboard();
    return { success: false, personalHighScore: newScore, leaderboard };
  }
}

// ---------------------------------------------------------------------------
// Pagpag Tap Race Best Times & Statistics
// ---------------------------------------------------------------------------
export async function getPagpagRaceLeaderboard(): Promise<RaceLeaderboardItem[]> {
  try {
    const { data, error } = await (supabase
      .from('pagpag_race_records') as any)
      .select(`
        best_time,
        wins_count,
        races_count,
        user_id,
        author:profiles (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .order('best_time', { ascending: true })
      .limit(10);

    if (error || !data) {
      return [];
    }

    const formatted: RaceLeaderboardItem[] = data.map((item: any) => ({
      userId: item.user_id,
      username: item.author?.username || 'racer',
      displayName: item.author?.display_name || 'Racer',
      bestTime: Number(item.best_time) || 999.99,
      winsCount: item.wins_count || 0,
      racesCount: item.races_count || 0,
      avatar: item.author?.avatar_url || '',
    }));

    return formatted;
  } catch {
    return [];
  }
}

export async function submitPagpagRaceResult(
  userId: string,
  raceTime: number,
  placement: number
): Promise<{ success: boolean; personalBestTime: number; leaderboard: RaceLeaderboardItem[] }> {
  try {
    const isWin = placement === 1;

    const { data: existing } = await (supabaseAdmin
      .from('pagpag_race_records') as any)
      .select('best_time, wins_count, races_count')
      .eq('user_id', userId)
      .maybeSingle();

    let personalBestTime = raceTime;

    if (existing) {
      const currentBest = Number(existing.best_time) || 999.99;
      personalBestTime = raceTime < currentBest ? raceTime : currentBest;

      await (supabaseAdmin.from('pagpag_race_records') as any)
        .update({
          best_time: personalBestTime,
          wins_count: (existing.wins_count || 0) + (isWin ? 1 : 0),
          races_count: (existing.races_count || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);
    } else {
      await (supabaseAdmin.from('pagpag_race_records') as any).upsert(
        {
          user_id: userId,
          best_time: raceTime,
          wins_count: isWin ? 1 : 0,
          races_count: 1,
        },
        { onConflict: 'user_id' }
      );
    }

    const leaderboard = await getPagpagRaceLeaderboard();
    return { success: true, personalBestTime, leaderboard };
  } catch (err: any) {
    console.warn('[gameService] submitPagpagRaceResult warning:', err?.message);
    const leaderboard = await getPagpagRaceLeaderboard();
    return { success: false, personalBestTime: raceTime, leaderboard };
  }
}

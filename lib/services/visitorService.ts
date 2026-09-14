import { supabase } from '@/lib/supabase/client';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { ensureValidUuid } from '@/lib/utils/uuid';
import { Profile } from '@/types/user';

export interface ProfileVisitor {
  id: string;
  profile_id: string;
  visitor_id: string;
  visited_at: string;
  visitor?: Profile;
}

// Record a visit to a user's profile
export async function recordProfileVisit(profileId: string, visitorId: string): Promise<boolean> {
  // Don't record visiting your own profile
  if (!profileId || !visitorId || profileId === visitorId) return false;

  const validProfileId = ensureValidUuid(profileId);
  const validVisitorId = ensureValidUuid(visitorId);

  try {
    // 1. Try inserting visit into profile_visits table via supabaseAdmin
    const { error } = await (supabaseAdmin.from('profile_visits') as any).upsert(
      {
        profile_id: validProfileId,
        visitor_id: validVisitorId,
        visited_at: new Date().toISOString(),
      },
      { onConflict: 'profile_id,visitor_id' }
    );

    if (!error) return true;

    // 2. Fallback to views table if profile_visits table doesn't exist yet
    const { error: viewErr } = await (supabaseAdmin.from('views') as any).insert({
      user_id: validVisitorId,
      post_id: validProfileId,
      created_at: new Date().toISOString(),
    });

    return !viewErr;
  } catch (err: any) {
    console.error('[recordProfileVisit error]:', err?.message);
    return false;
  }
}

// Fetch recent visitors to a user's profile
export async function getProfileVisitors(profileId: string): Promise<ProfileVisitor[]> {
  const validProfileId = ensureValidUuid(profileId);

  try {
    // 1. Query profile_visits table joined with visitor profiles
    let { data, error } = await supabaseAdmin
      .from('profile_visits')
      .select(`
        *,
        visitor:profiles!profile_visits_visitor_id_fkey(*)
      `)
      .eq('profile_id', validProfileId)
      .order('visited_at', { ascending: false })
      .limit(30);

    if (!error && data && data.length > 0) {
      return data as unknown as ProfileVisitor[];
    }

    // 2. Fallback query if FK constraint name differs
    const { data: rawData, error: rawErr } = await supabaseAdmin
      .from('profile_visits')
      .select('*')
      .eq('profile_id', validProfileId)
      .order('visited_at', { ascending: false })
      .limit(30);

    if (!rawErr && rawData && rawData.length > 0) {
      const visitorIds = Array.from(new Set(rawData.map((r: any) => r.visitor_id)));
      const { data: profileList } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .in('id', visitorIds);

      const profileMap = new Map((profileList || []).map((p: any) => [p.id, p]));

      return rawData.map((r: any) => ({
        ...r,
        visitor: profileMap.get(r.visitor_id),
      })) as ProfileVisitor[];
    }
  } catch (err: any) {
    console.warn('[getProfileVisitors error]:', err?.message);
  }

  return [];
}

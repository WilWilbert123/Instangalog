import { Profile } from '@/types/user';
import { Post } from '@/types/post';
import { MOCK_PROFILES, MOCK_POSTS } from './mockData';
import { supabase } from '@/lib/supabase/client';

// Global in-memory cache for dynamic & updated user profiles
const DYNAMIC_PROFILES = new Map<string, Profile>();

export async function getProfileByUsername(username: string): Promise<Profile | null> {
  const cleanKey = username.trim().toLowerCase();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(username.trim());

  // 1. Query Supabase profiles table first for live database record
  try {
    let query = supabase.from('profiles').select('*');
    if (isUuid) {
      query = query.or(`username.ilike.${cleanKey},id.eq.${username.trim()}`);
    } else {
      query = query.ilike('username', cleanKey);
    }

    const { data, error } = await query.limit(1).maybeSingle();

    if (!error && data) {
      const p = data as unknown as Profile;
      DYNAMIC_PROFILES.set(cleanKey, p);
      DYNAMIC_PROFILES.set(p.id, p);
      if (p.username) {
        DYNAMIC_PROFILES.set(p.username.toLowerCase(), p);
      }
      return p;
    }
  } catch {
    // Fallthrough
  }

  // 2. Check in-memory dynamic cache if Supabase query returned no result
  if (DYNAMIC_PROFILES.has(cleanKey)) {
    return DYNAMIC_PROFILES.get(cleanKey)!;
  }

  // 3. Fallback to MOCK_PROFILES
  const mockP = MOCK_PROFILES.find((p) => p.username.toLowerCase() === cleanKey);
  if (mockP) {
    DYNAMIC_PROFILES.set(cleanKey, mockP);
    return mockP;
  }

  // 4. Default fallback profile for any custom handle
  const defaultProfile: Profile = {
    id: `user-${username}`,
    username,
    display_name: username.charAt(0).toUpperCase() + username.slice(1),
    avatar_url: '',
    bio: '',
    role: 'user',
    status: 'active',
    followers_count: 0,
    following_count: 0,
    posts_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  DYNAMIC_PROFILES.set(cleanKey, defaultProfile);
  return defaultProfile;
}

export async function updateProfile(
  userId: string,
  updates: {
    display_name?: string;
    username?: string;
    avatar_url?: string;
    bio?: string;
  },
  currentUsername?: string
): Promise<{ success: boolean; error?: string; data?: Profile }> {
  let cleanUsername = updates.username
    ? updates.username.trim().toLowerCase().replace(/[^a-z0-9._]/g, '')
    : undefined;

  if (updates.username && !cleanUsername) {
    return { success: false, error: 'Username must contain valid characters' };
  }

  // Check if username is taken by another user in Supabase
  if (cleanUsername) {
    try {
      const { data: taken } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', cleanUsername)
        .neq('id', userId)
        .maybeSingle();

      if (taken) {
        return {
          success: false,
          error: `Username "@${cleanUsername}" is already taken by another user. Please choose another username.`,
        };
      }
    } catch {
      // Fallthrough
    }
  }

  // Fetch current existing profile
  const existingKey = currentUsername || cleanUsername || userId;
  const existing = await getProfileByUsername(existingKey);

  const updatedProfile: Profile = {
    id: userId,
    username: cleanUsername || existing?.username || currentUsername || 'user',
    display_name: updates.display_name?.trim() || existing?.display_name || 'User',
    avatar_url: updates.avatar_url !== undefined ? updates.avatar_url : (existing?.avatar_url || ''),
    bio: updates.bio !== undefined ? updates.bio : (existing?.bio || ''),
    role: existing?.role || 'user',
    status: existing?.status || 'active',
    followers_count: existing?.followers_count || 0,
    following_count: existing?.following_count || 0,
    posts_count: existing?.posts_count || 0,
    created_at: existing?.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Save to in-memory dynamic cache for ID, new username, and old username
  DYNAMIC_PROFILES.set(updatedProfile.id, updatedProfile);
  DYNAMIC_PROFILES.set(updatedProfile.username.toLowerCase(), updatedProfile);
  if (currentUsername) {
    DYNAMIC_PROFILES.set(currentUsername.toLowerCase(), updatedProfile);
  }

  // Update MOCK_PROFILES array if present
  const mockIdx = MOCK_PROFILES.findIndex(
    (p) =>
      p.id === userId ||
      (currentUsername && p.username.toLowerCase() === currentUsername.toLowerCase()) ||
      (cleanUsername && p.username.toLowerCase() === cleanUsername.toLowerCase())
  );
  if (mockIdx !== -1) {
    MOCK_PROFILES[mockIdx] = updatedProfile;
  } else {
    MOCK_PROFILES.push(updatedProfile);
  }

  // Attempt Supabase DB update if authenticated user session exists
  try {
    const { data: authData } = await supabase.auth.getUser();
    if (authData?.user) {
      const { data: dbData, error } = await (supabase.from('profiles') as any)
        .upsert(
          {
            id: authData.user.id,
            username: updatedProfile.username,
            display_name: updatedProfile.display_name,
            avatar_url: updatedProfile.avatar_url,
            bio: updatedProfile.bio,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        )
        .select()
        .maybeSingle();

      if (!error && dbData) {
        const finalProfile = dbData as Profile;
        DYNAMIC_PROFILES.set(finalProfile.id, finalProfile);
        DYNAMIC_PROFILES.set(finalProfile.username.toLowerCase(), finalProfile);
        return { success: true, data: finalProfile };
      }
    }
  } catch (err: any) {
    console.warn('[updateProfile Supabase error]:', err?.message);
  }

  return { success: true, data: updatedProfile };
}

export async function getUserPosts(userId: string): Promise<Post[]> {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        author:profiles!posts_user_id_fkey(*),
        video:videos(*),
        image:images(*),
        music:music(*),
        status:statuses(*)
      `)
      .eq('user_id', userId)
      .eq('moderation_status', 'approved')
      .order('created_at', { ascending: false });

    if (!error && data) {
      return data as unknown as Post[];
    }
  } catch {
    // Fallback
  }

  return [];
}

export async function getAllProfiles(): Promise<Profile[]> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('followers_count', { ascending: false });

    if (!error && data) {
      return data as unknown as Profile[];
    }
  } catch {
    // Fallback
  }

  return [];
}

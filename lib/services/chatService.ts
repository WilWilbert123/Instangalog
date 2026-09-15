import { ChatMessage } from '@/types/chat';
import { supabase } from '@/lib/supabase/client';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { RealtimeChannel } from '@supabase/supabase-js';
import { getAvatarUrl } from '@/lib/utils/avatar';

let chatChannel: RealtimeChannel | null = null;

export interface TypingUser {
  userId: string;
  displayName: string;
}

// ---------------------------------------------------------------------------
// Fetch the last 60 messages with author profile joined
// ---------------------------------------------------------------------------
export async function getGlobalChatMessages(): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select(`
      id,
      user_id,
      message,
      created_at,
      author:profiles (
        id,
        username,
        display_name,
        avatar_url,
        role
      )
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .limit(60);

  if (error) {
    console.error('[Chat] getGlobalChatMessages error:', error.message);
    return [];
  }

  return (data ?? []) as unknown as ChatMessage[];
}

// ---------------------------------------------------------------------------
// Ensure the signed-in Google user has a row in `profiles`.
// Called once after Google OAuth callback so subsequent INSERT into
// chat_messages (which FK → profiles) succeeds.
// ---------------------------------------------------------------------------
export async function upsertProfile(supabaseUser: {
  id: string;
  email: string;
  user_metadata?: Record<string, unknown>;
}) {
  if (!supabaseUser?.id) return;

  // Check if profile row already exists in Supabase to preserve custom user edits
  const { data: existing } = await (supabaseAdmin.from('profiles') as any)
    .select('id')
    .eq('id', supabaseUser.id)
    .maybeSingle();

  if (existing) {
    return;
  }

  const meta = supabaseUser.user_metadata ?? {};
  const ADMIN_EMAIL = 'johnwilbertgamis2022@gmail.com';
  const cleanEmail = (supabaseUser.email || '').toLowerCase();
  const isAdmin = cleanEmail === ADMIN_EMAIL.toLowerCase();

  let baseUsername =
    isAdmin
      ? 'johnwilbert'
      : ((meta.preferred_username as string) ||
         (meta.user_name as string) ||
         cleanEmail.split('@')[0] ||
         `user_${supabaseUser.id.slice(0, 6)}`
        ).replace(/[^a-z0-9_]/gi, '_').toLowerCase();

  if (!baseUsername || baseUsername === '_') {
    baseUsername = `user_${supabaseUser.id.slice(0, 6)}`;
  }

  // Ensure username is unique before attempting insert
  let finalUsername = baseUsername;
  try {
    const { data: usernameConflict } = await (supabaseAdmin.from('profiles') as any)
      .select('id')
      .eq('username', finalUsername)
      .neq('id', supabaseUser.id)
      .maybeSingle();

    if (usernameConflict) {
      finalUsername = `${baseUsername}_${Math.floor(1000 + Math.random() * 9000)}`;
    }
  } catch {
    // Ignore query error, retry safely on insert
  }

  const display_name =
    isAdmin
      ? 'John Wilbert (Admin)'
      : (meta.full_name as string) || (meta.name as string) || baseUsername;

  const rawAvatar = (meta.avatar_url as string) || (meta.picture as string) || '';
  const avatar_url = getAvatarUrl(rawAvatar, finalUsername || display_name);

  let { error } = await (supabaseAdmin.from('profiles') as any).upsert(
    {
      id: supabaseUser.id,
      username: finalUsername,
      display_name,
      avatar_url,
      role: isAdmin ? 'admin' : 'user',
      status: 'active',
    },
    { onConflict: 'id', ignoreDuplicates: true }
  );

  if (error) {
    // Handle unique constraint violation on username cleanly with fallback
    if (error.message.includes('profiles_username_key') || error.code === '23505') {
      const fallbackUsername = `${baseUsername}_${Date.now().toString().slice(-5)}`;
      await (supabaseAdmin.from('profiles') as any).upsert(
        {
          id: supabaseUser.id,
          username: fallbackUsername,
          display_name,
          avatar_url: getAvatarUrl(rawAvatar, fallbackUsername),
          role: isAdmin ? 'admin' : 'user',
          status: 'active',
        },
        { onConflict: 'id' }
      );
    } else {
      console.warn('[Chat] upsertProfile notice:', error.message);
    }
  }
}

// Rate limiting map: userId -> array of message timestamps
const userMessageTimestamps = new Map<string, number[]>();

export function checkChatRateLimit(userId: string): boolean {
  const now = Date.now();
  const windowMs = 10000; // 10 seconds
  const maxMessages = 5;

  const timestamps = (userMessageTimestamps.get(userId) || []).filter((t) => now - t < windowMs);
  if (timestamps.length >= maxMessages) {
    return false; // Exceeded max 5 messages per 10s
  }

  timestamps.push(now);
  userMessageTimestamps.set(userId, timestamps);
  return true;
}

// ---------------------------------------------------------------------------
// Send a real chat message to Supabase.
// The Supabase client automatically sends the session JWT so RLS
// auth.uid() = user_id check passes.
// ---------------------------------------------------------------------------
export async function sendChatMessage(
  _userId: string, // kept for API compatibility but not used directly
  message: string
): Promise<ChatMessage | null> {
  // Get the real Supabase session user id
  const { data: sessionData } = await supabase.auth.getUser();
  const realUserId = sessionData?.user?.id;

  if (!realUserId) {
    console.error('[Chat] No active Supabase session — cannot send message');
    return null;
  }

  if (!checkChatRateLimit(realUserId)) {
    throw new Error('Rate limit exceeded: Please wait before sending more messages (Max 5 per 10 seconds).');
  }

  const { data, error } = await (supabase
    .from('chat_messages') as any)
    .insert({ user_id: realUserId, message })
    .select(`
      id,
      user_id,
      message,
      created_at,
      author:profiles (
        id,
        username,
        display_name,
        avatar_url,
        role
      )
    `)
    .single();

  if (error) {
    console.error('[Chat] sendChatMessage error:', error.message);
    return null;
  }

  return data as unknown as ChatMessage;
}

// ---------------------------------------------------------------------------
// Subscribe to real-time chat events:
//   1. Postgres INSERT on chat_messages (DB-level broadcast)
//   2. WebSocket broadcast for typing indicator
//   3. Presence sync for online user count
// ---------------------------------------------------------------------------
export function subscribeToGlobalChat(
  currentUser: { id: string; display_name: string } | null,
  onNewMessage: (message: ChatMessage) => void,
  onTypingStatusChange: (typingUsers: TypingUser[]) => void,
  onPresenceChange: (onlineCount: number) => void
): () => void {
  const activeTypingMap = new Map<string, { displayName: string; timeout: NodeJS.Timeout }>();

  // Clean up any stale channel
  if (chatChannel) {
    try { supabase.removeChannel(chatChannel); } catch { /* ignore */ }
    chatChannel = null;
  }
  try {
    supabase.getChannels().forEach((ch) => {
      if (ch.topic.includes('global-chat')) supabase.removeChannel(ch);
    });
  } catch { /* ignore */ }

  const channelId = `global-chat-${Date.now()}`;
  const presenceKey = currentUser?.id ?? `guest-${Math.random().toString(36).slice(7)}`;

  const channel = supabase.channel(channelId, {
    config: { presence: { key: presenceKey } },
  });

  chatChannel = channel;

  const getTypingList = (): TypingUser[] => {
    return Array.from(activeTypingMap.entries()).map(([uId, v]) => ({
      userId: uId,
      displayName: v.displayName,
    }));
  };

  channel
    // 1. DB-level new message → fetch full author profile and emit
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages' },
      async (payload) => {
        const newRecord = payload.new as {
          id: string;
          user_id: string;
          message: string;
          created_at: string;
        };

        const { data: profile } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url, role')
          .eq('id', newRecord.user_id)
          .single();

        const fullMsg: ChatMessage = {
          id: newRecord.id,
          user_id: newRecord.user_id,
          message: newRecord.message,
          created_at: newRecord.created_at,
          author: profile ?? undefined,
        };

        onNewMessage(fullMsg);
      }
    )
    // 2. Typing indicator broadcast
    .on('broadcast', { event: 'typing' }, (payload) => {
      const { userId, displayName, username, isTyping } = (payload.payload ?? {}) as {
        userId?: string;
        displayName?: string;
        username?: string;
        isTyping?: boolean;
      };

      const key = userId || displayName || username;
      if (!key) return;

      const nameToDisplay = displayName || username || 'Someone';

      if (isTyping) {
        if (activeTypingMap.has(key)) {
          clearTimeout(activeTypingMap.get(key)!.timeout);
        }
        const t = setTimeout(() => {
          activeTypingMap.delete(key);
          onTypingStatusChange(getTypingList());
        }, 3500);
        activeTypingMap.set(key, { displayName: nameToDisplay, timeout: t });
      } else {
        if (activeTypingMap.has(key)) {
          clearTimeout(activeTypingMap.get(key)!.timeout);
          activeTypingMap.delete(key);
        }
      }

      onTypingStatusChange(getTypingList());
    })
    // 3. Presence sync → realtime online user count
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const count = Object.keys(state).length;
      onPresenceChange(Math.max(count, 1));
    })
    .on('presence', { event: 'join' }, () => {
      const state = channel.presenceState();
      const count = Object.keys(state).length;
      onPresenceChange(Math.max(count, 1));
    })
    .on('presence', { event: 'leave' }, () => {
      const state = channel.presenceState();
      const count = Object.keys(state).length;
      onPresenceChange(Math.max(count, 1));
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          user_id: currentUser?.id || presenceKey,
          display_name: currentUser?.display_name || 'Guest',
          online_at: new Date().toISOString(),
        });
      }
    });

  return () => {
    if (chatChannel === channel) chatChannel = null;
    try { supabase.removeChannel(channel); } catch { /* ignore */ }
  };
}

// ---------------------------------------------------------------------------
// Broadcast typing status to other subscribers
// ---------------------------------------------------------------------------
export function sendTypingBroadcast(
  userOrName: string | { id: string; display_name: string },
  isTyping: boolean
) {
  if (!chatChannel) return;

  const payload =
    typeof userOrName === 'string'
      ? { userId: userOrName, displayName: userOrName, isTyping }
      : { userId: userOrName.id, displayName: userOrName.display_name, isTyping };

  chatChannel.send({
    type: 'broadcast',
    event: 'typing',
    payload,
  });
}

// ---------------------------------------------------------------------------
// Delete a chat message (Admin moderation)
// ---------------------------------------------------------------------------
export async function deleteChatMessage(id: string): Promise<boolean> {
  try {
    const { error } = await (supabaseAdmin.from('chat_messages') as any)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (!error) return true;

    const { error: hardErr } = await (supabaseAdmin.from('chat_messages') as any)
      .delete()
      .eq('id', id);

    return !hardErr;
  } catch (err: any) {
    console.error('[deleteChatMessage error]:', err?.message);
    return false;
  }
}


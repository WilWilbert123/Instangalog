import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const currentUserId = searchParams.get('currentUserId');
    const targetUserId = searchParams.get('targetUserId');

    if (!currentUserId) {
      return NextResponse.json({ success: false, error: 'Missing currentUserId' }, { status: 400 });
    }

    if (targetUserId) {
      // Fetch 1-on-1 chat history between currentUserId and targetUserId
      const { data: messages, error } = await (supabaseAdmin.from('direct_messages') as any)
        .select(`
          id,
          sender_id,
          receiver_id,
          message,
          is_read,
          created_at
        `)
        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},receiver_id.eq.${currentUserId})`)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, messages: messages || [] });
    }

    // Fetch conversation summary list (latest message for each contact)
    const { data: rawMessages, error } = await (supabaseAdmin.from('direct_messages') as any)
      .select(`
        id,
        sender_id,
        receiver_id,
        message,
        is_read,
        created_at,
        sender:profiles!direct_messages_sender_id_fkey(id, username, display_name, avatar_url),
        receiver:profiles!direct_messages_receiver_id_fkey(id, username, display_name, avatar_url)
      `)
      .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
      .order('created_at', { ascending: false })
      .limit(150);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Map into latest message per contact
    const recentContactsMap = new Map<string, any>();
    (rawMessages || []).forEach((msg: any) => {
      const otherUser = msg.sender_id === currentUserId ? msg.receiver : msg.sender;
      if (!otherUser || !otherUser.id) return;
      if (!recentContactsMap.has(otherUser.id)) {
        recentContactsMap.set(otherUser.id, {
          user: otherUser,
          lastMessage: msg.message,
          lastMessageTime: msg.created_at,
          unread: !msg.is_read && msg.receiver_id === currentUserId,
        });
      }
    });

    const recentConversations = Array.from(recentContactsMap.values());
    return NextResponse.json({ success: true, conversations: recentConversations });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { senderId, receiverId, message } = body;

    if (!senderId || !receiverId || !message?.trim()) {
      return NextResponse.json({ success: false, error: 'Missing required parameters' }, { status: 400 });
    }

    const { data: senderProfile } = await (supabaseAdmin.from('profiles') as any)
      .select('status')
      .eq('id', senderId)
      .maybeSingle();

    if (senderProfile?.status === 'suspended') {
      return NextResponse.json(
        { success: false, error: 'Your account is currently SUSPENDED due to content policy violations. Direct messaging is restricted.' },
        { status: 403 }
      );
    }

    if (senderProfile?.status === 'banned') {
      return NextResponse.json(
        { success: false, error: 'Account Banned: Access to direct messaging is revoked.' },
        { status: 403 }
      );
    }

    const { data: newMsg, error } = await (supabaseAdmin.from('direct_messages') as any)
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        message: message.trim(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: newMsg });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}

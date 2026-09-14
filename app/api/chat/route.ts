import { NextRequest, NextResponse } from 'next/server';
import { getGlobalChatMessages, sendChatMessage, deleteChatMessage } from '@/lib/services/chatService';

export async function GET() {
  const messages = await getGlobalChatMessages();
  return NextResponse.json({ messages });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, message } = body;

    if (!userId || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const chatMsg = await sendChatMessage(userId, message);
    return NextResponse.json({ success: true, message: chatMsg });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to send chat message' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing message ID' }, { status: 400 });
    }

    const ok = await deleteChatMessage(id);
    if (!ok) throw new Error('Failed to delete chat message');

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to delete message' }, { status: 500 });
  }
}

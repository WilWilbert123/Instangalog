import { NextRequest, NextResponse } from 'next/server';
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from '@/lib/services/notificationService';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json(
      { success: false, error: 'Missing userId parameter' },
      { status: 400 }
    );
  }

  const notifications = await getUserNotifications(userId);
  return NextResponse.json({ success: true, notifications });
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { notificationId, userId, markAll } = body;

    if (markAll && userId) {
      await markAllNotificationsAsRead(userId);
      return NextResponse.json({ success: true, message: 'All notifications marked as read' });
    }

    if (notificationId) {
      await markNotificationAsRead(notificationId);
      return NextResponse.json({ success: true, message: 'Notification marked as read' });
    }

    return NextResponse.json(
      { success: false, error: 'Missing notificationId or userId parameter' },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update notification' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const notificationId = searchParams.get('notificationId');

  if (!notificationId) {
    return NextResponse.json(
      { success: false, error: 'Missing notificationId parameter' },
      { status: 400 }
    );
  }

  await deleteNotification(notificationId);
  return NextResponse.json({ success: true, message: 'Notification deleted' });
}

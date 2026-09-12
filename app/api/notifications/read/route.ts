import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { notificationId } = await request.json();
    if (!notificationId) {
      return NextResponse.json({ error: 'Notification reference omitted' }, { status: 400 });
    }

    await prisma.notificationRead.upsert({
      where: {
        notificationId_userId: { notificationId, userId: session.user.id }
      },
      update: {
        readAt: new Date(),
      },
      create: { notificationId, userId: session.user.id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[POST /api/notifications/read Error]:', error);
    return NextResponse.json({ error: 'Failed marking notification as read' }, { status: 500 });
  }
}
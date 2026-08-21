import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

// --- POST: Mark All Notifications as Read for Current User ---
export async function POST() {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || !session.user) {
      return NextResponse.json({ error: 'Unauthorized payload context' }, { status: 401 });
    }

    const { user } = session;
    console.log('Mark all as read for user:', user.id, 'role:', user.role, 'schoolId:', user.schoolId);

    let whereClause: any = {};

    // 1. Assign visibility constraints context matching structural roles
    if (user.role === 'SUPER_ADMIN') {
      whereClause.OR = [
        { scope: 'ALL_ADMINS' },
        { type: 'SYSTEM' }
      ];
    } else if (user.role === 'ADMIN') {
      whereClause.OR = [
        { schoolId: user.schoolId },
        { schoolId: null }
      ];
    } else if (user.role === 'TEACHER') {
      whereClause.scope = 'SCHOOL_TEACHERS';
      whereClause.schoolId = user.schoolId;
    }

    console.log('Where clause for notifications:', JSON.stringify(whereClause));

    // 2. Get all unread notifications for this user
    const unreadNotifications = await prisma.notification.findMany({
      where: {
        ...whereClause,
        reads: {
          none: { userId: user.id }
        }
      },
      select: { id: true }
    });

    console.log('Found unread notifications:', unreadNotifications.length);

    // 3. Create read entries for all unread notifications
    if (unreadNotifications.length > 0) {
      const result = await prisma.notificationRead.createMany({
        data: unreadNotifications.map(notif => ({
          notificationId: notif.id,
          userId: user.id
        })),
        skipDuplicates: true
      });
      console.log('Created read entries:', result.count);
    }

    return NextResponse.json({ success: true, markedAsRead: unreadNotifications.length });
  } catch (error) {
    console.error('[POST /api/notifications/read-all Exception]:', error);
    return NextResponse.json({ error: 'Failed marking all notifications as read' }, { status: 500 });
  }
}

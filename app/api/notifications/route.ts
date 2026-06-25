import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

// --- GET: Dynamic User Scoped Notification Retrieval Feed ---
export async function GET() {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || !session.user) {
      return NextResponse.json({ error: 'Unauthorized payload context' }, { status: 401 });
    }

    const { user } = session;
    let whereClause: any = {};

    // 1. Assign visibility constraints context matching structural roles
    if (user.role === 'SUPER_ADMIN') {
      // Super-Admins read notifications generated directly by fellow Super-Admins
      // They also see trial request notifications and plan activation notifications
      whereClause.OR = [
        { scope: 'ALL_ADMINS' },
        { type: 'SYSTEM' } // Trial requests and plan activations use SYSTEM type
      ];
    } else if (user.role === 'ADMIN') {
      // Admins only see notifications for their own school or global notifications (schoolId: null)
      whereClause.OR = [
        { schoolId: user.schoolId },
        { schoolId: null }
      ];
    } else if (user.role === 'TEACHER') {
      // Teachers retrieve alerts targeted for their specific school ID assignment
      // Workaround: Only show notifications where they DON'T have a read entry
      // This means either it's a general broadcast (no one has read it yet)
      // OR it's targeted specifically to them (others have read entries, they don't)
      whereClause.scope = 'SCHOOL_TEACHERS';
      whereClause.schoolId = user.schoolId;
      whereClause.reads = { none: { userId: user.id } };
    }

    // 2. Query target parameters from storage array matrix
    const notifications = await prisma.notification.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 25,
      include: {
        reads: {
          where: { userId: user.id }
        }
      }
    });

    // 3. Format payload payload payload fields flatly
    const mappedNotifications = notifications.map(notif => ({
      id: notif.id,
      title: notif.title,
      message: notif.message,
      type: notif.type,
      createdAt: notif.createdAt,
      isRead: notif.reads.length > 0,
    }));

    return NextResponse.json({ data: mappedNotifications });
  } catch (error) {
    console.error('[GET /api/notifications Exception]:', error);
    return NextResponse.json({ error: 'Failed downloading live communications ledger' }, { status: 500 });
  }
}

// --- POST: Disseminate Cascade Message Triggers Safely ---
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || !session.user) {
      return NextResponse.json({ error: 'Unauthorized configuration operation context' }, { status: 401 });
    }

    const { user } = session;
    const body = await request.json();
    const { title, message, type } = body; // type options: 'INFO' | 'ALERT' | 'SYSTEM'

    if (!title?.trim() || !message?.trim()) {
      return NextResponse.json({ error: 'Title and message parameters are strictly required' }, { status: 400 });
    }

    let assignedScope: 'ALL_ADMINS' | 'SCHOOL_TEACHERS';
    let targetSchoolId: string | null = null;

    // Validate cascade transmission routes matches role tier boundaries
    if (user.role === 'SUPER_ADMIN') {
      assignedScope = 'ALL_ADMINS';
    } else if (user.role === 'ADMIN') {
      if (!user.schoolId) {
        return NextResponse.json({ error: 'Admin workspace is unassigned. Call abandoned.' }, { status: 400 });
      }
      assignedScope = 'SCHOOL_TEACHERS';
      targetSchoolId = user.schoolId;
    } else {
      return NextResponse.json({ error: 'Teachers do not possess downstream message transmission permissions' }, { status: 403 });
    }

    // Commit notification entry
    const newNotification = await prisma.notification.create({
      data: {
        title: title.trim(),
        message: message.trim(),
        type: type || 'INFO',
        scope: assignedScope,
        schoolId: targetSchoolId,
        senderId: user.id
      }
    });

    return NextResponse.json({ success: true, data: newNotification });
  } catch (error) {
    console.error('[POST /api/notifications Exception]:', error);
    return NextResponse.json({ error: 'Failed logging target downstream alerts' }, { status: 500 });
  }
}

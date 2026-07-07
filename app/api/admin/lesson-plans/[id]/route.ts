import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolAdmin, handleApiError } from '@/lib/auth-server';

/**
 * GET /api/admin/lesson-plans/[id]
 * Fetch a specific lesson plan with all details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { schoolId } = await requireSchoolAdmin();

    const lessonPlan = await prisma.lessonPlan.findUnique({
      where: { id },
      include: {
        teacher: true,
        class: true,
        subject: true,
        period: true,
        slot: true,
        attachments: true,
        comments: {
          include: { user: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!lessonPlan) {
      return NextResponse.json({ error: 'Lesson plan not found' }, { status: 404 });
    }

    // Verify the lesson plan belongs to the admin's school
    if (lessonPlan.schoolId !== schoolId) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      );
    }

    return NextResponse.json(lessonPlan);
  } catch (error) {
    console.error('Error fetching lesson plan:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/lesson-plans/[id]/comments
 * Add a comment to a lesson plan
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { id: authUserId, email, schoolId } = await requireSchoolAdmin();

    const lessonPlan = await prisma.lessonPlan.findUnique({
      where: { id },
    });

    if (!lessonPlan) {
      return NextResponse.json({ error: 'Lesson plan not found' }, { status: 404 });
    }

    if (lessonPlan.schoolId !== schoolId) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { content } = body;

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: 'Comment content is required' },
        { status: 400 }
      );
    }

    const resolvedUserId = authUserId || (email
      ? (await prisma.user.findUnique({
          where: { email: email.trim().toLowerCase() },
        }))?.id
      : null);

    if (!resolvedUserId) {
      return NextResponse.json({ error: 'Authenticated user not found' }, { status: 401 });
    }

    const comment = await prisma.lessonPlanComment.create({
      data: {
        lessonPlanId: id,
        userId: resolvedUserId,
        content,
      },
      include: { user: true },
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

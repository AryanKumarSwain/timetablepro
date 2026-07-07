import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession, requireFeatureAccess, handleApiError } from '@/lib/auth-server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sessionUser = await requireSession();
    await requireFeatureAccess('lesson-planning');
    const teacher = await prisma.teacher.findFirst({ where: { userId: sessionUser.id } });

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    const lessonPlan = await prisma.lessonPlan.findUnique({
      where: { id },
      include: {
        class: true,
        subject: true,
        period: true,
        slot: true,
        attachments: true,
        comments: {
          include: { user: true },
        },
      },
    });

    if (!lessonPlan) {
      return NextResponse.json({ error: 'Lesson plan not found' }, { status: 404 });
    }

    if (lessonPlan.teacherId !== teacher.id) {
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
 * PATCH /api/teacher/lesson-plans/[id]
 * Update a lesson plan
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sessionUser = await requireSession();
    await requireFeatureAccess('lesson-planning');
    const teacher = await prisma.teacher.findFirst({ where: { userId: sessionUser.id } });

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    const lessonPlan = await prisma.lessonPlan.findUnique({
      where: { id },
    });

    if (!lessonPlan) {
      return NextResponse.json({ error: 'Lesson plan not found' }, { status: 404 });
    }

    if (lessonPlan.teacherId !== teacher.id) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      );
    }

    const body = await request.json();

    const updated = await prisma.lessonPlan.update({
      where: { id },
      data: {
        lessonTitle: body.lessonTitle,
        topic: body.topic,
        chapter: body.chapter,
        subtopic: body.subtopic,
        learningObjectives: body.learningObjectives,
        teachingMethod: body.teachingMethod,
        teachingAids: body.teachingAids,
        activities: body.activities,
        homework: body.homework,
        assessmentMethod: body.assessmentMethod,
        learningOutcomes: body.learningOutcomes,
        notes: body.notes,
        estimatedDuration: body.estimatedDuration,
        status: body.status,
      },
      include: {
        class: true,
        subject: true,
        period: true,
        slot: true,
        attachments: true,
        comments: {
          include: { user: true },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/teacher/lesson-plans/[id]
 * Delete a lesson plan
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sessionUser = await requireSession();
    await requireFeatureAccess('lesson-planning');
    const teacher = await prisma.teacher.findFirst({ where: { userId: sessionUser.id } });

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    const lessonPlan = await prisma.lessonPlan.findUnique({
      where: { id },
    });

    if (!lessonPlan) {
      return NextResponse.json({ error: 'Lesson plan not found' }, { status: 404 });
    }

    if (lessonPlan.teacherId !== teacher.id) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      );
    }

    await prisma.lessonPlan.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Lesson plan deleted' });
  } catch (error) {
    return handleApiError(error);
  }
}

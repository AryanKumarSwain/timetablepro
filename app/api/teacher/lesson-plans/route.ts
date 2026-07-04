import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession, handleApiError } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  try {
    const sessionUser = await requireSession();
    const teacher = await prisma.teacher.findFirst({ where: { userId: sessionUser.id } });

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    const searchParams = request.nextUrl.searchParams;
    const classId = searchParams.get('classId');
    const subjectId = searchParams.get('subjectId');
    const status = searchParams.get('status');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const search = searchParams.get('search');

    const where: any = { teacherId: teacher.id };
    if (classId) where.classId = classId;
    if (subjectId) where.subjectId = subjectId;
    if (status) where.status = status;
    if (dateFrom || dateTo) {
      where.planDate = {};
      if (dateFrom) where.planDate.gte = dateFrom;
      if (dateTo) where.planDate.lte = dateTo;
    }
    if (search) {
      where.OR = [
        { lessonTitle: { contains: search } },
        { topic: { contains: search } },
        { chapter: { contains: search } },
      ];
    }

    const lessonPlans = await prisma.lessonPlan.findMany({
      where,
      include: {
        class: true,
        subject: true,
        period: true,
        slot: true,
        attachments: true,
        comments: { include: { user: true } },
      },
      orderBy: { planDate: 'desc' },
      take: 50,
    });

    return NextResponse.json(lessonPlans);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await requireSession();
    const teacher = await prisma.teacher.findFirst({ where: { userId: sessionUser.id } });

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      slotId,
      planDate,
      lessonTitle,
      topic,
      chapter,
      subtopic,
      learningObjectives,
      teachingMethod,
      teachingAids,
      activities,
      homework,
      assessmentMethod,
      learningOutcomes,
      notes,
      estimatedDuration,
      status = 'DRAFT',
    } = body;

    if (!slotId || !planDate || !lessonTitle) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const slot = await prisma.timetableSlot.findUnique({ where: { id: slotId } });

    if (!slot || slot.teacherId !== teacher.id) {
      return NextResponse.json({ error: 'Unauthorized access to this slot' }, { status: 403 });
    }

    const existing = await prisma.lessonPlan.findUnique({
      where: { slotId_planDate: { slotId, planDate } },
    });

    if (existing) {
      return NextResponse.json({ error: 'Lesson plan already exists for this date' }, { status: 409 });
    }

    const lessonPlan = await prisma.lessonPlan.create({
      data: {
        schoolId: teacher.schoolId!,
        teacherId: teacher.id,
        slotId,
        classId: slot.classId,
        subjectId: slot.subjectId,
        periodId: slot.periodId,
        planDate,
        lessonTitle,
        topic,
        chapter,
        subtopic,
        learningObjectives,
        teachingMethod,
        teachingAids,
        activities,
        homework,
        assessmentMethod,
        learningOutcomes,
        notes,
        estimatedDuration,
        status,
      },
      include: {
        class: true,
        subject: true,
        period: true,
        slot: true,
      },
    });

    return NextResponse.json(lessonPlan, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

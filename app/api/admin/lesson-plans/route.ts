import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolAdmin, handleApiError } from '@/lib/auth-server';

/**
 * GET /api/admin/lesson-plans
 * Fetch all lesson plans for the school with filtering and search
 * Query params: teacherId, classId, subjectId, status, dateFrom, dateTo, search
 */
export async function GET(request: NextRequest) {
  try {
    const { schoolId } = await requireSchoolAdmin();

    const searchParams = request.nextUrl.searchParams;
    const teacherId = searchParams.get('teacherId');
    const classId = searchParams.get('classId');
    const subjectId = searchParams.get('subjectId');
    const status = searchParams.get('status');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const search = searchParams.get('search');

    const where: any = {
      schoolId,
    };

    if (teacherId) where.teacherId = teacherId;
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
        { teacher: { name: { contains: search } } },
      ];
    }

    const lessonPlans = await prisma.lessonPlan.findMany({
      where,
      include: {
        teacher: true,
        class: true,
        subject: true,
        period: true,
        slot: true,
        attachments: true,
        comments: {
          include: { user: true },
        },
      },
      orderBy: [{ planDate: 'desc' }, { slot: { periodId: 'asc' } }],
      take: 100,
    });

    return NextResponse.json(lessonPlans);
  } catch (error) {
    return handleApiError(error);
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolAdmin, handleApiError } from '@/lib/auth-server';

/**
 * GET /api/admin/lesson-plans/export
 * Export lesson plans as CSV
 * Query params: teacherId, classId, subjectId, dateFrom, dateTo, format (csv/xlsx)
 */
export async function GET(request: NextRequest) {
  try {
    const { schoolId } = await requireSchoolAdmin();

    const searchParams = request.nextUrl.searchParams;
    const teacherId = searchParams.get('teacherId');
    const classId = searchParams.get('classId');
    const subjectId = searchParams.get('subjectId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const format = searchParams.get('format') || 'csv';

    const where: any = {
      schoolId,
    };

    if (teacherId) where.teacherId = teacherId;
    if (classId) where.classId = classId;
    if (subjectId) where.subjectId = subjectId;
    if (dateFrom || dateTo) {
      where.planDate = {};
      if (dateFrom) where.planDate.gte = dateFrom;
      if (dateTo) where.planDate.lte = dateTo;
    }

    const lessonPlans = await prisma.lessonPlan.findMany({
      where,
      include: {
        teacher: true,
        class: true,
        subject: true,
        period: true,
      },
      orderBy: { planDate: 'desc' },
    });

    if (format === 'csv') {
      // Generate CSV content
      const csvHeaders = [
        'Date',
        'Teacher',
        'Class',
        'Subject',
        'Period',
        'Lesson Title',
        'Topic',
        'Chapter',
        'Status',
      ].join(',');

      const csvRows = lessonPlans.map((plan) =>
        [
          plan.planDate,
          plan.teacher.name,
          plan.class.name,
          plan.subject.name,
          `${plan.period.startTime} - ${plan.period.endTime}`,
          `"${plan.lessonTitle}"`,
          `"${plan.topic || ''}"`,
          `"${plan.chapter || ''}"`,
          plan.status,
        ].join(',')
      );

      const csvContent = [csvHeaders, ...csvRows].join('\n');

      return new Response(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="lesson-plans.csv"',
        },
      });
    }

    // Return JSON for other formats or default
    return NextResponse.json(lessonPlans);
  } catch (error) {
    return handleApiError(error);
  }
}

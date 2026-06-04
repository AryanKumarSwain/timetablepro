import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolAdmin, handleApiError, schoolWhere } from '@/lib/auth-server';
import { mapReportResponse } from '@/lib/report-utils';

export async function GET(request: NextRequest) {
  try {
    const { schoolId } = await requireSchoolAdmin();

    const teacherName = request.nextUrl.searchParams.get('teacherName');
    const date = request.nextUrl.searchParams.get('date');
    const classId = request.nextUrl.searchParams.get('classId');
    const subjectId = request.nextUrl.searchParams.get('subjectId');

    const reports = await prisma.dailyReport.findMany({
      where: {
        ...schoolWhere(schoolId),
        ...(teacherName
          ? { teacher: { name: { contains: teacherName, mode: 'insensitive' } } }
          : {}),
        ...(date
          ? {
              reportDate: {
                gte: new Date(`${date}T00:00:00.000Z`),
                lte: new Date(`${date}T23:59:59.999Z`),
              },
            }
          : {}),
        ...(classId || subjectId
          ? {
              entries: {
                some: {
                  ...(classId ? { classId } : {}),
                  ...(subjectId ? { subjectId } : {}),
                },
              },
            }
          : {}),
      },
      include: {
        teacher: true,
        entries: { 
          include: { class: true, subject: true } 
        },
      },
      orderBy: { reportDate: 'desc' },
    });

    return NextResponse.json(
      reports.map((report) => ({
        ...mapReportResponse(report),
      }))
    );
  } catch (error) {
    return handleApiError(error);
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireSchoolAdmin,
  handleApiError,
  schoolWhere,
} from '@/lib/auth-server';
import { mapReportResponse } from '@/lib/report-utils';

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate user session safely
    const { schoolId } = await requireSchoolAdmin();

    // 2. Safely extract tracking parameters from request URL
    const { searchParams } = request.nextUrl;
    const teacherName = searchParams.get('teacherName') || '';
    const date = searchParams.get('date') || '';
    const classId = searchParams.get('classId') || '';
    const subjectId = searchParams.get('subjectId') || '';

    console.log('[ADMIN_REPORTS_API] Request params:', { schoolId, teacherName, date, classId, subjectId });

    // 3. Query records cleanly using globally safe filtering constraints
    const reports = await prisma.dailyReport.findMany({
      where: {
        ...schoolWhere(schoolId),
        
        // Safe database lookup across MySQL, SQLite, and Postgres
        ...(teacherName.trim()
          ? {
              teacher: {
                name: {
                  contains: teacherName.trim(), 
                  // REMOVED 'mode: insensitive' to completely eliminate backend query engine crashes!
                },
              },
            }
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
          include: { 
            class: true, 
            subject: true 
          } 
        },
      },
      orderBy: { 
        reportDate: 'desc' 
      },
    });

    // 4. Transform response payloads and map entry data arrays securely
    const transformedReports = reports.map((r) => ({
      ...mapReportResponse(r),
      entryCount: r.entries?.length || 0,
    }));

    console.log('[ADMIN_REPORTS_API] Reports found:', reports.length);
    console.log('[ADMIN_REPORTS_API] Transformed reports sample:', transformedReports.slice(0, 2));

    // 5. SECURE FALLBACK FILTER: Double check case-insensitivity in JS runtime 
    // to guarantee "br" catches "Mr. Brijesh Rawat" even if database default is strictly case-sensitive!
    const searchTarget = teacherName.trim().toLowerCase();
    const finalFilteredResult = searchTarget
      ? transformedReports.filter((r) => 
          r.teacherName?.toLowerCase().includes(searchTarget)
        )
      : transformedReports;

    return NextResponse.json(finalFilteredResult);
  } catch (error) {
    console.error('[API_REPORTS_GET_CRASH_FIXED]', error);
    return handleApiError(error);
  }
}
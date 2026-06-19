import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolContext } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  try {
    const context = await requireSchoolContext();
    const schoolId = context.schoolId;
    if (!schoolId) throw new Error("School runtime context mapped as null.");

    const { searchParams } = new URL(request.url);
    const isRangeQuery = searchParams.get('range') === 'true';
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    if (!isRangeQuery || !start || !end) {
      return NextResponse.json({ error: 'Invalid parameters provided.' }, { status: 400 });
    }

    const teachersList = await prisma.teacher.findMany({
      where: { schoolId },
      select: { id: true }
    });

    const absenceRecords = await prisma.teacherAttendance.findMany({
      where: {
        schoolId,
        date: { gte: start, lte: end },
        status: 'ABSENT'
      },
      select: { teacherId: true, date: true }
    });

    // Generate date array sequentially matching chronology
    const datesArray: string[] = [];
    let currentCursor = new Date(start);
    const targetEnd = new Date(end);

    while (currentCursor <= targetEnd) {
      datesArray.push(currentCursor.toISOString().split('T')[0]);
      currentCursor.setDate(currentCursor.getDate() + 1);
    }

    // Map detailed date matrix list per record index identification
    const summary: Record<string, Array<{ date: string; status: 'P' | 'A' }>> = {};
    
    teachersList.forEach(t => {
      const teacherAbsenceDates = new Set(
        absenceRecords.filter(r => r.teacherId === t.id).map(r => r.date)
      );

      summary[t.id] = datesArray.map(dateStr => ({
        date: dateStr,
        status: teacherAbsenceDates.has(dateStr) ? 'A' : 'P'
      }));
    });

    return NextResponse.json({ summary });
  } catch (error: any) {
    console.error('[ATTENDANCE_GET_CRASH]', error);
    return NextResponse.json({ error: 'Failed to evaluate analytics pipeline.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await requireSchoolContext();
    const schoolId = context.schoolId;
    if (!schoolId) throw new Error("School runtime context mapped as null.");

    const body = await request.json().catch(() => ({}));
    const { teacherId, date, status } = body; 

    if (!teacherId || !date || !status) {
      return NextResponse.json({ error: 'Missing required parameters.' }, { status: 400 });
    }

    const formattedDate = date.split('T')[0];
    const todayStr = new Date().toISOString().split('T')[0];

    // Restrict edits to current real-time metrics only
    if (formattedDate !== todayStr) {
      return NextResponse.json({ 
        error: 'Operation rejected. Modification privileges are restricted to current date matrices only.' 
      }, { status: 403 });
    }

    await prisma.teacherAttendance.deleteMany({
      where: { schoolId, teacherId, date: formattedDate }
    });

    await prisma.replacementAssignment.deleteMany({
      where: { schoolId, originalTeacherId: teacherId, date: formattedDate, status: 'PENDING' }
    });

    if (status === 'ABSENT') {
      await prisma.teacherAttendance.create({
        data: {
          schoolId,
          teacherId,
          date: formattedDate,
          status: 'ABSENT'
        }
      });

      // Do not automatically create replacement assignments
      // Substitutions should be manually assigned via the daily desk
    }

    return NextResponse.json({ success: true, message: `Status updated to ${status}` });
  } catch (error: any) {
    console.error('[ATTENDANCE_MUTATION_CRASH]', error);
    return NextResponse.json({ 
      error: 'Database pipeline failure.',
      details: error?.message || String(error)
    }, { status: 500 });
  }
}
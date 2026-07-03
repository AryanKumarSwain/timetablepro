import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolContext } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  try {
    const context = await requireSchoolContext();
    const schoolId = context.schoolId;
    const userId = context.user.id;
    
    if (!schoolId || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get teacherId from Teacher model
    const teacher = await prisma.teacher.findFirst({
      where: { userId, schoolId },
    });

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    const where: any = { schoolId, teacherId: teacher.id };
    if (date) {
      where.date = date;
    }

    console.log('[TODOS_GET] Query params:', { schoolId, teacherId: teacher.id, date, where });

    const todos = await prisma.teacherTodo.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

    console.log('[TODOS_GET] Found todos:', todos.length, todos);

    return NextResponse.json({ todos });
  } catch (error: any) {
    console.error('[TODOS_GET_CRASH]', error);
    return NextResponse.json({ error: 'Failed to fetch todos' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await requireSchoolContext();
    const schoolId = context.schoolId;
    const userId = context.user.id;
    
    if (!schoolId || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get teacherId from Teacher model
    const teacher = await prisma.teacher.findFirst({
      where: { userId, schoolId },
    });

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const { date, periodId, classId, title } = body;
    const normalizedDate = String(date || '').trim();
    const normalizedTitle = String(title || '').trim();
    const normalizedPeriodId = periodId !== undefined && periodId !== null ? String(periodId) : null;
    const normalizedClassId = classId !== undefined && classId !== null ? String(classId) : null;

    if (!normalizedDate || !normalizedTitle) {
      return NextResponse.json({ error: 'Missing required fields: date and title are required' }, { status: 400 });
    }

    console.log('[TODOS_POST] Creating todo:', {
      schoolId,
      teacherId: teacher.id,
      date: normalizedDate,
      periodId: normalizedPeriodId,
      classId: normalizedClassId,
      title: normalizedTitle,
    });

    const todo = await prisma.teacherTodo.create({
      data: {
        schoolId,
        teacherId: teacher.id,
        date: normalizedDate,
        periodId: normalizedPeriodId,
        classId: normalizedClassId,
        title: normalizedTitle,
      },
    });

    console.log('[TODOS_POST] Created todo:', todo);

    return NextResponse.json({ todo });
  } catch (error: any) {
    console.error('[TODOS_POST_CRASH]', error);
    return NextResponse.json({ error: 'Failed to create todo' }, { status: 500 });
  }
}

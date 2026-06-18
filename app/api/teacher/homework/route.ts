import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  try {
    const user = await requireRole('TEACHER');

    const teacher = await prisma.teacher.findUnique({
      where: { userId: user.id },
    });

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    const homework = await prisma.homework.findMany({
      where: { teacherId: teacher.id },
      include: {
        class: true,
        teacher: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(homework);
  } catch (error) {
    console.error('Error fetching homework:', error);
    return NextResponse.json({ error: 'Failed to fetch homework' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole('TEACHER');

    const teacher = await prisma.teacher.findUnique({
      where: { userId: user.id },
    });

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    const body = await request.json();
    const { title, description, classId } = body;

    if (!title || !description || !classId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const homework = await prisma.homework.create({
      data: {
        schoolId: teacher.schoolId,
        teacherId: teacher.id,
        classId,
        title,
        description,
        status: 'DRAFT',
      },
      include: {
        class: true,
        teacher: true,
      },
    });

    return NextResponse.json(homework);
  } catch (error) {
    console.error('Error creating homework:', error);
    return NextResponse.json({ error: 'Failed to create homework' }, { status: 500 });
  }
}

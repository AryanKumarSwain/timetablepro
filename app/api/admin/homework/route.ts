import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolContext } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  try {
    const { schoolId } = await requireSchoolContext();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where: any = { schoolId };
    if (status === 'SENT_TO_ADMIN') {
      where.status = 'SENT_TO_ADMIN';
    }

    const homework = await prisma.homework.findMany({
      where,
      include: {
        class: true,
        teacher: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group by class
    const groupedByClass = homework.reduce((acc: any, hw: any) => {
      const classKey = hw.class.name;
      if (!acc[classKey]) {
        acc[classKey] = [];
      }
      acc[classKey].push(hw);
      return acc;
    }, {});

    return NextResponse.json(groupedByClass);
  } catch (error) {
    console.error('Error fetching homework:', error);
    return NextResponse.json({ error: 'Failed to fetch homework' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { schoolId } = await requireSchoolContext();

    const body = await request.json();
    const { title, description, classId, teacherId } = body;

    if (!title || !description || !classId || !teacherId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const homework = await prisma.homework.create({
      data: {
        schoolId,
        teacherId,
        classId,
        title,
        description,
        status: 'SENT_TO_ADMIN',
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

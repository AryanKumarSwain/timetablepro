import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolContext } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  try {
    const { schoolId } = await requireSchoolContext();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const range = searchParams.get('range');
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');

    const where: any = { schoolId };
    if (status === 'SENT_TO_ADMIN') {
      where.status = 'SENT_TO_ADMIN';
    }

    // Add date range filter
    if (range === 'true' && startDate && endDate) {
      const start = new Date(startDate);
      start.setUTCHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setUTCHours(23, 59, 59, 999);
      where.createdAt = {
        gte: start,
        lte: end,
      };
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

    // If range query, return summary grouped by date
    if (range === 'true') {
      const summary: Record<string, any[]> = {};
      homework.forEach((hw: any) => {
        const dateKey = hw.createdAt.toISOString().split('T')[0];
        if (!summary[dateKey]) {
          summary[dateKey] = [];
        }
        summary[dateKey].push({
          id: hw.id,
          title: hw.title,
          description: hw.description,
          teacher: { name: hw.teacher.name, email: hw.teacher.email },
          class: { name: hw.class.name, id: hw.class.id },
          subject: hw.subject,
          createdAt: hw.createdAt,
        });
      });
      return NextResponse.json({ summary, groupedByClass });
    }

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

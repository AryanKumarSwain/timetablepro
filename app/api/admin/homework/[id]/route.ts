import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolContext } from '@/lib/auth-server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { schoolId } = await requireSchoolContext();
    const { id } = await params;
    const body = await request.json();
    const { title, description, classId, teacherId, status } = body;

    // Verify the homework belongs to this school
    const existingHomework = await prisma.homework.findUnique({
      where: { id },
    });

    if (!existingHomework) {
      return NextResponse.json({ error: 'Homework not found' }, { status: 404 });
    }

    if (existingHomework.schoolId !== schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const homework = await prisma.homework.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(classId !== undefined && { classId }),
        ...(teacherId !== undefined && { teacherId }),
        ...(status !== undefined && { status }),
      },
      include: {
        class: true,
        teacher: true,
      },
    });

    return NextResponse.json(homework);
  } catch (error) {
    console.error('Error updating homework:', error);
    return NextResponse.json({ error: 'Failed to update homework' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { schoolId } = await requireSchoolContext();
    const { id } = await params;

    // Verify the homework belongs to this school
    const existingHomework = await prisma.homework.findUnique({
      where: { id },
    });

    if (!existingHomework) {
      return NextResponse.json({ error: 'Homework not found' }, { status: 404 });
    }

    if (existingHomework.schoolId !== schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await prisma.homework.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting homework:', error);
    return NextResponse.json({ error: 'Failed to delete homework' }, { status: 500 });
  }
}

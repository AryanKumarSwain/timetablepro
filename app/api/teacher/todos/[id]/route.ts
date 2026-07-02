import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolContext } from '@/lib/auth-server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
    const { completed, title } = body;

    const todo = await prisma.teacherTodo.findFirst({
      where: { id, schoolId, teacherId: teacher.id },
    });

    if (!todo) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
    }

    const updatedTodo = await prisma.teacherTodo.update({
      where: { id },
      data: {
        ...(completed !== undefined && { completed }),
        ...(title !== undefined && { title }),
      },
    });

    return NextResponse.json({ todo: updatedTodo });
  } catch (error: any) {
    console.error('[TODO_PATCH_CRASH]', error);
    return NextResponse.json({ error: 'Failed to update todo' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const todo = await prisma.teacherTodo.findFirst({
      where: { id, schoolId, teacherId: teacher.id },
    });

    if (!todo) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
    }

    await prisma.teacherTodo.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[TODO_DELETE_CRASH]', error);
    return NextResponse.json({ error: 'Failed to delete todo' }, { status: 500 });
  }
}

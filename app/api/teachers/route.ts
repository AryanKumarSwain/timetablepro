import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireSchoolContext,
  handleApiError,
} from '@/lib/auth-server';

// ============================================================================
// GET ALL TEACHERS
// ============================================================================

export async function GET() {
  try {
    const { schoolId } = await requireSchoolContext();

    const teachers = await prisma.teacher.findMany({
      where: {
        schoolId,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json(teachers);
  } catch (error) {
    console.error('GET TEACHERS ERROR:', error);
    return handleApiError(error);
  }
}

// ============================================================================
// CREATE TEACHER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const { schoolId } = await requireSchoolContext();

    const body = await request.json();

    const teacher = await prisma.teacher.create({
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone,
        qualifications: body.qualifications || [],
        subjects: body.subjects || [],
        active: body.active ?? true,
        joinDate: new Date(body.joinDate),
        schoolId,
      },
    });

    return NextResponse.json(teacher);
  } catch (error) {
    console.error('CREATE TEACHER ERROR:', error);
    return handleApiError(error);
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolContext, handleApiError, schoolWhere } from '@/lib/auth-server';
import { mapTeacher } from '@/lib/mappers';

type Params = { params: Promise<{ id: string }> };

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === 'string');
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { schoolId } = await requireSchoolContext();
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.teacher.findFirst({
      where: { id, ...schoolWhere(schoolId) },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const nextSubjects = normalizeStringArray(body.subjects);
    const nextQualifications = normalizeStringArray(body.qualifications);
    const nextSubjectSpecialtyId =
      typeof body.subjectSpecialtyId === 'string' && body.subjectSpecialtyId
        ? body.subjectSpecialtyId
        : nextSubjects[0] ?? existing.subjectSpecialtyId;

    const row = await prisma.teacher.update({
      where: { id },
      data: {
        name: typeof body.name === 'string' ? body.name.trim() : existing.name,
        email:
          typeof body.email === 'string'
            ? body.email.trim().toLowerCase()
            : existing.email,
        phone:
          typeof body.phone === 'string' ? body.phone.trim() : existing.phone,
        qualifications:
          nextQualifications.length > 0
            ? nextQualifications
            : existing.qualifications,
        subjects: nextSubjects.length > 0 ? nextSubjects : existing.subjects,
        active: typeof body.active === 'boolean' ? body.active : existing.active,
        joinDate:
          typeof body.joinDate === 'string' && body.joinDate
            ? body.joinDate
            : existing.joinDate,
        maxPeriodsPerWeek:
          typeof body.maxPeriodsPerWeek === 'number'
            ? body.maxPeriodsPerWeek
            : existing.maxPeriodsPerWeek,
        subjectSpecialtyId: nextSubjectSpecialtyId,
      },
    });

    return NextResponse.json(mapTeacher(row));
  } catch (error) {
    console.error('[PATCH /api/teachers/[id]]', error);
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { schoolId } = await requireSchoolContext();
    const { id } = await params;

    const existing = await prisma.teacher.findFirst({
      where: { id, ...schoolWhere(schoolId) },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Delete all related records first to avoid FK constraint errors

    await prisma.dailyReport.deleteMany({
      where: { teacherId: id },
    });

    await prisma.timetableSlot.deleteMany({
      where: { schoolId, teacherId: id },
    });

    await prisma.weeklyTimetableSlot.deleteMany({
      where: { schoolId, teacherId: id },
    });

    await prisma.teacherAttendance.deleteMany({
      where: { schoolId, teacherId: id },
    });

    await prisma.replacementAssignment.deleteMany({
      where: {
        schoolId,
        OR: [{ originalTeacherId: id }, { replacementTeacherId: id }],
      },
    });


    // Delete teacher first, then linked User
    const linkedUserId = existing.userId ?? null;

    await prisma.teacher.delete({
      where: { id },
    });

    if (linkedUserId) {
      await prisma.user.delete({
        where: { id: linkedUserId },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/teachers/[id]]', error);
    return handleApiError(error);
  }
}
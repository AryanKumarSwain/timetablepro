import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireSchoolContext,
  handleApiError,
  schoolWhere,
} from '@/lib/auth-server';
import { mapTeacher } from '@/lib/mappers';
import { provisionTeacherUserAccount } from '@/lib/teacher-onboarding';
import { checkTeacherLimit, PlanLimitError } from '@/lib/plan-limits';

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

export async function POST(request: NextRequest) {
  try {
    const { schoolId } = await requireSchoolContext();
    const body = await request.json();

    const email = String(body.email ?? '').trim().toLowerCase();

    // 0. PLAN LIMIT CHECK: Enforce teacher limit based on school's plan
    try {
      await checkTeacherLimit(schoolId);
    } catch (limitError) {
      if (limitError instanceof PlanLimitError) {
        return NextResponse.json({ error: limitError.message }, { status: 403 });
      }
      throw limitError;
    }

    // 1. DUPLICATE / CROSS-TENANT CHECK: Prevent identical email profiles across tenants
    const existingAny = await prisma.teacher.findFirst({ where: { email } });
    if (existingAny) {
      if (existingAny.schoolId && existingAny.schoolId !== schoolId) {
        return NextResponse.json(
          { error: 'This teacher already belongs to another school and cannot be created here.' },
          { status: 409 }
        );
      }

      // If it exists within this school, block creation
      if (existingAny.schoolId === schoolId) {
        return NextResponse.json(
          { error: 'A teacher profile with this email address already exists.' },
          { status: 400 }
        );
      }
    }

    const requestSubjects = normalizeStringArray(body.subjects);
    let subjectSpecialtyId =
      typeof body.subjectSpecialtyId === 'string' && body.subjectSpecialtyId
        ? body.subjectSpecialtyId
        : requestSubjects[0];

    // 💡 FIXED: Strictly query a fallback subject that belongs ONLY to this school context
    let fallbackSubject = await prisma.subject.findFirst({
      where: { schoolId },
      orderBy: { name: 'asc' },
    });

    // 💡 FIXED: Re-architected fallback conditional execution logic block 
    // If no specialty ID was passed in, and no subject exists for THIS school, create a safe default.
    if (!subjectSpecialtyId && !fallbackSubject) {
      fallbackSubject = await prisma.subject.create({
        data: {
          name: 'General / Unassigned',
          code: 'GEN-01',
          schoolId,
        },
      });
    }

    // Resolve the ID cleanly
    const resolvedSubjectSpecialtyId = subjectSpecialtyId || fallbackSubject!.id;

    // 2. CREATE RECORD safely since email validation and relations are confirmed
    const teacher = await prisma.teacher.create({
      data: {
        name: String(body.name ?? '').trim(),
        email,
        phone: String(body.phone ?? '').trim(),
        qualifications: normalizeStringArray(body.qualifications),
        subjects:
          requestSubjects.length > 0
            ? requestSubjects
            : [resolvedSubjectSpecialtyId],
        active: typeof body.active === 'boolean' ? body.active : true,
        joinDate: String(body.joinDate ?? new Date().toISOString().split('T')[0]),
        maxPeriodsPerWeek: Number(body.maxPeriodsPerWeek ?? 24),
        subjectSpecialtyId: resolvedSubjectSpecialtyId,
        school: {
          connect: { id: schoolId }
        }
      },
    });

    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    
    try {
      await provisionTeacherUserAccount(teacher, school?.name ?? 'Your School');
    } catch (provisionError: any) {
      // Catch security violation errors and return clean 400 response
      if (provisionError.message && provisionError.message.includes('Security violation')) {
        return NextResponse.json({ error: provisionError.message }, { status: 400 });
      }
      throw provisionError;
    }

    return NextResponse.json(mapTeacher(teacher));
  } catch (error) {
    console.error('[POST /api/admin/teachers/create Execution Failure]:', error);
    return handleApiError(error);
  }
}